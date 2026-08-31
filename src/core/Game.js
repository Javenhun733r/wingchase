import * as THREE from 'three';
import { INVULN_MS, LEVELS, LIVES_START, ORB_VALUE, PIX3L_ACHIEVEMENTS, PIX3L_BOARDS } from '../config.js';
import { EnemyManager } from '../entities/EnemyManager.js';
import { OrbManager } from '../entities/OrbManager.js';
import { Player } from '../entities/Player.js';
import { ConfirmModal } from '../ui/ConfirmModal.js';
import { Hud } from '../ui/Hud.js';
import { InputManager } from './InputManager.js';
import { bumpAchievement, saveCloudProgress, setAchievementProgress } from './Pix3lManager.js';
import {
	clearProgress,
	loadBest,
	recordBest,
	recordGameStarted,
	recordOrbCollected,
	saveProgress as persistProgress,
} from './SaveManager.js';
import { SceneManager } from './SceneManager.js';

export class Game {
	// `leaderboards` is a LeaderboardManager instance (see main.js) - kept
	// optional/nullable so Game can still be constructed without one (tests,
	// tools) without every milestone call site needing its own guard clause.
	constructor(heroModel, enemyModel, savedProgress = null, leaderboards = null) {
		this.sceneManager = new SceneManager();
		this.input = new InputManager();
		this.player = new Player(this.sceneManager.scene, heroModel);
		this.orbManager = new OrbManager(this.sceneManager.scene);
		this.enemyManager = new EnemyManager(this.sceneManager.scene, enemyModel);
		this.hud = new Hud();
		this.confirmModal = new ConfirmModal();
		this.leaderboards = leaderboards;

		this.phase = 'ready';
		this.score = 0;
		this.lives = LIVES_START;
		this.invulnUntil = 0;
		this.levelIndex = 0;
		this.nextEnemyThreshold = 0;
		this.levelStartTime = 0;

		this.savedProgress = savedProgress;

		this.timer = new THREE.Timer();
		this.timer.connect(document);

		this.input.onActivate = () => this.handleActivate();
		this.input.onPauseToggle = () => this.togglePause();
		this.hud.onOverlayButtonClick(() => this.handleActivate());
		this.hud.onContinueClick(() => this.continueFromSave());
		this.hud.onRestartClick(() => this.restartFromPause());
		this.hud.showStart(loadBest(), !!this.savedProgress);

		this.sceneManager.setInitialCameraPosition(this.player.position);

		// Best-effort final capture so closing/reloading mid-run can resume later.
		window.addEventListener('beforeunload', () => this.saveProgress());

		// Backgrounding the tab shouldn't let enemies keep closing in unseen.
		document.addEventListener('visibilitychange', () => {
			if (document.hidden && this.phase === 'playing') this.pause();
		});

		bumpAchievement(PIX3L_ACHIEVEMENTS.WELCOME_ABOARD, 1);
	}

	// Called if a cloud save arrives after startup (the SDK may take a moment
	// to become available). Ignored once the player has moved past the start
	// screen so it can never clobber an active/finished run.
	applyCloudProgress(progress) {
		if (this.phase !== 'ready') return;
		this.savedProgress = progress;
		this.hud.showStart(loadBest(), true);
	}

	// Called once the SDK resolves player identity (also best-effort/late).
	applyPlayer(player) {
		if (!player?.username) return;
		this.hud.showPlayer(player.username, player.avatar_url);
	}

	async handleActivate() {
		if (this.phase === 'paused') this.resume();
		else if (this.phase === 'levelcomplete') this.startLevel(this.levelIndex + 1);
		else if (this.phase === 'ready' || this.phase === 'gameover' || this.phase === 'won') {
			// Only the 'ready' phase can still have an unresumed save (gameover/won
			// already cleared it via end()/win()) - confirm before "New Game" wipes it.
			if (this.phase === 'ready' && this.savedProgress) {
				const confirmed = await this.confirmModal.confirm({
					title: 'Start new game?',
					message: 'Starting a new game will erase your saved progress.',
					confirmText: 'New Game',
					cancelText: 'Cancel',
				});
				if (!confirmed) return;
			}
			this.start();
		}
	}

