import { build } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runBuild() {
  await build({
    root: __dirname,
    resolve: {
      alias: {
        'react': path.resolve(__dirname, 'node_modules', 'react'),
        'react-dom': path.resolve(__dirname, 'node_modules', 'react-dom'),
      }
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      minify: true,
      optimizeDeps: {
        include: ['lucide-react', 'zustand', 'react-markdown', 'remark-gfm']
      },
      rollupOptions: {
        input: path.resolve(__dirname, 'src/index.tsx'),
        output: { 
          dir: path.resolve(__dirname, 'dist'),
          format: 'iife',
          entryFileNames: 'index.js'
        },
        onwarn: (warning, warn) => {
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          warn(warning);
        }
      }
    }
  });
  
  console.log("Build complete: dist/index.js generated.");
}

runBuild();