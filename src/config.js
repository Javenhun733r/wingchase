// Must match the "key" fields in src/data/achievements.json exactly, and the
// achievement keys configured for Wingchase in the PIX3L dashboard.
export const PIX3L_ACHIEVEMENTS = {
	WELCOME_ABOARD: 'welcome_aboard',
	FIRST_ORB: 'first_orb',
	ORB_COLLECTOR_100: 'orb_collector_100',
	REACH_LEVEL_5: 'reach_level_5',
	GAME_COMPLETE: 'game_complete',
	SCORE_50: 'score_50',
	HIGH_SCORE_1000: 'high_score_1000',
};

// Leaderboard board keys - must match the boards configured for Wingchase in
// the PIX3L Studio dashboard. Kept as named constants (same pattern as
// PIX3L_ACHIEVEMENTS above) so they're a one-line change if the dashboard
// keys ever differ from these.
export const PIX3L_BOARDS = {
	MAIN_SCORE: 'main_score',
	BEST_LAP_TIME: 'best_lap_time',
};

export const ARENA_HALF = 24;
export const WALL_HEIGHT = 2.2;

export const PLAYER_SPEED = 9;
export const PLAYER_RADIUS = 0.55;
export const KNOCKBACK = 3.2;

export const ORB_COLLECT_DIST = 1.15;
export const ENEMY_HIT_DIST = 1.2;
export const ORB_VALUE = 10;

export const LIVES_START = 3;
export const INVULN_MS = 1400;

export const LEVELS = [
	{
		name: 'Level 1',
		targetScore: 100,
		orbCount: 6,
		startEnemies: 1,
		maxEnemies: 3,
		enemyBaseSpeed: 3.6,
		enemySpeedStep: 0.35,
		enemySpawnInterval: 40,
	},
	{
		name: 'Level 2',
		targetScore: 220,
		orbCount: 7,
		startEnemies: 2,
		maxEnemies: 4,
		enemyBaseSpeed: 4.0,
		enemySpeedStep: 0.35,
		enemySpawnInterval: 42,
	},
	{
		name: 'Level 3',
		targetScore: 360,
		orbCount: 7,
		startEnemies: 2,
		maxEnemies: 4,
		enemyBaseSpeed: 4.4,
		enemySpeedStep: 0.35,
		enemySpawnInterval: 45,
	},
	{
		name: 'Level 4',
		targetScore: 510,
		orbCount: 8,
		startEnemies: 3,
		maxEnemies: 5,
		enemyBaseSpeed: 4.8,
		enemySpeedStep: 0.35,
		enemySpawnInterval: 45,
	},
	{
		name: 'Level 5',
		targetScore: 670,
		orbCount: 8,
		startEnemies: 3,
		maxEnemies: 5,
		enemyBaseSpeed: 5.1,
		enemySpeedStep: 0.3,
		enemySpawnInterval: 48,
	},
	{
		name: 'Level 6',
		targetScore: 840,
		orbCount: 9,
		startEnemies: 4,
		maxEnemies: 6,
		enemyBaseSpeed: 5.4,
		enemySpeedStep: 0.3,
		enemySpawnInterval: 48,
	},
	{
		name: 'Level 7',
		targetScore: 1020,
		orbCount: 9,
		startEnemies: 4,
		maxEnemies: 6,
		enemyBaseSpeed: 5.7,
		enemySpeedStep: 0.3,
		enemySpawnInterval: 50,
	},
	{
		name: 'Level 8',
		targetScore: 1210,
		orbCount: 10,
		startEnemies: 5,
		maxEnemies: 7,
		enemyBaseSpeed: 6.0,
		enemySpeedStep: 0.3,
		enemySpawnInterval: 50,
	},
	{
		name: 'Level 9',
		targetScore: 1410,
		orbCount: 10,
		startEnemies: 5,
		maxEnemies: 7,
		enemyBaseSpeed: 6.3,
		enemySpeedStep: 0.25,
		enemySpawnInterval: 52,
	},
	{
		name: 'Level 10',
		targetScore: 1630,
		orbCount: 11,
		startEnemies: 6,
		maxEnemies: 8,
		enemyBaseSpeed: 6.6,
		enemySpeedStep: 0.25,
		enemySpawnInterval: 52,
	},
];
