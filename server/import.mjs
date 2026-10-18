// Loads a Cloudflare export into an unused SQLite database in one transaction.
export function requireEmptyDatabase(sqlite){
 const occupied=sqlite.prepare('SELECT count(*) AS n FROM history').get().n||sqlite.prepare('SELECT count(*) AS n FROM backups').get().n||sqlite.prepare('SELECT count(*) AS n FROM stock WHERE quantity<>0 OR revision<>0').get().n||sqlite.prepare('SELECT count(*) AS n FROM settings WHERE revision<>0').get().n;
 if(occupied)throw Error('Database must be unused. Import refused to protect existing records.');
}

export function importArchive(sqlite,archive,keys){
 const snapshot=archive.snapshot||archive;
 if(!snapshot||snapshot.schemaVersion!==2||!snapshot.stock||!Array.isArray(snapshot.history))throw Error('Invalid inventory backup');
 if(Object.keys(snapshot.stock).some(key=>!keys.includes(key))||Object.keys(archive.stockRevisions||{}).some(key=>!keys.includes(key)))throw Error('Unknown inventory keys');
 for(const quantity of Object.values(snapshot.stock))if(!Number.isSafeInteger(quantity)||quantity<0||quantity>1000000)throw Error('Invalid stock quantity');
 if(!Number.isSafeInteger(snapshot.lowLimit)||snapshot.lowLimit<0||snapshot.lowLimit>10000||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0)throw Error('Invalid settings in inventory backup');
 for(const revision of Object.values(archive.stockRevisions||{}))if(!Number.isSafeInteger(revision)||revision<0)throw Error('Invalid stock revision');
 sqlite.exec('BEGIN IMMEDIATE');
 try{
  requireEmptyDatabase(sqlite);
  // A first page visit can initialize all balances to zero. Upsert these unused rows.
  const insert=sqlite.prepare('INSERT INTO stock (key,quantity,revision) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET quantity=excluded.quantity,revision=excluded.revision');
  for(const key of keys)insert.run(key,snapshot.stock[key]??0,archive.stockRevisions?.[key]??0);
  const columns=['id','key','action','actor_id','actor','occurred_at','date','before_qty','after_qty','delta','student_name','student_class','staff_name','note','source'];
  const history=sqlite.prepare(`INSERT INTO history (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`);
  for(const row of snapshot.history)history.run(...columns.map(c=>row[c]??(['key','before_qty','after_qty','delta'].includes(c)?null:c==='source'?'app':'')));
  const backup=sqlite.prepare('INSERT INTO backups (id,created_at,actor,data) VALUES (?,?,?,?)');
  for(const row of archive.backups||[])backup.run(row.id,row.created_at,row.actor,typeof row.data==='string'?row.data:JSON.stringify(row.data));
  sqlite.prepare('INSERT INTO settings (id,low_limit,revision) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET low_limit=excluded.low_limit,revision=excluded.revision').run(snapshot.lowLimit,snapshot.revision);
  sqlite.exec('COMMIT');
  return {balances:keys.length,pieces:Object.values(snapshot.stock).reduce((n,q)=>n+q,0),history:snapshot.history.length,backups:(archive.backups||[]).length};
 }catch(error){sqlite.exec('ROLLBACK');throw error;}
}