	start() {
		clearProgress();
		this.score = 0;
		this.lives = LIVES_START;
		this.invulnUntil = 0;

		this.hud.setScore(this.score);
		this.hud.setLives(this.lives);
		recordGameStarted();

		this.startLevel(0);
	}

	// Pause-menu shortcut for abandoning the current run without dying first -
	// reuses start()'s reset/clearProgress exactly like "New Game" does.
	async restartFromPause() {
		if (this.phase !== 'paused') return;
		const confirmed = await this.confirmModal.confirm({
			title: 'Restart run?',
			message: 'Your progress in this run will be lost.',
			confirmText: 'Restart',
			cancelText: 'Cancel',
		});
		if (!confirmed) return;
		this.start();
	}

	startLevel(index) {
		this.levelIndex = index;
		const level = LEVELS[index];

		this.player.reset();
		this.orbManager.reset(this.player.position, level.orbCount);
		this.enemyManager.reset();
		this.enemyManager.configure(level.enemyBaseSpeed, level.enemySpeedStep);
		for (let i = 0; i < level.startEnemies; i++) this.enemyManager.spawn(this.player.position);

		this.nextEnemyThreshold = this.score + level.enemySpawnInterval;
		this.levelStartTime = performance.now();

		this.phase = 'playing';
		this.hud.setLevel(index + 1, LEVELS.length);
		this.hud.hideOverlay();
		this.saveProgress();
		setAchievementProgress(PIX3L_ACHIEVEMENTS.REACH_LEVEL_5, index + 1);
	}

	// Restores a run saved via saveProgress(): exact score/lives/level plus the
	// exact orb/hunter positions, rather than a fresh randomized level start.
	continueFromSave() {
		const saved = this.savedProgress;
		if (!saved) return;

		const level = LEVELS[saved.levelIndex];

		this.levelIndex = saved.levelIndex;
		this.score = saved.score;
		this.lives = saved.lives;
		this.nextEnemyThreshold = saved.nextEnemyThreshold;
		this.invulnUntil = 0;
		this.levelStartTime = performance.now();

		this.player.reset();
		this.player.position.set(saved.player.x, 0, saved.player.z);

		this.orbManager.restoreOrbs(saved.orbs);
		this.enemyManager.configure(level.enemyBaseSpeed, level.enemySpeedStep);
		this.enemyManager.restoreEnemies(saved.enemies);

		this.phase = 'playing';
		this.hud.setScore(this.score);
		this.hud.setLives(this.lives);
		this.hud.setLevel(this.levelIndex + 1, LEVELS.length);
		this.hud.hideOverlay();

		this.sceneManager.setInitialCameraPosition(this.player.position);
	}

	saveProgress() {
		if (this.phase !== 'playing' && this.phase !== 'paused') return;
		const state = {
			levelIndex: this.levelIndex,
			score: this.score,
			lives: this.lives,
			nextEnemyThreshold: this.nextEnemyThreshold,
			player: { x: this.player.position.x, z: this.player.position.z },
			orbs: this.orbManager.orbs.map(orb => ({ x: orb.position.x, z: orb.position.z })),
			enemies: this.enemyManager.enemies.map(enemy => ({
				x: enemy.position.x,
				z: enemy.position.z,
				speed: enemy.userData.speed,
			})),
		};
		persistProgress(state);
		saveCloudProgress(state);
	}

	levelComplete() {
		clearProgress();
		// Wingchase has levels, not tracks/laps - `track` from the generic
		// milestone contract is reported as the level number here.
		this.leaderboards?.onLevelComplete(PIX3L_BOARDS.BEST_LAP_TIME, this.levelStartTime, {
			level: this.levelIndex + 1,
		});
		if (this.levelIndex >= LEVELS.length - 1) {
			this.win();
			return;
		}
		this.phase = 'levelcomplete';
		this.hud.showLevelComplete(this.levelIndex + 1, LEVELS.length, this.score);
	}

