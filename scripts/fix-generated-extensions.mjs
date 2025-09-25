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

  // Inject FETCH support if editing OpenAPI.ts
  if (filePath.endsWith(path.join('core', 'OpenAPI.ts'))) {
    if (!src.includes('FETCH?:')) {
      src = src.replace(
        /ENCODE_PATH\?: \(\(path: string\) => string\) \| undefined;\n\};/,
        `ENCODE_PATH?: ((path: string) => string) | undefined;\n    /** Optional custom fetch implementation injected by host */\n    FETCH?: (\n        input: RequestInfo | URL,\n        init?: RequestInit\n    ) => Promise<Response> | undefined;\n};`
      );
    }
    // Remove any FETCH: undefined initializer to satisfy exactOptionalPropertyTypes
    src = src.replace(/\n\s*FETCH:\s*undefined,\n/g, '\n');
    // Normalize FETCH type to Promise<Response> (no undefined)
    src = src.replace(
      /\)\s*=>\s*Promise<Response>\s*\|\s*undefined;/g,
      ') => Promise<Response>;'
    );
  }

  // Ensure request.ts uses OpenAPI.FETCH when available
  if (filePath.endsWith(path.join('core', 'request.ts'))) {
    if (!src.includes('const runtimeFetch = config.FETCH ?? fetch;')) {
      src = src.replace(
        /return await fetch\(url, request\);/,
        'const runtimeFetch = config.FETCH ?? fetch;\n    return await runtimeFetch(url, request);'
      );
    }
  }
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
