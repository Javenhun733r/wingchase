import { PIX3L_BOARDS } from './config.js';
import { loadModels } from './core/AssetLoader.js';
import { AudioManager } from './core/AudioManager.js';
import { Game } from './core/Game.js';
import { LeaderboardManager } from './core/LeaderboardManager.js';
import { getPlayer, initPix3l, loadCloudProgress } from './core/Pix3lManager.js';
import { loadProgress } from './core/SaveManager.js';
import { LeaderboardHud } from './ui/LeaderboardHud.js';

const overlay = document.getElementById('overlay');
document.getElementById('overlay-title').textContent = 'LOADING…';
document.getElementById('overlay-text').textContent = 'Fetching 3D models.';
overlay.classList.remove('hidden');

let heroModel, enemyModel;
try {
	({ heroModel, enemyModel } = await loadModels());
} catch (err) {
	console.error('[main] Failed to load 3D models:', err);
	document.getElementById('overlay-title').textContent = 'LOAD FAILED';
	document.getElementById('overlay-text').textContent = 'Could not load game assets. Please refresh the page to try again.';
	throw err;
}

// Created before Game so it can be injected into it - Game.js calls
// leaderboards.onGameOver()/onLevelComplete() directly at its milestones
// (see end()/win()/levelComplete()), same as bumpAchievement/saveCloudProgress.
const leaderboards = new LeaderboardManager();

// Start immediately from local storage; the PIX3L SDK may take a moment to
// become available (or never, outside the platform iframe) and must never
// stall game startup.
const game = new Game(heroModel, enemyModel, loadProgress(), leaderboards);
game.run();

new AudioManager();

// View-only leaderboard overlay - press 'L' or click the pinned 🏆 button
// in-game. Board keys come from src/config.js (PIX3L_BOARDS); pre-filled here
// as a fallback in case fetchActiveBoards() below is empty.
const leaderboardHud = new LeaderboardHud(leaderboards, {
	defaultBoardKey: PIX3L_BOARDS.MAIN_SCORE,
	// Unlike the pause-menu's leaderboard button (only reachable once already
	// paused), this overlay's own pinned button/hotkey can open it mid-run -
	// pause first so enemies don't keep closing in unseen behind the panel
	// (same rationale as the visibilitychange auto-pause in Game.js).
	onOpen: () => {
		if (game.phase === 'playing') game.pause();
	},
});

// Same view as the pinned 🏆 button/'L' key, reachable from the pause menu too.
game.hud.onLeaderboardClick(() => leaderboardHud.open());

initPix3l().then(async () => {
	const [player, cloudProgress] = await Promise.all([getPlayer(), loadCloudProgress()]);
	if (player) game.applyPlayer(player);
	if (cloudProgress) game.applyCloudProgress(cloudProgress);
	// Populate the HUD's board dropdown as soon as the SDK is actually ready -
	// calling it any earlier would just resolve to sdk_unavailable.
	leaderboardHud.loadBoards();
});
