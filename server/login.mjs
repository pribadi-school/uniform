// Password-only sign-in (SERAGAM_PASSWORD). One shared password, no username: a small sign-in page sets a session cookie.
// The session token is derived from the password, so changing the password signs everyone out.
import {createHmac,createHash,timingSafeEqual} from 'node:crypto';

const cookieName='seragam_session',flagName='seragam_login',maxAge=60*60*24*30;
const same=(a,b)=>{const digest=v=>createHash('sha256').update(String(v)).digest();return timingSafeEqual(digest(a),digest(b));};
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export const loginCss=`*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:flex;flex-direction:column;padding:24px 16px 10vh;background:#f2f5f9;color:#1c2733;font-family:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
.login{width:100%;max-width:400px;margin:auto;padding:32px;background:#fff;border:1px solid rgba(18,35,60,.16);border-radius:16px;text-align:center}
.login img{display:block;width:64px;height:64px;margin:0 auto 16px;object-fit:contain}
h1{margin:0;color:#12233c;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-.02em}
.login>p{margin:6px 0 24px;color:#5a6472}
form{display:grid;text-align:left}
label{margin-bottom:10px;color:#12233c;font-size:13px;font-weight:600}
input{width:100%;min-height:44px;padding:10px 12px;border:1px solid rgba(18,35,60,.16);border-radius:8px;background:#fff;color:#12233c;font:inherit;font-size:16px}
input:focus-visible,button:focus-visible{outline:3px solid #0172bb;outline-offset:2px}
.error{margin:8px 0 0;color:#dc2626;font-size:13px}
button{margin-top:16px;min-height:44px;border:0;border-radius:8px;background:#0172bb;color:#fff;font:inherit;font-weight:600;cursor:pointer}
button:hover{background:color-mix(in srgb,#0172bb 80%,#12233c)}`;

function page(error){
 return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f2f5f9"><title>Masuk · Manajemen Seragam</title><link rel="icon" href="/favicon.png" type="image/png"><link rel="stylesheet" href="/login.css"></head><body><main class="login"><img src="/favicon.png" alt="Pribadi" width="64" height="64"><h1>Manajemen Seragam</h1><p>Masukkan password untuk membuka persediaan.</p><form method="post" action="/login"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus${error?' aria-invalid="true" aria-describedby="login-error"':''}>${error?`<p class="error" id="login-error" role="alert">${escape(error)}</p>`:''}<button type="submit">Masuk</button></form></main></body></html>`;
}

export function createLoginGate(password){
 const token=createHmac('sha256',password).update('seragam-session:v1').digest('hex');
 const cookies=req=>Object.fromEntries(String(req.headers.cookie||'').split(';').map(p=>p.trim().split('=')).filter(p=>p.length===2));
 const signedIn=req=>{const value=cookies(req)[cookieName];return !!value&&same(value,token);};
 const send=(res,status,headers,body)=>{res.writeHead(status,headers);res.end(body);};
 // Returns true when it answered the request itself; false lets the app handle it.
 return async function gate(req,res,url,origin,security){
  const secure=origin.startsWith('https:')?'; Secure':'',html={...security,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'};
  if(url.pathname==='/login.css'){send(res,200,{...security,'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store'},loginCss);return true;}
  if(url.pathname==='/favicon.png')return false;
  if(url.pathname==='/logout'){send(res,303,{...security,Location:'/','Set-Cookie':[`${cookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,`${flagName}=; Path=/; Max-Age=0; SameSite=Lax${secure}`]},'');return true;}
  if(url.pathname==='/login'&&req.method==='POST'){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){send(res,413,html,page('Permintaan terlalu besar.'));return true;}}
   const typed=new URLSearchParams(body).get('password')||'';
   if(!same(typed,password)){await new Promise(r=>setTimeout(r,1000));send(res,401,html,page('Password salah. Coba lagi.'));return true;}
   send(res,303,{...security,Location:'/','Set-Cookie':[`${cookieName}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`,`${flagName}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`]},'');return true;
  }
  if(signedIn(req)){if(url.pathname==='/login'){send(res,303,{...security,Location:'/'},'');return true;}return false;}
  if(url.pathname.startsWith('/api/')){send(res,401,{...security,'Content-Type':'application/json','Cache-Control':'no-store'},JSON.stringify({error:'Sesi berakhir. Masukkan password lagi.'}));return true;}
  // Hashed browser files hold no stock data; everything else (the app page) needs the password first.
  if(url.pathname.startsWith('/assets/'))return false;
  send(res,url.pathname==='/'||url.pathname==='/login'?200:401,html,page(''));return true;
 };
}
