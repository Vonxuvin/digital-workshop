import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isWechat = mode === 'wechat';

  return {
    root: './',
    build: {
      outDir: isWechat ? 'dist-wechat' : 'dist',
      target: 'es2020',
      minify: isWechat ? 'terser' : false,
      sourcemap: !isWechat,
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
        : {},
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
