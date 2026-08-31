import { defineConfig } from 'vite';

// Relative base so the build works when served from any subpath
// (e.g. the platform's per-session sandbox preview URLs), not just domain root.
export default defineConfig({
	base: './',
});
