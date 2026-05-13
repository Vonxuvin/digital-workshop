import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isWechat = mode === 'wechat';

  return {
    root: './',
    build: {
      outDir: isWechat ? 'dist-wechat' : 'dist',
      target: 'es2020',
      minify: false,
      sourcemap: true,
      lib: isWechat
        ? {
            entry: './src/main.ts',
            formats: ['cjs'],
            fileName: () => 'game.js',
          }
        : undefined,
      rollupOptions: isWechat
        ? {
            output: {
              inlineDynamicImports: true,
            },
          }
        : {
            output: {
              manualChunks(id) {
                if (id.includes('node_modules/pixi.js')) {
                  return 'vendor-pixi';
                }
                if (id.includes('node_modules/matter-js')) {
                  return 'vendor-matter';
                }
                if (id.includes('node_modules/gsap')) {
                  return 'vendor-gsap';
                }
                if (id.includes('node_modules')) {
                  return 'vendor-other';
                }
              },
            },
          },
    },
    server: {
      port: 3000,
      host: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  };
});
