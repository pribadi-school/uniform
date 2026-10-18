// One-time copy of the Cloudflare inventory into an empty SQLite database. Run after `npm run build`, with the app stopped.
import {existsSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openDatabase,projectRoot} from '../server/database.mjs';
import {requireEmptyDatabase,importArchive} from '../server/import.mjs';
import {exportCloudflare,defaultUpstream} from '../server/cloudflare-export.mjs';

const apiFile=resolve(projectRoot,'dist/api.mjs');
if(!existsSync(apiFile))throw Error('Build missing. Run `npm run build` first.');
const {allKeys}=await import(pathToFileURL(apiFile).href);
const upstream=process.argv[2]||defaultUpstream;
const {sqlite,databasePath}=openDatabase();
try{
 requireEmptyDatabase(sqlite);
 console.log(`Downloading stock, full history and saved backups from ${upstream} ...`);
 const archive=await exportCloudflare(globalThis.fetch,upstream);
 const file=join(dirname(databasePath),`cloudflare-export-${Date.now()}.json`);
 writeFileSync(file,JSON.stringify(archive),{mode:0o600,flag:'wx'});
 const result=importArchive(sqlite,archive,allKeys);
 console.log(`Imported ${result.pieces} pcs across ${result.balances} sizes, ${result.history} history entries and ${result.backups} backups into ${databasePath}.`);
 console.log(`Copy of the Cloudflare data saved to ${file}. Start or restart the app now.`);
}finally{sqlite.close();}
