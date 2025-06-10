import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true, // gera os arquivos .d.ts
  sourcemap: true,
  clean: true,
}) 