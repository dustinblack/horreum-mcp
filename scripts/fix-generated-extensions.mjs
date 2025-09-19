import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/horreum/generated');
const exts = ['models', 'services'];

function fixFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  // Append .js to relative imports without extensions for NodeNext
  src = src.replace(/from\s+'((?:\.\.\/|\.\/)[^']+?)'(?!\.)/g, (m, p1) => {
    if (p1.endsWith('.js') || p1.endsWith('.json')) return m;
    return `from '${p1}.js'`;
  });
  fs.writeFileSync(filePath, src, 'utf8');
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && p.endsWith('.ts')) fixFile(p);
  }
}

if (fs.existsSync(root)) walk(root);
console.log('Fixed import extensions in generated client.');


