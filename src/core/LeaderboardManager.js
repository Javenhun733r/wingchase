// Wraps window.PIX3L.leaderboards. Board keys must already exist and be
// active in the Studio Dashboard (Games -> Leaderboards) - submissions to
// unknown/archived keys are rejected, and so are submissions from guests
// (signed-out players). See src/config.js PIX3L_BOARDS for the keys this
// game uses, same pattern as PIX3L_ACHIEVEMENTS.
//
// Every public method here resolves - it never throws - so callers never
// need try/catch. Failures (SDK missing, offline, timeout, throttled,
// rejected by the platform) all come back as `{ ok: false, error, message }`
// instead of a rejected promise.
//
// Real SDK return shapes (per PIX3L docs), passed through as `data` untouched:
//   submit/submitScore/submitTime -> { improved, rank, score, timeMs, totalEntries }
//     `improved` is true only when this run replaced the player's previous
//     best - always branch UI on it instead of assuming a resolved call means
//     the result was stored.
//   top    -> { key, scope, limit, offset, entries: [{ rank, player, score, timeMs }] }
//   myRank -> { rank, score, timeMs, totalEntries } (rank is null when unranked)
//   list   -> [{ key, name, board_type, primary_metric }]
//
// The SDK itself already de-dupes an identical (key, score, timeMs) submitted
// within 2s and allows only one in-flight submission per board key - the
// cooldown/in-flight guard below is a client-side *pre-check* on top of that
// (fails fast without a round trip), not a replacement for it.
//
// @typedef {Object} LbResult
// @property {boolean} ok
// @property {*} [data] - Present when ok is true; raw payload from the SDK.
// @property {string} [error] - 'sdk_unavailable' | 'offline' | 'cooldown' | 'timeout' | 'sdk_error'
// @property {string} [message] - Human-readable detail, safe to show in the HUD.
// @property {number} [retryInMs] - Only set when error is 'cooldown'.

const DEFAULT_COOLDOWN_MS = 3000;
const DEFAULT_TIMEOUT_MS = 8000;

export class LeaderboardManager {
	/**
	 * @param {Object} [options]
	 * @param {number} [options.cooldownMs] - Minimum gap between submit* calls for the same board.
	 * @param {number} [options.timeoutMs] - How long to wait on the SDK before treating a call as failed.
	 */
	constructor({ cooldownMs = DEFAULT_COOLDOWN_MS, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
		this.cooldownMs = cooldownMs;
		this.timeoutMs = timeoutMs;

		/** @type {Map<string, number>} cooldown key -> performance.now() of last accepted submit */
		this.lastSubmitAt = new Map();
		/** @type {Map<string, Promise<LbResult>>} in-flight de-dupe, any method */
		this.inFlight = new Map();
	}

	// True once window.PIX3L.leaderboards exists (platform SDK is injected at
	// runtime - see Pix3lManager.js waitForSdk - so this can flip true after
	// the game has already booted; call it lazily, don't cache the result).
	isAvailable() {
		return typeof window !== 'undefined' && !!window.PIX3L?.leaderboards;
	}

	/** timeMs -> "MM:SS.mmm", for speedrun/lap boards and any time-based UI. */
	static formatTime(timeMs) {
		if (!Number.isFinite(timeMs) || timeMs < 0) return '00:00.000';
		const total = Math.round(timeMs);
		const minutes = Math.floor(total / 60000);
		const seconds = Math.floor((total % 60000) / 1000);
		const millis = total % 1000;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
	}

	// --- Score-based boards ---------------------------------------------

	async submitScore(boardKey, score, metadata = {}) {
		console.log('[WingChase] Submitting score event:', { key: boardKey, score, metadata });
		return this.#call('submitScore', `submitScore:${boardKey}`, () =>
			window.PIX3L.leaderboards.submitScore(boardKey, score, metadata)
		);
	}

	// --- Time/speedrun boards (timeMs in milliseconds) -------------------

