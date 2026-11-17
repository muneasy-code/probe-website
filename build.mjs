import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root,'dist');
const excluded = new Set([
  '.git','.github','.netlify','node_modules','dist','netlify','Upload',
  'package.json','package-lock.json','build.mjs','netlify.toml',
  'CMS-SETUP.txt','README.md','.env','.env.local'
]);
await mkdir(out,{recursive:true});
for (const item of await readdir(root,{withFileTypes:true})) {
  if (excluded.has(item.name) || item.name.startsWith('.env')) continue;
  if (!(item.isFile() || item.isDirectory())) continue;
  await cp(path.join(root,item.name),path.join(out,item.name),{
    recursive:item.isDirectory(), force:true,
    filter: src => {
      const name=path.basename(src);
      return !['.DS_Store','.gitkeep'].includes(name) && !name.startsWith('.env');
    }
  });
}
console.log('ProBe static site built with CMS function sources excluded.');
