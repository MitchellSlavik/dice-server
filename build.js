const { build } = require('vite')

// libraries
const libraries = [
  {
    entry: './src/dice-server.ts',
    name: 'DiceServer',
    fileName: 'dice-server',
    formats: ['cjs']
  },
  {
    entry: './src/dice-client.ts',
    name: 'DiceClient',
    fileName: 'dice-client',
    formats: ['umd', 'iife']
  },
];

// build
libraries.forEach(async (libItem) => {
  await build({
    configFile: false,
    build: {
      lib: libItem,
      emptyOutDir: false,
      rollupOptions: {
        // other options
        
      },
    },
  });
});