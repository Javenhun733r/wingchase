import * as THREE from 'three';
import { ARENA_HALF, WALL_HEIGHT } from '../config.js';

export class SceneManager {
	constructor() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x0a0a1a);
		this.scene.fog = new THREE.Fog(0x0a0a1a, 22, 60);

		this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
		this.cameraOffset = new THREE.Vector3(0, 13, 15);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.1;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		document.body.appendChild(this.renderer.domElement);

		window.addEventListener('resize', () => this.onResize());

		this.buildLights();
		this.buildArena();

		this.cameraTarget = new THREE.Vector3();
	}

	onResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	buildLights() {
		this.scene.add(new THREE.HemisphereLight(0x8899ff, 0x0a0a1a, 0.7));

		const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
		dirLight.position.set(12, 22, 8);
		dirLight.castShadow = true;
		dirLight.shadow.mapSize.set(1024, 1024);
		dirLight.shadow.camera.left = -30;
		dirLight.shadow.camera.right = 30;
		dirLight.shadow.camera.top = 30;
		dirLight.shadow.camera.bottom = -30;
		this.scene.add(dirLight);
	}

	buildArena() {
		const floor = new THREE.Mesh(
			new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
			new THREE.MeshStandardMaterial({ color: 0x14142a, roughness: 0.9 }),
		);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		this.scene.add(floor);

		this.scene.add(new THREE.GridHelper(ARENA_HALF * 2, 48, 0x33334d, 0x1e1e36));

		const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.8 });
		const wallGeometryNS = new THREE.BoxGeometry(ARENA_HALF * 2 + 2, WALL_HEIGHT, 1);
		const wallGeometryEW = new THREE.BoxGeometry(1, WALL_HEIGHT, ARENA_HALF * 2 + 2);

		const addWall = (geometry, x, z) => {
			const wall = new THREE.Mesh(geometry, wallMaterial);
			wall.position.set(x, WALL_HEIGHT / 2, z);
			wall.receiveShadow = true;
			this.scene.add(wall);
		};
		addWall(wallGeometryNS, 0, -ARENA_HALF);
		addWall(wallGeometryNS, 0, ARENA_HALF);
		addWall(wallGeometryEW, -ARENA_HALF, 0);
		addWall(wallGeometryEW, ARENA_HALF, 0);
	}

	setInitialCameraPosition(target) {
		this.camera.position.copy(target).add(this.cameraOffset);
	}

	updateCamera(target, delta) {
		this.cameraTarget.copy(target).add(this.cameraOffset);
		this.camera.position.lerp(this.cameraTarget, 1 - Math.pow(0.001, delta));
		this.camera.lookAt(target.x, target.y + 0.5, target.z);
	}

	render() {
		this.renderer.render(this.scene, this.camera);
	}
}
