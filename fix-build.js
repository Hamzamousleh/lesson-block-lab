import fs from 'fs';
const path = './dist/server/index.mjs';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  // Remove the import
  content = content.replace(/import\s*{\s*createRequire\s*}\s*from\s*["']node:module["'];?/g, '// Removed createRequire import');
  // Remove the __require definition
  content = content.replace(/var\s+__require\s*=\s*\/\*\s*#__PURE__\s*\*\/\s*\(\(\)\s*=>\s*createRequire\(import\.meta\.url\)\)\(\);?/g, 'var __require = undefined;');
  fs.writeFileSync(path, content);
  console.log('Fixed index.mjs');
} else {
  console.error('index.mjs not found');
}
