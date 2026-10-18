// Assembles the ready-to-run app for the `deploy` branch: the built files plus the small Node.js server.
// The running app needs no npm packages (dist/api.mjs is fully bundled), so cPanel only pulls and restarts.
// Usage: npm run build && node scripts/package-release.mjs <folder>   (the folder's .git is kept)
import {cpSync,existsSync,readdirSync,rmSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';

const target=resolve(process.argv[2]||'release-out');
if(!existsSync('dist/api.mjs')||!existsSync('dist/public/index.html'))throw Error('Run `npm run build` first.');
mkdirSync(target,{recursive:true});
for(const entry of readdirSync(target))if(entry!=='.git')rmSync(join(target,entry),{recursive:true,force:true});

const copy=(from,to=from)=>cpSync(from,join(target,to),{recursive:true});
copy('dist');
copy('app.cjs');
for(const file of ['index.mjs','database.mjs','login.mjs','import.mjs','cloudflare-export.mjs'])copy(join('server',file));
mkdirSync(join(target,'drizzle'));
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')))copy(join('drizzle',file));
copy(join('scripts','import-cloudflare.mjs'));
for(const file of readdirSync('release'))copy(join('release',file),file);
console.log(`Release assembled in ${target}`);
