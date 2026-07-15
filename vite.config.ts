import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	optimizeDeps: {
		include: ['leaflet']
	},
	ssr: {
		noExternal: ['leaflet']
	},
	server: {
		allowedHosts: ['t4bs3n.justark.my.id']
	}
});
