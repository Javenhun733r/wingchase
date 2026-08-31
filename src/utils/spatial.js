import * as THREE from 'three';
import { ARENA_HALF } from '../config.js';

export function flatDist(a, b) {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

function randomArenaPoint(margin = 3) {
	const span = (ARENA_HALF - margin) * 2;
	return new THREE.Vector3(
		THREE.MathUtils.randFloatSpread(span),
		0,
		THREE.MathUtils.randFloatSpread(span),
	);
}

export function placeAwayFrom(obj, referencePosition, minDist) {
	let pos = randomArenaPoint();
	let attempts = 0;
	while (flatDist(pos, referencePosition) < minDist && attempts < 20) {
		pos = randomArenaPoint();
		attempts++;
	}
	obj.position.copy(pos);
}
