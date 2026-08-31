import { LEVELS, LIVES_START } from '../config.js';
import { loadStats } from '../core/SaveManager.js';

export class Hud {
	constructor() {
		this.scoreEl = document.getElementById('score');
		this.livesEl = document.getElementById('lives');
		this.levelEl = document.getElementById('level');
		this.overlay = document.getElementById('overlay');
		this.overlayTitle = document.getElementById('overlay-title');
		this.overlayText = document.getElementById('overlay-text');
		this.finalScoreEl = document.getElementById('final-score');
		this.bestScoreEl = document.getElementById('best-score');
		this.statsEl = document.getElementById('stats');
		this.overlayButton = document.getElementById('overlay-button');
		this.continueButton = document.getElementById('continue-button');
		this.restartButton = document.getElementById('restart-button');
		this.leaderboardButton = document.getElementById('leaderboard-button');
		this.playerBadge = document.getElementById('player-badge');
		this.playerAvatar = document.getElementById('player-avatar');
		this.playerName = document.getElementById('player-name');
	}

	onOverlayButtonClick(callback) {
		this.overlayButton.addEventListener('click', callback);
	}

	onContinueClick(callback) {
		this.continueButton.addEventListener('click', callback);
	}

	onRestartClick(callback) {
		this.restartButton.addEventListener('click', callback);
	}

	onLeaderboardClick(callback) {
		this.leaderboardButton.addEventListener('click', callback);
	}

	setScore(score) {
		this.scoreEl.textContent = String(score);
	}

	setLives(lives) {
		const alive = Math.max(lives, 0);
		this.livesEl.textContent = '❤'.repeat(alive) + '🖤'.repeat(LIVES_START - alive);
		// Pulse the hearts row on the last life so a near-death state is hard to
		// miss mid-action, not just a subtly different icon color.
		this.livesEl.classList.toggle('critical', alive === 1);
	}

	setLevel(levelNumber, totalLevels) {
		this.levelEl.textContent = `Level ${levelNumber} / ${totalLevels}`;
	}

	showStart(bestRecord, hasSave) {
		this.overlayTitle.textContent = 'WINGCHASE';
		this.overlayText.textContent = `Collect the glowing orbs and dodge the hunters across ${LEVELS.length} escalating levels. WASD / Arrow keys to move, P or Esc to pause.`;
		this.finalScoreEl.textContent = '';
		this.bestScoreEl.textContent = bestRecord ? `Best: ${bestRecord.score} pts · reached Level ${bestRecord.level}` : '';
		const stats = loadStats();
		this.statsEl.textContent =
			stats.gamesPlayed > 0 ? `${stats.gamesPlayed} games played · ${stats.orbsCollected} orbs collected` : '';
		this.overlayButton.textContent = hasSave ? 'New Game' : 'Start Game';
		this.continueButton.textContent = 'Continue';
		this.continueButton.style.display = hasSave ? 'inline-block' : 'none';
		this.restartButton.style.display = 'none';
		this.leaderboardButton.style.display = 'none';
		this.overlay.classList.remove('hidden');
	}

	showGameOver(score) {
		this.overlayTitle.textContent = 'GAME OVER';
		this.overlayText.textContent = 'The hunters got you.';
		this.finalScoreEl.textContent = `Final Score: ${score}`;
		this.bestScoreEl.textContent = '';
		this.statsEl.textContent = '';
		this.overlayButton.textContent = 'Play Again';
		this.continueButton.style.display = 'none';
		this.restartButton.style.display = 'none';
		this.leaderboardButton.style.display = 'none';
		this.overlay.classList.remove('hidden');
	}

	showWin(score) {
		this.overlayTitle.textContent = 'YOU WIN!';
		this.overlayText.textContent = 'You cleared every level.';
		this.finalScoreEl.textContent = `Final Score: ${score}`;
		this.bestScoreEl.textContent = '';
		this.statsEl.textContent = '';
		this.overlayButton.textContent = 'Play Again';
		this.continueButton.style.display = 'none';
		this.restartButton.style.display = 'none';
		this.leaderboardButton.style.display = 'none';
		this.overlay.classList.remove('hidden');
	}

	showLevelComplete(levelNumber, totalLevels, score) {
		this.overlayTitle.textContent = 'LEVEL COMPLETE';
		this.overlayText.textContent = `Level ${levelNumber} of ${totalLevels} cleared. The next level adds tougher, faster hunters.`;
		this.finalScoreEl.textContent = `Score: ${score}`;
		this.bestScoreEl.textContent = '';
		this.statsEl.textContent = '';
		this.overlayButton.textContent = 'Next Level';
		this.continueButton.style.display = 'none';
		this.restartButton.style.display = 'none';
		this.leaderboardButton.style.display = 'none';
		this.overlay.classList.remove('hidden');
	}

	showPaused(score) {
		this.overlayTitle.textContent = 'PAUSED';
		this.overlayText.textContent = `Score: ${score} — press P or Esc to resume.`;
		this.finalScoreEl.textContent = '';
		this.bestScoreEl.textContent = '';
		this.statsEl.textContent = '';
		this.overlayButton.textContent = 'Resume';
		this.continueButton.style.display = 'none';
		this.restartButton.style.display = 'inline-block';
		this.leaderboardButton.style.display = 'inline-block';
		this.overlay.classList.remove('hidden');
	}

	hideOverlay() {
		this.overlay.classList.add('hidden');
	}

	showPlayer(username, avatarUrl) {
		this.playerName.textContent = username ?? '';
		if (avatarUrl) {
			this.playerAvatar.src = avatarUrl;
			this.playerAvatar.style.display = '';
			this.playerAvatar.onerror = () => {
				this.playerAvatar.style.display = 'none';
			};
		} else {
			this.playerAvatar.style.display = 'none';
		}
		this.playerBadge.classList.add('visible');
	}
}