	end() {
		clearProgress();
		recordBest(this.score, this.levelIndex + 1);
		this.leaderboards?.onGameOver(PIX3L_BOARDS.MAIN_SCORE, this.score, { level: this.levelIndex + 1 });
		setAchievementProgress(PIX3L_ACHIEVEMENTS.HIGH_SCORE_1000, this.score);
		this.phase = 'gameover';
		this.hud.showGameOver(this.score);
	}

	win() {
		clearProgress();
		recordBest(this.score, this.levelIndex + 1);
		this.leaderboards?.onGameOver(PIX3L_BOARDS.MAIN_SCORE, this.score, { level: this.levelIndex + 1 });
		setAchievementProgress(PIX3L_ACHIEVEMENTS.HIGH_SCORE_1000, this.score);
		bumpAchievement(PIX3L_ACHIEVEMENTS.GAME_COMPLETE, 1);
		this.phase = 'won';
		this.hud.showWin(this.score);
	}

	togglePause() {
		if (this.phase === 'playing') this.pause();
		else if (this.phase === 'paused') this.resume();
	}

	pause() {
		this.phase = 'paused';
		this.hud.showPaused(this.score);
		this.saveProgress();
	}

	resume() {
		this.phase = 'playing';
		this.hud.hideOverlay();
	}

	isInvulnerable() {
		return performance.now() < this.invulnUntil;
	}

	handleOrbCollection() {
		const orb = this.orbManager.findCollected(this.player.position);
		if (!orb) return;

		this.orbManager.collect(orb);
		this.score += ORB_VALUE;
		this.hud.setScore(this.score);
		recordOrbCollected();
		bumpAchievement(PIX3L_ACHIEVEMENTS.FIRST_ORB, 1);
		bumpAchievement(PIX3L_ACHIEVEMENTS.ORB_COLLECTOR_100, 1);
		setAchievementProgress(PIX3L_ACHIEVEMENTS.SCORE_50, this.score);

		const level = LEVELS[this.levelIndex];
		if (this.score >= level.targetScore) {
			this.levelComplete();
			return;
		}

		this.orbManager.spawn(this.player.position);

		if (this.score >= this.nextEnemyThreshold && this.enemyManager.count < level.maxEnemies) {
			this.enemyManager.spawn(this.player.position);
			this.nextEnemyThreshold += level.enemySpawnInterval;
		}

		this.saveProgress();
	}

	handleEnemyCollision() {
		if (this.phase !== 'playing' || this.isInvulnerable()) return;

		const enemy = this.enemyManager.findColliding(this.player.position);
		if (!enemy) return;

		this.lives -= 1;
		this.hud.setLives(this.lives);
		this.invulnUntil = performance.now() + INVULN_MS;
		this.player.knockbackFrom(enemy.position);

		if (this.lives <= 0) {
			this.end();
		} else {
			this.saveProgress();
		}
	}

	tick(timestamp) {
		this.timer.update(timestamp);
		const delta = Math.min(this.timer.getDelta(), 0.05);

		if (this.phase === 'playing') {
			this.orbManager.update(delta);
			this.player.update(delta, this.input, this.isInvulnerable());
			this.enemyManager.update(delta, this.player.position);
			this.handleOrbCollection();
			this.handleEnemyCollision();
			this.sceneManager.updateCamera(this.player.position, delta);
		} else if (this.phase !== 'paused') {
			this.orbManager.update(delta);
			this.enemyManager.idleSpin(delta);
			this.sceneManager.updateCamera(this.player.position, delta);
		}

		this.sceneManager.render();
	}

	run() {
		this.sceneManager.renderer.setAnimationLoop(timestamp => this.tick(timestamp));
	}
}
