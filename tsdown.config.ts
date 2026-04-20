import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli/index.ts',
    mcp: 'src/mcp/server.ts'
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['@modelcontextprotocol/sdk', '@pdf-lib/fontkit', 'commander', 'pdf-lib', 'zod']
});
