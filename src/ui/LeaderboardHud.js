import { LeaderboardManager } from '../core/LeaderboardManager.js';

// Self-mounting, view-only leaderboard overlay. Drop it in anywhere after
// the game boots:
//
//   const leaderboards = new LeaderboardManager();
//   new LeaderboardHud(leaderboards);
//
// Press 'L' (configurable) or click the pinned button to toggle it. It only
// reads (top entries + the player's own rank) - actual score/time submission
// happens at the real game milestones via LeaderboardManager.onGameOver()/
// onLevelComplete() (see Game.js), not from this overlay.

const STYLE_ID = 'lb-hud-styles';

export class LeaderboardHud {
	#onKeyDown;

	/**
	 * @param {LeaderboardManager} manager
	 * @param {Object} [options]
	 * @param {string} [options.toggleKey] - Single-letter key that opens/closes the overlay.
	 * @param {string} [options.defaultBoardKey] - Pre-filled board key, used before fetchActiveBoards() resolves.
	 * @param {HTMLElement} [options.container] - Mount point, defaults to document.body.
	 * @param {Function} [options.onOpen] - Called just before the overlay opens (e.g. to pause the game -
	 *   unlike the pause-menu's leaderboard button, the pinned button/hotkey here can open this overlay
	 *   mid-run, and without a hook the game keeps ticking - enemies closing in, keys still moving the
	 *   player - unseen behind the panel).
	 */
	constructor(manager, options = {}) {
		this.manager = manager;
		this.toggleKey = (options.toggleKey ?? 'l').toLowerCase();
		this.onOpen = options.onOpen ?? null;
		this.scope = 'all';
		this.boards = [];
		this.isOpen = false;

		this.#injectStyles();
		this.#buildDom(options.container ?? document.body, options.defaultBoardKey ?? '');
		this.#wireEvents();
	}

	open() {
		this.onOpen?.();
		this.isOpen = true;
		this.backdropEl.classList.remove('lb-hidden');
		if (this.boards.length === 0) this.loadBoards();
		else this.refresh();
	}

	close() {
		this.isOpen = false;
		this.backdropEl.classList.add('lb-hidden');
	}

	toggle() {
		if (this.isOpen) this.close();
		else this.open();
	}

	destroy() {
		document.removeEventListener('keydown', this.#onKeyDown);
		this.rootEl.remove();
	}

	// --- Data loading --------------------------------------------------

	async loadBoards() {
		this.#setStatus('Loading boards…');
		const res = await this.manager.fetchActiveBoards();
		if (!res.ok) {
			this.#setStatus(`Could not load boards: ${res.message ?? res.error}. Enter a board key manually below.`, true);
			return;
		}

		this.boards = this.#normalizeBoards(res.data);
		this.boardSelectEl.innerHTML = '';
		for (const board of this.boards) {
			const option = document.createElement('option');
			option.value = board.key;
			option.textContent = board.name;
			this.boardSelectEl.appendChild(option);
		}

		if (this.boards.length === 0) {
			this.#setStatus('No active boards returned. Enter a board key manually below.');
		} else if (!this.boardKeyInputEl.value) {
			this.boardSelectEl.value = this.boards[0].key;
			this.#setStatus('');
		}

		await this.refresh();
	}

	async refresh() {
		const boardKey = this.#activeBoardKey();
		if (!boardKey) {
			this.#setStatus('Select or type a board key first.', true);
			return;
		}

		this.#setStatus('Loading leaderboard…');
		const [topRes, rankRes] = await Promise.all([
			this.manager.fetchTop(boardKey, { limit: 10, scope: this.scope }),
			this.manager.fetchMyRank(boardKey, { scope: this.scope }),
		]);

		this.#renderTop(topRes);
		this.#renderPinned(rankRes);

		if (!topRes.ok) this.#setStatus(`Top entries: ${topRes.message ?? topRes.error}`, true);
		else if (!rankRes.ok) this.#setStatus(`Your rank: ${rankRes.message ?? rankRes.error}`, true);
		else this.#setStatus('');
	}

	// --- Rendering -------------------------------------------------------

	#renderTop(result) {
		this.tableBodyEl.innerHTML = '';
		if (!result.ok) return;

		const entries = this.#normalizeEntries(result.data);
		if (entries.length === 0) {
			this.tableBodyEl.innerHTML = '<tr><td colspan="3" class="lb-empty">No entries yet.</td></tr>';
			return;
		}

		for (const [index, entry] of entries.entries()) {
			const row = document.createElement('tr');
			const rank = entry.rank ?? index + 1;
			const name = entry.username ?? entry.name ?? entry.player?.username ?? 'Anonymous';
			row.innerHTML = `<td>#${rank}</td><td>${this.#escape(name)}</td><td>${this.#escape(this.#formatEntryValue(entry))}</td>`;
			this.tableBodyEl.appendChild(row);
		}
	}

