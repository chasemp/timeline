import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://timeline.523.life',
  vite: {
    server: {
      fs: { allow: ['..'] },
    },
  },
});

