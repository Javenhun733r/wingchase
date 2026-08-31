import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { ARENA_HALF, ENEMY_HIT_DIST } from '../config.js';
import { flatDist, placeAwayFrom } from '../utils/spatial.js';
import {
	createBoneWiggles,
	updateBoneWiggles,
} from '../utils/boneAnimation.js';

const MODEL_SCALE = 0.9;
const MODEL_YAW_OFFSET = 0;

const LEG_WIGGLE_SPECS = [
	{ name: 'Leg_001_Left', axis: 'x', amplitude: 0.35, speed: 8 },
	{
		name: 'Leg_001_Right',
		axis: 'x',
		amplitude: 0.35,
		speed: 8,
		phase: Math.PI,
	},
	{
		name: 'MiddleLeg_001_Left',
		axis: 'x',
		amplitude: 0.35,
		speed: 8,
		phase: Math.PI,
	},
	{ name: 'MiddleLeg_001_Right', axis: 'x', amplitude: 0.35, speed: 8 },
];

export class EnemyManager {
	constructor(scene, enemyModel) {
		this.scene = scene;
		this.enemyModel = enemyModel;
		this.enemies = [];
		this.toPlayer = new THREE.Vector3();
		this.lookTarget = new THREE.Vector3();
		this.baseSpeed = 3.6;
		this.speedStep = 0.35;
	}

	get count() {
		return this.enemies.length;
	}

	configure(baseSpeed, speedStep) {
		this.baseSpeed = baseSpeed;
		this.speedStep = speedStep;
	}

	reset() {
		for (const enemy of this.enemies) this.scene.remove(enemy);
		this.enemies.length = 0;
	}

	createGroup() {
		const model = cloneSkinned(this.enemyModel);
		model.scale.setScalar(MODEL_SCALE);
		model.rotation.y = MODEL_YAW_OFFSET;
		model.traverse(obj => {
			if (obj.isMesh) obj.castShadow = true;
		});

		const group = new THREE.Group();
		group.add(model);
		group.userData.legWiggles = createBoneWiggles(model, LEG_WIGGLE_SPECS);
		return group;
	}

	spawn(playerPosition) {
		const speed = this.baseSpeed + this.enemies.length * this.speedStep;
		const group = this.createGroup();
		group.userData.speed = speed;

		placeAwayFrom(group, playerPosition, 10);
		group.position.y = 0;

		this.scene.add(group);
		this.enemies.push(group);
	}

	// Recreates hunters at exact saved positions/speeds instead of random
	// placement, for resuming a saved run.
	restoreEnemies(entries) {
		this.reset();
		for (const entry of entries) {
			const group = this.createGroup();
			group.userData.speed = entry.speed;
			group.position.set(entry.x, 0, entry.z);
			this.scene.add(group);
			this.enemies.push(group);
		}
	}

	update(delta, playerPosition) {
		const now = performance.now() * 0.001;
		for (const enemy of this.enemies) {
			this.toPlayer.copy(playerPosition).sub(enemy.position);
			this.toPlayer.y = 0;
			if (this.toPlayer.lengthSq() > 0.0001) {
				this.toPlayer.normalize();
				enemy.position.addScaledVector(
					this.toPlayer,
					enemy.userData.speed * delta,
				);
				this.lookTarget.copy(enemy.position).add(this.toPlayer);
				enemy.lookAt(this.lookTarget);
			}
			enemy.position.x = THREE.MathUtils.clamp(
				enemy.position.x,
				-ARENA_HALF + 1,
				ARENA_HALF - 1,
			);
			enemy.position.z = THREE.MathUtils.clamp(
				enemy.position.z,
				-ARENA_HALF + 1,
				ARENA_HALF - 1,
			);
			updateBoneWiggles(
				enemy.userData.legWiggles,
				now * (enemy.userData.speed / this.baseSpeed),
			);
		}
	}

	idleSpin(delta) {
		const now = performance.now() * 0.001;
		for (const enemy of this.enemies) {
			enemy.rotation.y += delta * 0.3;
			updateBoneWiggles(enemy.userData.legWiggles, now);
		}
	}

	findColliding(playerPosition) {
		return (
			this.enemies.find(
				enemy => flatDist(playerPosition, enemy.position) < ENEMY_HIT_DIST,
			) ?? null
		);
	}
}
