// Read-only copy of the old Cloudflare deployment: stock, full history, settings and saved backups.
export const defaultUpstream='https://uniform.pribadisch.workers.dev';

export async function exportCloudflare(fetchImpl=globalThis.fetch,upstream=defaultUpstream){
 const get=async path=>{
  const response=await fetchImpl(upstream+'/api/'+path,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(40000)});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Cloudflare export failed. No inventory was imported.');
  return response.json();
 };
 for(let attempt=0;attempt<3;attempt++){
  const before=await get('state'),snapshot=await get('backup');
  if(snapshot.schemaVersion!==2||!snapshot.stock||!Array.isArray(snapshot.history)||!Array.isArray(before.backups))throw Error('Invalid Cloudflare export.');
  const backups=[];
  for(const row of before.backups)backups.push({...row,data:await get('backup/'+encodeURIComponent(row.id))});
  const after=await get('state');
  const sameStock=Object.keys(snapshot.stock).every(key=>snapshot.stock[key]===before.stock?.[key]?.quantity&&snapshot.stock[key]===after.stock?.[key]?.quantity&&before.stock[key].revision===after.stock[key].revision);
  if(snapshot.revision!==before.revision||snapshot.revision!==after.revision||!sameStock||JSON.stringify(before.backups)!==JSON.stringify(after.backups))continue;
  return {schemaVersion:1,source:upstream,snapshot,stockRevisions:Object.fromEntries(Object.entries(before.stock).map(([key,row])=>[key,row.revision])),backups};
 }
 throw Error('Cloudflare inventory changed during export. Pause data entry, then run the import again.');
}
