const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/dice-server.ts'),
      name: 'dice-server',
      fileName: (format) => `dice-server.${format}.js`,
    },
    rollupOptions: {
        lib: true,
    }
  }
});