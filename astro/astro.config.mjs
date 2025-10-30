import { defineConfig } from 'astro/config';

// https://astro.build/config
// 
// ⚠️ IMPORTANT: GitHub Pages + Jekyll Issue ⚠️
// When deploying to GitHub Pages from the docs/ directory:
// 1. The build output MUST include a .nojekyll file in docs/
// 2. Without .nojekyll, Jekyll ignores _astro/ directory (underscore prefix)
// 3. This causes CSS/JS files in _astro/ to return 404 errors
// 4. Result: Site loads but has no styling (broken CSS)
// 
// The .nojekyll file is manually maintained in docs/ - DO NOT DELETE IT!
export default defineConfig({
  output: 'static',
  site: 'https://timeline.523.life',
  vite: {
    server: {
      fs: { allow: ['..'] },
    },
  },
});

