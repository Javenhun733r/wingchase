import * as THREE from 'three';
import { ORB_COLLECT_DIST } from '../config.js';
import { flatDist, placeAwayFrom } from '../utils/spatial.js';

const geometry = new THREE.IcosahedronGeometry(0.35, 0);
const material = new THREE.MeshStandardMaterial({
	color: 0xffd166,
	emissive: 0xff9900,
	emissiveIntensity: 1.8,
	roughness: 0.3,
	metalness: 0.2,
});

export class OrbManager {
	constructor(scene) {
		this.scene = scene;
		this.orbs = [];
	}

	reset(playerPosition, orbCount) {
		this.clear();
		for (let i = 0; i < orbCount; i++) this.spawn(playerPosition);
	}

	clear() {
		for (const orb of this.orbs) this.scene.remove(orb);
		this.orbs.length = 0;
	}

	createMesh() {
		const mesh = new THREE.Mesh(geometry, material);
		mesh.userData.phase = Math.random() * Math.PI * 2;
		return mesh;
	}

	spawn(playerPosition) {
		const mesh = this.createMesh();
		placeAwayFrom(mesh, playerPosition, 4);
		mesh.position.y = 0.6;

		this.scene.add(mesh);
		this.orbs.push(mesh);
	}

	// Recreates orbs at exact saved positions instead of random placement, for
	// resuming a saved run.
	restoreOrbs(positions) {
		this.clear();
		for (const pos of positions) {
			const mesh = this.createMesh();
			mesh.position.set(pos.x, 0.6, pos.z);
			this.scene.add(mesh);
			this.orbs.push(mesh);
		}
	}

	update(delta) {
		const t = performance.now() * 0.002;
		for (const orb of this.orbs) {
			orb.rotation.y += delta * 2;
			orb.position.y = 0.6 + Math.sin(t + orb.userData.phase) * 0.15;
		}
	}

	collect(orb) {
		this.scene.remove(orb);
		this.orbs.splice(this.orbs.indexOf(orb), 1);
	}

	findCollected(playerPosition) {
		return (
			this.orbs.find(
				orb => flatDist(playerPosition, orb.position) < ORB_COLLECT_DIST,
			) ?? null
		);
	}
}
