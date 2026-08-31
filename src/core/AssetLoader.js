import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const heroUrl = new URL('../assets/hero.glb', import.meta.url).href;
const enemyUrl = new URL('../assets/enemy.glb', import.meta.url).href;

const loader = new GLTFLoader();

export async function loadModels() {
	const [hero, enemy] = await Promise.all([
		loader.loadAsync(heroUrl),
		loader.loadAsync(enemyUrl),
	]);
	return { heroModel: hero.scene, enemyModel: enemy.scene };
}
