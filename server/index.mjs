import {createServer} from 'node:http';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {openDatabase,projectRoot} from './database.mjs';
import {createLoginGate} from './login.mjs';

const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"};
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png',webp:'image/webp',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2'};
const maxBody=3000000;

// SERAGAM_ORIGIN pins the public address (e.g. https://uniform.pribadidepok.sch.id) when a proxy hides it.
function requestOrigin(req){
 if(process.env.SERAGAM_ORIGIN)return new URL(process.env.SERAGAM_ORIGIN).origin;
 const proto=String(req.headers['x-forwarded-proto']||'http').split(',')[0].trim();
 return `${proto==='https'?'https':'http'}://${req.headers.host||'localhost'}`;
}

export async function startServer({port=Number(process.env.PORT||3000),host=process.env.HOST,databasePath,apiFile=resolve(projectRoot,'dist/api.mjs'),publicRoot=resolve(projectRoot,'dist/public'),password=process.env.SERAGAM_PASSWORD}={}){
 if(!existsSync(apiFile))throw Error('Build missing. Run `npm run build` first.');
 const api=await import(pathToFileURL(apiFile).href);
 const {sqlite,DB,databasePath:path}=openDatabase(databasePath);api.setDatabase(DB);
 const cache=new Map(),gate=password?createLoginGate(password):null;
 const server=createServer(async(req,res)=>{
  try{
   const origin=requestOrigin(req),url=new URL(req.url||'/',origin);
   // Optional password-only sign-in; it answers the request itself when no valid session is present.
   if(gate&&await gate(req,res,url,origin,security))return;
   if(url.pathname.startsWith('/api/')){
    const method=req.method||'GET';
    if(!['GET','POST'].includes(method)){res.writeHead(405,{...security,Allow:'GET, POST','Content-Type':'application/json'});res.end(JSON.stringify({error:'Metode tidak didukung.'}));return;}
    // oai-* identity headers came from the old hosting platform; never accept them from clients.
    const headers=new Headers();for(const [key,value] of Object.entries(req.headers)){if(value&&!key.startsWith('oai-'))headers.set(key,Array.isArray(value)?value.join(','):value);}
    let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length<=maxBody)chunks.push(chunk);}
    if(length>maxBody){res.writeHead(413,{...security,'Content-Type':'application/json'});res.end(JSON.stringify({error:'Data terlalu besar.'}));return;}
    const request=new Request(url,{method,headers,...(method==='POST'?{body:Buffer.concat(chunks)}:{})});
    const response=await (method==='GET'?api.GET(request):api.POST(request));
    let payload=Buffer.from(await response.arrayBuffer());const reply={...security,...Object.fromEntries(response.headers),Vary:'Accept-Encoding'};
    // The state snapshot is mostly repeated JSON keys: gzip shrinks it about 13x, and every open page asks for it every 15 seconds.
    if(payload.length>1024&&/\bgzip\b/.test(req.headers['accept-encoding']||'')&&String(reply['content-type']||'').includes('json')){payload=gzipSync(payload);reply['Content-Encoding']='gzip';delete reply['content-length'];}
    res.writeHead(response.status,reply);res.end(payload);return;
   }
   if(!['GET','HEAD'].includes(req.method||'GET')){res.writeHead(405,{...security,Allow:'GET, HEAD'});res.end();return;}
   const pathname=decodeURIComponent(url.pathname),file=resolve(publicRoot,'.'+(pathname==='/'?'/index.html':pathname));
   if(pathname.split('/').some(part=>part.startsWith('.'))||!file.startsWith(publicRoot+sep)||!statSync(file,{throwIfNoEntry:false})?.isFile()){res.writeHead(404,security);res.end('Tidak ditemukan');return;}
   let asset=cache.get(file);
   // Only hashed /assets/ files are cached; index.html is re-read so a rebuild shows up without a restart.
   if(!asset){const body=readFileSync(file),extension=file.split('.').pop();asset={body,type:types[extension]||'application/octet-stream',gzip:['html','css','js','svg'].includes(extension)?gzipSync(body):null};if(pathname.startsWith('/assets/'))cache.set(file,asset);}
   const compressed=asset.gzip&&/\bgzip\b/.test(req.headers['accept-encoding']||''),body=compressed?asset.gzip:asset.body;
   res.writeHead(200,{...security,'Content-Type':asset.type,'Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-store',Vary:'Accept-Encoding',...(compressed?{'Content-Encoding':'gzip'}:{}),'Content-Length':body.length});
   res.end(req.method==='HEAD'?undefined:body);
  }catch(error){
   console.error('Application error:',error instanceof Error?error.message:error);
   if(!res.headersSent)res.writeHead(500,{...security,'Content-Type':'application/json'});
   res.end(JSON.stringify({error:'Perubahan belum disimpan. Muat ulang dan coba kembali.'}));
  }
 });
 server.requestTimeout=120000;
 server.on('close',()=>sqlite.close());
 await new Promise(done=>server.listen(port,host,done));
 const address=server.address();
 console.log(`Manajemen Seragam running on port ${typeof address==='object'&&address?address.port:port}. Database: ${path}`);
 if(!password)console.warn('SERAGAM_PASSWORD is not set: anyone who can reach this address can change stock.');
 return server;
}
