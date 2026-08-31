const READY_TIMEOUT_MS = 4000;
const POLL_INTERVAL_MS = 50;

let readyPromise = null;

function waitForSdk() {
	return new Promise(resolve => {
		if (window.PIX3L) return resolve(window.PIX3L);
		const start = performance.now();
		const timer = setInterval(() => {
			if (window.PIX3L) {
				clearInterval(timer);
				resolve(window.PIX3L);
			} else if (performance.now() - start > READY_TIMEOUT_MS) {
				clearInterval(timer);
				resolve(null);
			}
		}, POLL_INTERVAL_MS);
	});
}

// Best-effort: the game must run standalone (outside the PIX3L iframe, offline,
// or during local dev) exactly as it does on the platform, so every export
// here degrades to a safe no-op/null instead of throwing. The SDK is injected
// by the platform runtime itself - no script tag or game ID needed here.
export function initPix3l() {
	if (!readyPromise) readyPromise = waitForSdk();
	return readyPromise;
}

export async function getPlayer() {
	try {
		if (!window.PIX3L) return null;
		return (await window.PIX3L.getPlayer()) ?? null;
	} catch {
		return null;
	}
}

export async function loadCloudProgress() {
	try {
		if (!window.PIX3L) return null;
		return (await window.PIX3L.load('default')) ?? null;
	} catch {
		return null;
	}
}

export function saveCloudProgress(state) {
	try {
		window.PIX3L?.save(state)?.catch(() => {});
	} catch {
		// ignore
	}
}

// Leaderboard submissions moved to LeaderboardManager.js, which calls
// PIX3L.leaderboards.submitScore(boardKey, score, metadata) - the old
// single-object submitScore({ score, extraData }) shape here is gone,
// use LeaderboardManager.onGameOver()/submitScore() instead (see Game.js).

// Incremental counters (e.g. orbs collected across a run/lifetime).
export function bumpAchievement(key, amount) {
	try {
		window.PIX3L?.achievements?.progress(key, amount);
	} catch {
		// ignore
	}
}

// Absolute best-so-far values (e.g. highest level reached, high score).
export function setAchievementProgress(key, value) {
	try {
		window.PIX3L?.achievements?.setProgress(key, value);
	} catch {
		// ignore
	}
}

export function onAchievementUnlock(callback) {
	try {
		window.PIX3L?.achievements?.onUnlock(callback);
	} catch {
		// ignore
	}
}

// Audio settings (volume/mute) live in the platform chrome, not in-game -
// AudioManager uses these to keep bg-sound in sync with the player's choice.
export function getAudioVolume() {
	try {
		return window.PIX3L?.audio?.getVolume() ?? 1;
	} catch {
		return 1;
	}
}

export function isAudioMuted() {
	try {
		return window.PIX3L?.audio?.isMuted() ?? false;
	} catch {
		return false;
	}
}

export function setAudioVolume(value) {
	try {
		window.PIX3L?.audio?.setVolume(value);
	} catch {
		// ignore
	}
}

export function setAudioMuted(muted) {
	try {
		window.PIX3L?.audio?.setMuted(muted);
	} catch {
		// ignore
	}
}

export function onAudioChange(callback) {
	try {
		window.PIX3L?.audio?.onChange(callback);
	} catch {
		// ignore
	}
}

// PIX3L.audio is a read-only settings source (per SDK docs: it does not
// play/mix/control sound itself) - callers use this to detect the standalone/
// offline case and warn instead of silently assuming defaults forever.
export function isAudioAvailable() {
	try {
		return !!window.PIX3L?.audio;
	} catch {
		return false;
	}
}
