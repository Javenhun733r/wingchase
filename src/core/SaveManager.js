const PROGRESS_KEY = 'wingchase:progress';
const BEST_KEY = 'wingchase:best';
const STATS_KEY = 'wingchase:stats';

// localStorage can throw (private browsing, storage disabled, quota) -- treat
// save/load as best-effort so a storage failure never breaks the game.
function readJSON(key) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function writeJSON(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// ignore
	}
}

export function loadProgress() {
	return readJSON(PROGRESS_KEY);
}

export function saveProgress(state) {
	writeJSON(PROGRESS_KEY, state);
}

export function clearProgress() {
	try {
		localStorage.removeItem(PROGRESS_KEY);
	} catch {
		// ignore
	}
}

export function loadBest() {
	return readJSON(BEST_KEY);
}

// Keeps the single highest-scoring run's { score, level }.
export function recordBest(score, level) {
	const current = loadBest();
	if (current && current.score >= score) return current;
	const next = { score, level };
	writeJSON(BEST_KEY, next);
	return next;
}

// Lifetime counters shown on the start screen - separate from loadBest()
// (single best run) and loadProgress() (in-progress run resume state).
export function loadStats() {
	return readJSON(STATS_KEY) ?? { gamesPlayed: 0, orbsCollected: 0 };
}

export function recordGameStarted() {
	const stats = loadStats();
	stats.gamesPlayed += 1;
	writeJSON(STATS_KEY, stats);
	return stats;
}

export function recordOrbCollected() {
	const stats = loadStats();
	stats.orbsCollected += 1;
	writeJSON(STATS_KEY, stats);
	return stats;
}