	// myRank() returns a flat { rank, score, timeMs, totalEntries } - rank is
	// null when the player has no entry on this board yet.
	#renderPinned(result) {
		if (!result.ok) {
			this.pinnedEl.textContent = '';
			this.pinnedEl.classList.add('lb-hidden');
			return;
		}

		const { rank } = result.data ?? {};
		this.pinnedEl.textContent =
			rank == null ? 'You: unranked on this board yet.' : `You: #${rank} — ${this.#formatEntryValue(result.data)}`;
		this.pinnedEl.classList.remove('lb-hidden');
	}

	#formatEntryValue(entry) {
		if (!entry) return '—';
		const parts = [];
		if (entry.score != null) parts.push(String(entry.score));
		if (entry.timeMs != null) parts.push(LeaderboardManager.formatTime(entry.timeMs));
		return parts.length ? parts.join(' · ') : '—';
	}

	// list() returns board definitions as a plain array of { key, name,
	// board_type, primary_metric }.
	#normalizeBoards(data) {
		const list = Array.isArray(data) ? data : [];
		return list.map(item => ({ key: item.key, name: item.name ?? item.key }));
	}

	// top() returns { key, scope, limit, offset, entries } - entries is the array.
	#normalizeEntries(data) {
		return data?.entries ?? [];
	}

	#activeBoardKey() {
		return this.boardKeyInputEl.value.trim() || this.boardSelectEl.value || '';
	}

	#setStatus(message, isError = false) {
		this.statusEl.textContent = message;
		this.statusEl.classList.toggle('lb-error', isError);
	}

	#escape(value) {
		return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
	}

	// --- DOM setup -------------------------------------------------------

	#buildDom(container, defaultBoardKey) {
		this.rootEl = document.createElement('div');
		this.rootEl.className = 'lb-hud-root';
		this.rootEl.innerHTML = `
			<button class="lb-toggle-btn" title="Toggle leaderboards (${this.toggleKey.toUpperCase()})" aria-label="Toggle leaderboards">🏆</button>
			<div class="lb-backdrop lb-hidden">
				<div class="lb-panel" role="dialog" aria-label="Leaderboards">
					<div class="lb-header">
						<h2>Leaderboards</h2>
						<button class="lb-close" aria-label="Close">×</button>
					</div>
					<div class="lb-controls">
						<select class="lb-board-select"></select>
						<input class="lb-board-key" type="text" placeholder="or type a board key" value="${this.#escape(defaultBoardKey)}" />
						<div class="lb-scope-toggle">
							<button class="lb-scope-btn active" data-scope="all">Global</button>
							<button class="lb-scope-btn" data-scope="friends">Friends</button>
						</div>
						<button class="lb-refresh">Refresh</button>
					</div>
					<div class="lb-status"></div>
					<div class="lb-pinned lb-hidden"></div>
					<table class="lb-table">
						<thead><tr><th>#</th><th>Player</th><th>Score / Time</th></tr></thead>
						<tbody></tbody>
					</table>
				</div>
			</div>
		`;
		container.appendChild(this.rootEl);

		this.toggleBtnEl = this.rootEl.querySelector('.lb-toggle-btn');
		this.backdropEl = this.rootEl.querySelector('.lb-backdrop');
		this.closeBtnEl = this.rootEl.querySelector('.lb-close');
		this.boardSelectEl = this.rootEl.querySelector('.lb-board-select');
		this.boardKeyInputEl = this.rootEl.querySelector('.lb-board-key');
		this.scopeBtnEls = [...this.rootEl.querySelectorAll('.lb-scope-btn')];
		this.refreshBtnEl = this.rootEl.querySelector('.lb-refresh');
		this.statusEl = this.rootEl.querySelector('.lb-status');
		this.pinnedEl = this.rootEl.querySelector('.lb-pinned');
		this.tableBodyEl = this.rootEl.querySelector('.lb-table tbody');
	}

	#wireEvents() {
		this.#onKeyDown = event => {
			if (event.key.toLowerCase() !== this.toggleKey) return;
			if (this.#isEditableTarget(event.target)) return;
			this.toggle();
		};
		document.addEventListener('keydown', this.#onKeyDown);

		this.toggleBtnEl.addEventListener('click', () => this.toggle());
		this.closeBtnEl.addEventListener('click', () => this.close());
		this.boardSelectEl.addEventListener('change', () => {
			this.boardKeyInputEl.value = '';
			this.refresh();
		});
		this.refreshBtnEl.addEventListener('click', () => this.refresh());

		for (const btn of this.scopeBtnEls) {
			btn.addEventListener('click', () => {
				this.scope = btn.dataset.scope;
				for (const other of this.scopeBtnEls) other.classList.toggle('active', other === btn);
				this.refresh();
			});
		}
	}

	#isEditableTarget(el) {
		return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.tagName === 'SELECT' || el?.isContentEditable;
	}

	#injectStyles() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
			.lb-toggle-btn {
				position: fixed;
				top: 122px;
				right: 16px;
				width: 44px;
				height: 44px;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: 50%;
				border: 1px solid rgba(79, 172, 254, 0.35);
				background: rgba(10, 10, 26, 0.6);
				color: #e8f6ff;
				font-size: 16px;
				line-height: 1;
				cursor: pointer;
				box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
				z-index: 20;
				transition: transform 0.15s ease, filter 0.15s ease;
			}
			.lb-toggle-btn:hover { filter: brightness(1.2); transform: scale(1.08); }
			.lb-toggle-btn:active { transform: scale(0.96); }
			.lb-hud-root button:focus-visible {
				outline: 2px solid #4facfe;
				outline-offset: 2px;
			}
			.lb-backdrop {
				position: fixed;
				inset: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				background: rgba(5, 5, 15, 0.75);
				backdrop-filter: blur(6px);
				-webkit-backdrop-filter: blur(6px);
				z-index: 30;
				opacity: 1;
				visibility: visible;
				transition: opacity 0.2s ease, visibility 0.2s;
				font-family: var(--font-body, 'Segoe UI', system-ui, sans-serif);
			}
			.lb-hidden { opacity: 0; visibility: hidden; pointer-events: none; }
			.lb-panel {
				width: min(520px, 92vw);
				max-height: 84vh;
				overflow-y: auto;
				background: #0d1524;
				border: 1px solid rgba(79, 172, 254, 0.35);
				border-radius: 14px;
				padding: 18px 20px;
				color: #e8f6ff;
				box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
				transform: scale(1) translateY(0);
				transition: transform 0.2s ease;
			}
			.lb-backdrop.lb-hidden .lb-panel { transform: scale(0.94) translateY(10px); }
			.lb-panel::-webkit-scrollbar { width: 8px; }
			.lb-panel::-webkit-scrollbar-track { background: transparent; }
			.lb-panel::-webkit-scrollbar-thumb { background: rgba(79, 172, 254, 0.35); border-radius: 999px; }
			.lb-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
			.lb-header h2 { margin: 0; font-family: var(--font-display, inherit); font-size: 21px; font-weight: 700; color: #6ff7ff; letter-spacing: 0.5px; }
			.lb-close { background: none; border: none; color: #b8c6d9; font-size: 22px; line-height: 1; cursor: pointer; transition: color 0.15s ease, transform 0.15s ease; }
			.lb-close:hover { color: #6ff7ff; transform: rotate(90deg); }
			.lb-controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
			.lb-controls select,
			.lb-controls input[type='text'] {
				flex: 1 1 140px;
				background: rgba(255, 255, 255, 0.06);
				border: 1px solid rgba(79, 172, 254, 0.3);
				border-radius: 6px;
				color: #e8f6ff;
				padding: 6px 8px;
				font-size: 13px;
				transition: border-color 0.15s ease;
			}
			.lb-controls select:focus-visible,
			.lb-controls input[type='text']:focus-visible {
				outline: none;
				border-color: #6ff7ff;
			}
			.lb-scope-toggle { display: flex; border-radius: 999px; overflow: hidden; border: 1px solid rgba(79, 172, 254, 0.3); }
			.lb-scope-btn { border: none; background: transparent; color: #b8c6d9; padding: 6px 12px; font-size: 13px; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
			.lb-scope-btn.active { background: linear-gradient(135deg, #6ff7ff, #4facfe); color: #05121a; font-weight: 600; }
			.lb-refresh {
				background: linear-gradient(135deg, #6ff7ff, #4facfe);
				border: none;
				border-radius: 6px;
				color: #05121a;
				font-weight: 600;
				padding: 6px 14px;
				font-size: 13px;
				cursor: pointer;
				transition: filter 0.15s ease, transform 0.15s ease;
			}
			.lb-refresh:hover { filter: brightness(1.08); transform: translateY(-1px); }
			.lb-refresh:active { transform: translateY(0) scale(0.97); }
			.lb-status { min-height: 18px; font-size: 12px; color: #7d8aa3; margin-bottom: 8px; }
			.lb-status.lb-error { color: #ff8a8a; }
			.lb-pinned {
				background: rgba(79, 172, 254, 0.12);
				border: 1px solid rgba(79, 172, 254, 0.3);
				border-radius: 8px;
				padding: 8px 12px;
				font-size: 13px;
				margin-bottom: 10px;
				color: #ffd166;
			}
			.lb-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 14px; }
			.lb-table th, .lb-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
			.lb-table th { color: #7d8aa3; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
			.lb-empty { color: #7d8aa3; text-align: center; }
		`;
		document.head.appendChild(style);
	}
}
