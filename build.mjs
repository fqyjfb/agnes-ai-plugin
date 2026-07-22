import { build } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function copyFontResources() {
  const sourceDir = path.resolve(__dirname, 'src', 'assets', 'fonts');
  const destDir = path.resolve(__dirname, 'dist', 'tools', 'ai-chat', 'fonts');
  
  if (fs.existsSync(sourceDir)) {
    fs.cpSync(sourceDir, destDir, { recursive: true });
    console.log('Font resources copied to dist/tools/ai-chat/fonts');
  }
}

async function runBuild() {
  await build({
    root: __dirname,
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      minify: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/index.tsx'),
        output: { 
          dir: path.resolve(__dirname, 'dist'),
          format: 'iife',
          entryFileNames: 'index.js'
        }
      }
    }
  });
  
  await copyFontResources();
  
  console.log("Build complete: dist/index.js generated.");
}

runBuild();