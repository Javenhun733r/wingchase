import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import {
	ARENA_HALF,
	KNOCKBACK,
	PLAYER_RADIUS,
	PLAYER_SPEED,
} from '../config.js';
import {
	createBoneWiggles,
	updateBoneWiggles,
} from '../utils/boneAnimation.js';

const CLAMP_MARGIN = PLAYER_RADIUS + 0.6;
const MODEL_SCALE = 0.8;
const MODEL_YAW_OFFSET = 0;
const WING_WIGGLE_SPECS = [
	{ name: 'WingL', axis: 'x', amplitude: 0.7, speed: 7 },
	{ name: 'WingR', axis: 'x', amplitude: 0.7, speed: 7 },
];

export class Player {
	constructor(scene, heroModel) {
		const model = cloneSkinned(heroModel);
		model.scale.setScalar(MODEL_SCALE);
		model.rotation.y = MODEL_YAW_OFFSET;
		this.materials = [];
		model.traverse(obj => {
			if (obj.isMesh) {
				obj.castShadow = true;
				obj.material.transparent = true;
				this.materials.push(obj.material);
			}
		});

		this.object = new THREE.Group();
		this.object.add(model);
		scene.add(this.object);

		this.wingWiggles = createBoneWiggles(model, WING_WIGGLE_SPECS);

		this.moveDir = new THREE.Vector3();
		this.lookTarget = new THREE.Vector3();
		this.knockDir = new THREE.Vector3();

		this.reset();
	}

	get position() {
		return this.object.position;
	}

	reset() {
		this.object.position.set(0, 0, 0);
		this.object.rotation.set(0, 0, 0);
		this.setOpacity(1);
	}

	update(delta, input, invulnerable) {
		input.getMoveVector(this.moveDir);
		if (this.moveDir.lengthSq() > 0) {
			this.moveDir.normalize();
			this.object.position.addScaledVector(this.moveDir, PLAYER_SPEED * delta);
			this.lookTarget.copy(this.object.position).add(this.moveDir);
			this.object.lookAt(this.lookTarget);
		}
		this.clampToArena();

		this.setOpacity(
			invulnerable ? Math.sin(performance.now() * 0.02) * 0.3 + 0.5 : 1,
		);
		updateBoneWiggles(this.wingWiggles, performance.now() * 0.001);
	}

	setOpacity(opacity) {
		for (const material of this.materials) material.opacity = opacity;
	}

	knockbackFrom(sourcePosition) {
		this.knockDir.copy(this.object.position).sub(sourcePosition);
		this.knockDir.y = 0;
		if (this.knockDir.lengthSq() < 0.0001) this.knockDir.set(1, 0, 0);
		this.knockDir.normalize();

		this.object.position.addScaledVector(this.knockDir, KNOCKBACK);
		this.clampToArena();
	}

	clampToArena() {
		this.object.position.x = THREE.MathUtils.clamp(
			this.object.position.x,
			-ARENA_HALF + CLAMP_MARGIN,
			ARENA_HALF - CLAMP_MARGIN,
		);
		this.object.position.z = THREE.MathUtils.clamp(
			this.object.position.z,
			-ARENA_HALF + CLAMP_MARGIN,
			ARENA_HALF - CLAMP_MARGIN,
		);
	}
}
