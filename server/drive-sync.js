// drive-sync.js v2 — sync Google Drive → LewLew
// Cấu trúc: ROOT/ TenHinhIn/ {front|back}-{ten-vung}-{ten-layer}.png
// Ví dụ: front-nguc-than-chinh.png → mặt trước, vùng "nguc", layer "than chinh"

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const SA           = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}');
const FOLDER_ID    = process.env.DRIVE_FOLDER_ID || '16tTW4Vjcxb8ZnHQOj50yimQKPWn1gYUT';
const ADMIN_PW     = process.env.ADMIN_PASSWORD  || '';
const PORT         = 10000;
const SYNCED_FILE  = path.join(process.env.STORAGE_DIR||'/data','drive_synced.json');

// ── JWT Auth ──────────────────────────────────────────────
function b64u(buf){ return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }

async function getToken(){
  const now=Math.floor(Date.now()/1000);
  const hdr  = b64u(Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})));
  const pay  = b64u(Buffer.from(JSON.stringify({
    iss:SA.client_email, scope:'https://www.googleapis.com/auth/drive.readonly',
    aud:'https://oauth2.googleapis.com/token', exp:now+3600, iat:now
  })));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${hdr}.${pay}`);
  const jwt = `${hdr}.${pay}.${b64u(sign.sign(SA.private_key))}`;
  const body= `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  return new Promise((ok,fail)=>{
    const r=https.request({hostname:'oauth2.googleapis.com',path:'/token',method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':body.length}
    },res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{const j=JSON.parse(d);j.access_token?ok(j.access_token):fail(j);});});
    r.on('error',fail);r.write(body);r.end();
  });
}

// ── Drive helpers ─────────────────────────────────────────
function driveList(token,parentId){
  return new Promise((ok,fail)=>{
    const q=encodeURIComponent(`'${parentId}' in parents and trashed=false`);
    https.get({hostname:'www.googleapis.com',
      path:`/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime)&pageSize=500`,
      headers:{'Authorization':`Bearer ${token}`}
    },res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{ok(JSON.parse(d).files||[]);}catch(e){fail(e);}});}).on('error',fail);
  });
}

function driveDownload(token,fileId){
  return new Promise((ok,fail)=>{
    const req=https.get({hostname:'www.googleapis.com',
      path:`/drive/v3/files/${fileId}?alt=media`,
      headers:{'Authorization':`Bearer ${token}`}
    },res=>{
      const chunks=[];
      res.on('data',c=>chunks.push(c));
      res.on('end',()=>ok(Buffer.concat(chunks)));
    });
    req.on('error',fail);
  });
}

// ── Local API ─────────────────────────────────────────────
function apiReq(method,p,body){
  return new Promise((ok,fail)=>{
    const b=body?JSON.stringify(body):null;
    const r=http.request({hostname:'localhost',port:PORT,path:`/api${p}`,method,
      headers:{'x-admin-password':ADMIN_PW,'Content-Type':'application/json',
        ...(b?{'Content-Length':Buffer.byteLength(b)}:{})}
    },res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{ok(JSON.parse(d));}catch{ok({});} });});
    r.on('error',fail);if(b)r.write(b);r.end();
  });
}

function uploadLayer(designId,name,side,zoneId,pngBuf){
  return new Promise((ok,fail)=>{
    const bnd='LewLew'+Date.now();
    const head=Buffer.from([
      `--${bnd}`,`Content-Disposition: form-data; name="name"`,``,name,
      `--${bnd}`,`Content-Disposition: form-data; name="defaultInkId"`,``,`black`,
      `--${bnd}`,`Content-Disposition: form-data; name="side"`,``,side,
      `--${bnd}`,`Content-Disposition: form-data; name="zoneId"`,``,zoneId,
      `--${bnd}`,`Content-Disposition: form-data; name="png"; filename="${name}.png"`,`Content-Type: image/png`,``
    ].join('\r\n')+'\r\n');
    const tail=Buffer.from(`\r\n--${bnd}--\r\n`);
    const body=Buffer.concat([head,pngBuf,tail]);
    const r=http.request({hostname:'localhost',port:PORT,
      path:`/api/admin/designs/${encodeURIComponent(designId)}/layers`,method:'POST',
      headers:{'Content-Type':`multipart/form-data; boundary=${bnd}`,
        'x-admin-password':ADMIN_PW,'Content-Length':body.length}
    },res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{ok(JSON.parse(d));}catch{ok({});} });});
    r.on('error',fail);r.write(body);r.end();
  });
}