	async submitTime(boardKey, timeMs, metadata = {}) {
		return this.#call('submitTime', `submitTime:${boardKey}`, () =>
			window.PIX3L.leaderboards.submitTime(boardKey, timeMs, metadata)
		);
	}

	// --- Combined boards (accept score and/or timeMs together) -----------

	async submit(boardKey, { score, timeMs, metadata = {} } = {}) {
		return this.#call('submit', `submit:${boardKey}`, () =>
			window.PIX3L.leaderboards.submit(boardKey, { score, timeMs, metadata })
		);
	}

	// --- Reads -------------------------------------------------------------

	// The SDK's real methods are `top`/`myRank`, not `fetchTop`/`fetchMyRank` -
	// those names are kept here only as this wrapper's own public API (already
	// used by LeaderboardHud.js and documented to callers), so only the call
	// into window.PIX3L.leaderboards itself changes.
	async fetchTop(boardKey, { limit = 10, offset = 0, scope = 'all' } = {}) {
		return this.#call('fetchTop', `fetchTop:${boardKey}:${scope}:${offset}:${limit}`, () =>
			window.PIX3L.leaderboards.top(boardKey, { limit, offset, scope })
		);
	}

	async fetchMyRank(boardKey, { scope = 'all' } = {}) {
		return this.#call('fetchMyRank', `fetchMyRank:${boardKey}:${scope}`, () =>
			window.PIX3L.leaderboards.myRank(boardKey, { scope })
		);
	}

	async fetchActiveBoards() {
		return this.#call('fetchActiveBoards', 'fetchActiveBoards', () => window.PIX3L.leaderboards.list());
	}

	// --- Game milestone hooks ---------------------------------------------
	// Wired into Game.js's end()/win() (onGameOver) and levelComplete()
	// (onLevelComplete) using the board keys in config.js's PIX3L_BOARDS.
	// Call once per run/level, at Game Over or Level Complete - not from an
	// update loop or on every score change (the platform docs call this out
	// explicitly; the SDK's own rate limiting assumes this call pattern).

	/** Call once per run, at the moment the game ends (score-based boards). */
	async onGameOver(boardKey, finalScore, metadata = {}) {
		return this.submitScore(boardKey, finalScore, metadata);
	}

	/**
	 * Call once per level/run completion (time-based boards). `startTimeMs`
	 * must come from the same clock you'll diff against - use
	 * `performance.now()` at level start, not `Date.now()`, so system clock
	 * changes/DST can't skew the result.
	 */
	async onLevelComplete(boardKey, startTimeMs, metadata = {}) {
		const elapsed = Math.max(0, Math.round(performance.now() - startTimeMs));
		return this.submitTime(boardKey, elapsed, metadata);
	}

	// --- Internals -----------------------------------------------------

	// Every SDK call funnels through here: availability/offline checks,
	// per-board submit cooldown, in-flight de-dupe (so a HUD button mashed
	// or a per-frame game-loop call can't fire the same request twice while
	// one is still pending), and a timeout so a hung network call can't
	// leave callers waiting forever.
	async #call(methodName, dedupeKey, fn) {
		if (!this.isAvailable()) {
			return { ok: false, error: 'sdk_unavailable', message: 'PIX3L SDK is not loaded (standalone/offline/dev preview).' };
		}
		if (typeof navigator !== 'undefined' && navigator.onLine === false) {
			return { ok: false, error: 'offline', message: 'No network connection.' };
		}

		const isSubmit = methodName.startsWith('submit');
		if (isSubmit) {
			const wait = this.#cooldownRemaining(dedupeKey);
			if (wait > 0) {
				return { ok: false, error: 'cooldown', message: `Try again in ${wait}ms.`, retryInMs: wait };
			}
		}

		if (this.inFlight.has(dedupeKey)) return this.inFlight.get(dedupeKey);

		const promise = this.#run(fn, methodName, isSubmit, dedupeKey);
		this.inFlight.set(dedupeKey, promise);
		try {
			return await promise;
		} finally {
			this.inFlight.delete(dedupeKey);
		}
	}

	async #run(fn, methodName, isSubmit, dedupeKey) {
		try {
			const data = await this.#withTimeout(fn(), methodName);
			if (isSubmit) this.lastSubmitAt.set(dedupeKey, performance.now());
			return { ok: true, data };
		} catch (err) {
			if (err?.message?.includes('timed out')) {
				return { ok: false, error: 'timeout', message: err.message };
			}
			return { ok: false, error: 'sdk_error', message: err?.message ?? String(err) };
		}
	}

	#withTimeout(promise, label) {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error(`${label} timed out after ${this.timeoutMs}ms`)), this.timeoutMs);
			Promise.resolve(promise).then(
				value => {
					clearTimeout(timer);
					resolve(value);
				},
				err => {
					clearTimeout(timer);
					reject(err);
				}
			);
		});
	}

	#cooldownRemaining(key) {
		const last = this.lastSubmitAt.get(key);
		if (last == null) return 0;
		const elapsed = performance.now() - last;
		return elapsed < this.cooldownMs ? Math.ceil(this.cooldownMs - elapsed) : 0;
	}
}
