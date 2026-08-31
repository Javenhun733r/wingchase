import * as THREE from 'three';

const PREVENT_DEFAULT_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
const ACTIVATE_KEYS = new Set(['Space', 'Enter', 'KeyR']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);

export class InputManager {
	constructor() {
		this.keys = new Set();
		this.onActivate = null;
		this.onPauseToggle = null;

		window.addEventListener('keydown', (e) => this.handleKeyDown(e));
		window.addEventListener('keyup', (e) => this.keys.delete(e.code));

		// The browser stops delivering keyup events once the window loses focus
		// (e.g. alt-tabbing to another app), which would otherwise leave a held
		// movement key "stuck" and make the player keep sliding after refocus.
		window.addEventListener('blur', () => this.keys.clear());
	}

	handleKeyDown(e) {
		this.keys.add(e.code);
		if (PREVENT_DEFAULT_KEYS.has(e.code)) e.preventDefault();
		if (this.onActivate && ACTIVATE_KEYS.has(e.code)) this.onActivate();
		if (this.onPauseToggle && PAUSE_KEYS.has(e.code)) this.onPauseToggle();
	}

	getMoveVector(target = new THREE.Vector3()) {
		const ix = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
			(this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
		const iz = (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) -
			(this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
		return target.set(ix, 0, iz);
	}
}