// ── Parse tên file ────────────────────────────────────────
// front-nguc-than-chinh.png → {side:'front', zoneSlug:'nguc', zoneName:'nguc', layerName:'than chinh'}
function parseFileName(fname){
  const base=fname.replace(/\.(png|jpg|jpeg)$/i,'');
  const m=base.match(/^(front|back)-([^-]+)-(.+)$/i);
  if(!m) return null;
  return {
    side:     m[1].toLowerCase(),
    zoneSlug: m[2].toLowerCase(),
    zoneName: m[2].replace(/-/g,' '),
    layerName:m[3].replace(/-/g,' ')
  };
}

// ── Synced state ──────────────────────────────────────────
function loadSynced(){ try{return JSON.parse(fs.readFileSync(SYNCED_FILE,'utf8'));}catch{return {};} }
function saveSynced(d){ fs.writeFileSync(SYNCED_FILE,JSON.stringify(d,null,2)); }

// ── Main ──────────────────────────────────────────────────
async function sync(){
  if(!SA.private_key){ console.log('[DriveSync] no service account, skip'); return; }
  console.log('[DriveSync] start', new Date().toISOString());

  let token;
  try{ token=await getToken(); }
  catch(e){ console.error('[DriveSync] auth fail:',e.message||e); return; }

  const synced   = loadSynced();
  const designs  = await apiReq('GET','/admin/designs').catch(()=>[]) || [];
  const designMap= {};
  for(const d of (Array.isArray(designs)?designs:[])) designMap[d.name]=d;

  // List design folders
  const folders = await driveList(token, FOLDER_ID).catch(()=>[]);

  for(const df of folders){
    if(df.mimeType!=='application/vnd.google-apps.folder') continue;
    const designName=df.name;

    // List PNG files trong folder
    const files=await driveList(token,df.id).catch(()=>[]);
    const pngs=files.filter(f=>f.name.match(/\.(png|jpg|jpeg)$/i));
    if(!pngs.length){ console.log(`[DriveSync] skip empty: ${designName}`); continue; }

    // State hash = danh sách file id + modifiedTime
    const stateKey=pngs.map(f=>f.id+f.modifiedTime).sort().join('|');
    if(synced[df.id]===stateKey){ console.log(`[DriveSync] no change: ${designName}`); continue; }

    console.log(`[DriveSync] syncing: ${designName} (${pngs.length} files)`);

    // Tạo design nếu chưa có
    let design=designMap[designName];
    if(!design){
      const res=await apiReq('POST','/admin/designs',{name:designName}).catch(()=>null);
      const list=Array.isArray(res)?res:[];
      design=list.find(d=>d.name===designName);
      if(!design){ console.error(`[DriveSync] cannot create design: ${designName}`); continue; }
      designMap[designName]=design;
    }

    // Parse zones từ tên file
    const zoneMap={}; // slug → {id,name,side}
    for(const pf of pngs){
      const parsed=parseFileName(pf.name);
      if(!parsed) continue;
      const slug=`${parsed.side}-${parsed.zoneSlug}`;
      if(!zoneMap[slug]) zoneMap[slug]={
        id:`zone_${slug}`, name:parsed.zoneName, side:parsed.side, cx:0.50, cy:0.37, w:0.15
      };
    }

    // Lưu printZones
    const printZones=Object.values(zoneMap);
    if(printZones.length){
      await apiReq('PATCH',`/admin/designs/${encodeURIComponent(design.id)}`,{printZones}).catch(()=>{});
    }

    // Reload design để biết layers đã có
    const allDesigns=await apiReq('GET','/admin/designs').catch(()=>[]);
    const cur=(Array.isArray(allDesigns)?allDesigns:[]).find(d=>d.id===design.id);
    const existingLayers=new Set((cur?.layers||[]).map(l=>`${l.zoneId}::${l.name}`));

    // Upload từng file
    for(const pf of pngs){
      const parsed=parseFileName(pf.name);
      if(!parsed){ console.log(`  skip (bad name): ${pf.name}`); continue; }
      const slug=`${parsed.side}-${parsed.zoneSlug}`;
      const zone=zoneMap[slug];
      const key=`${zone.id}::${parsed.layerName}`;
      if(existingLayers.has(key)){ console.log(`  skip exists: ${parsed.layerName}`); continue; }

      console.log(`  upload: ${pf.name} → zone=${zone.name} side=${zone.side}`);
      const buf=await driveDownload(token,pf.id).catch(e=>{console.error('  dl err:',e.message);return null;});
      if(!buf||buf.length<100){ console.log('  skip empty buffer'); continue; }

      await uploadLayer(design.id,parsed.layerName,parsed.side,zone.id,buf)
        .catch(e=>console.error('  upload err:',e.message));
    }

    synced[df.id]=stateKey;
    saveSynced(synced);
    console.log(`[DriveSync] done: ${designName}`);
  }

  console.log('[DriveSync] finished');
}

module.exports={sync};
if(require.main===module) sync().catch(console.error);
