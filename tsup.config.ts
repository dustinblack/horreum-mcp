import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'build',
  sourcemap: true,
  external: ['@modelcontextprotocol/sdk'],
  clean: true,
});
