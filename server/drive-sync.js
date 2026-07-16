// drive-sync.js v4
// Tính năng mới:
// 1. Auto-replace layer khi file cùng tên nhưng fileId khác
// 2. Sync tên folder → tự cập nhật tên design

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const SA          = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}');
const FOLDER_ID   = process.env.DRIVE_FOLDER_ID || '16tTW4Vjcxb8ZnHQOj50yimQKPWn1gYUT';
const ADMIN_PW    = process.env.ADMIN_PASSWORD  || '';
const PORT        = 10000;
const SYNCED_FILE = path.join(process.env.STORAGE_DIR||'/data','drive_synced.json');
const TMP_DIR     = '/tmp/lewlew_drive_sync';

// ── JWT Auth ──────────────────────────────────────────────
function b64u(buf){ return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }

async function getToken(){
  const now=Math.floor(Date.now()/1000);
  const hdr=b64u(Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})));
  const pay=b64u(Buffer.from(JSON.stringify({
    iss:SA.client_email, scope:'https://www.googleapis.com/auth/drive.readonly',
    aud:'https://oauth2.googleapis.com/token', exp:now+3600, iat:now
  })));
  const sign=crypto.createSign('RSA-SHA256');
  sign.update(`${hdr}.${pay}`);
  const jwt=`${hdr}.${pay}.${b64u(sign.sign(SA.private_key))}`;
  const body=`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
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

function driveDownload(token,fileId,destPath){
  return new Promise((ok,fail)=>{
    const file=fs.createWriteStream(destPath);
    https.get({hostname:'www.googleapis.com',
      path:`/drive/v3/files/${fileId}?alt=media`,
      headers:{'Authorization':`Bearer ${token}`}
    },res=>{
      if(res.statusCode>=400){fail(new Error('Download failed: '+res.statusCode));return;}
      res.pipe(file);
      file.on('finish',()=>{file.close();ok(destPath);});
    }).on('error',fail);
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

function deleteLayer(designId,layerId){
  return apiReq('DELETE',`/admin/designs/${encodeURIComponent(designId)}/layers/${encodeURIComponent(layerId)}`);
}

// ── Parse tên file ────────────────────────────────────────
function parseFileName(fname){
  const base=fname.replace(/\.(png|jpg|jpeg)$/i,'');
  const m=base.match(/^(front|back)-([^-]+)-(.+)$/i);
  if(!m) return null;
  return { side:m[1].toLowerCase(), zoneSlug:m[2].toLowerCase(),
           zoneName:m[2].replace(/-/g,' '), layerName:m[3].replace(/-/g,' ') };
}

// ── Synced state ──────────────────────────────────────────
// Lưu thêm: {stateKey, folderId→designId mapping, layer fileId mapping}
function loadSynced(){ try{return JSON.parse(fs.readFileSync(SYNCED_FILE,'utf8'));}catch{return {};} }
function saveSynced(d){ fs.writeFileSync(SYNCED_FILE,JSON.stringify(d,null,2)); }

// ── Main ──────────────────────────────────────────────────
async function sync(){
  if(!SA.private_key){ console.log('[DriveSync] no service account, skip'); return; }
  console.log('[DriveSync] start', new Date().toISOString());
  fs.mkdirSync(TMP_DIR,{recursive:true});

  let token;
  try{ token=await getToken(); }
  catch(e){ console.error('[DriveSync] auth fail:',e.message||e); return; }

  const synced=loadSynced();

  // Map: folderId → designId (lưu để track khi folder đổi tên)
  if(!synced._folderDesignMap) synced._folderDesignMap={};
  // Map: folderId+fileName → {fileId, layerId} (để detect replace)
  if(!synced._layerFileMap) synced._layerFileMap={};

  const allDesigns=await apiReq('GET','/admin/designs').catch(()=>[]) || [];
  const designById={};
  const designByName={};
  for(const d of (Array.isArray(allDesigns)?allDesigns:[])){
    designById[d.id]=d;
    designByName[d.name]=d;
  }

  const folders=await driveList(token,FOLDER_ID).catch(()=>[]);

  for(const df of folders){
    if(df.mimeType!=='application/vnd.google-apps.folder') continue;
    const folderName=df.name;
    const folderId=df.id;

    const files=await driveList(token,folderId).catch(()=>[]);
    const pngs=files.filter(f=>f.name.match(/\.(png|jpg|jpeg)$/i));
    if(!pngs.length){ console.log(`[DriveSync] skip empty: ${folderName}`); continue; }

    // State key gồm cả tên folder để detect rename
    const stateKey=folderName+'::'+pngs.map(f=>f.id+f.modifiedTime).sort().join('|');
    if(synced[folderId]===stateKey){ console.log(`[DriveSync] no change: ${folderName}`); continue; }

    console.log(`[DriveSync] syncing: ${folderName} (${pngs.length} files)`);

    // ── TÍNH NĂNG 2: Sync tên folder → cập nhật tên design ──
    let design=null;
    const mappedDesignId=synced._folderDesignMap[folderId];

    if(mappedDesignId && designById[mappedDesignId]){
      design=designById[mappedDesignId];
      // Kiểm tra tên có thay đổi không
      if(design.name !== folderName){
        console.log(`  [Rename] "${design.name}" → "${folderName}"`);
        await apiReq('PATCH',`/admin/designs/${encodeURIComponent(design.id)}`,{name:folderName}).catch(()=>{});
        design={...design, name:folderName};
        designById[design.id]=design;
        designByName[folderName]=design;
      }
    } else {
      // Tìm theo tên
      design=designByName[folderName];
    }

    // Tạo design mới nếu chưa có
    if(!design){
      const res=await apiReq('POST','/admin/designs',{name:folderName}).catch(()=>null);
      const list=Array.isArray(res)?res:[];
      design=list.find(d=>d.name===folderName);
      if(!design){ console.error(`[DriveSync] cannot create: ${folderName}`); continue; }
      designById[design.id]=design;
      designByName[folderName]=design;
    }

    // Lưu mapping folderId → designId
    synced._folderDesignMap[folderId]=design.id;

    // Build zoneMap
    const zoneMap={};
    for(const f of pngs){
      const parsed=parseFileName(f.name);
      if(!parsed) continue;
      const slug=`${parsed.side}-${parsed.zoneSlug}`;
      if(!zoneMap[slug]) zoneMap[slug]={id:`zone_${slug}`,name:parsed.zoneName,side:parsed.side,cx:0.50,cy:0.37,w:0.15};
    }
    const printZones=Object.values(zoneMap);
    if(printZones.length){
      await apiReq('PATCH',`/admin/designs/${encodeURIComponent(design.id)}`,{printZones}).catch(()=>{});
    }

    // Reload design để biết layers hiện tại
    const allD=await apiReq('GET','/admin/designs').catch(()=>[]);
    const cur=(Array.isArray(allD)?allD:[]).find(d=>d.id===design.id);
    // Map: layerKey → layerId (để xóa khi replace)
    const existingLayerMap={};
    for(const l of (cur?.layers||[])){
      const key=`${l.zoneId}::${l.name}`;
      existingLayerMap[key]=l.id;
    }

    // Layer file map cho folder này
    if(!synced._layerFileMap[folderId]) synced._layerFileMap[folderId]={};
    const lfMap=synced._layerFileMap[folderId];

    // Upload từng file
    for(const f of pngs){
      const parsed=parseFileName(f.name);
      if(!parsed){ console.log(`  skip bad name: ${f.name}`); continue; }
      const slug=`${parsed.side}-${parsed.zoneSlug}`;
      const zone=zoneMap[slug];
      const layerKey=`${zone.id}::${parsed.layerName}`;
      const savedFileId=lfMap[f.name];

      // ── TÍNH NĂNG 1: Auto-replace khi fileId thay đổi ──
      if(savedFileId && savedFileId!==f.id && existingLayerMap[layerKey]){
        console.log(`  [Replace] ${f.name} (fileId changed)`);
        // Xóa layer cũ
        await deleteLayer(design.id, existingLayerMap[layerKey]).catch(()=>{});
        delete existingLayerMap[layerKey];
      } else if(existingLayerMap[layerKey] && savedFileId===f.id){
        console.log(`  skip exists: ${parsed.layerName}`);
        continue;
      }

      // Download + upload
      const tmpPNG=path.join(TMP_DIR,`${f.id}.png`);
      console.log(`  upload: ${f.name} → zone=${zone.name}`);
      try{
        await driveDownload(token,f.id,tmpPNG);
        const buf=fs.readFileSync(tmpPNG);
        await uploadLayer(design.id,parsed.layerName,parsed.side,zone.id,buf);
        lfMap[f.name]=f.id; // lưu fileId mới
        try{fs.unlinkSync(tmpPNG);}catch{}
      }catch(e){
        console.error(`  error: ${e.message}`);
      }
    }

    synced[folderId]=stateKey;
    synced._layerFileMap[folderId]=lfMap;
    saveSynced(synced);
    console.log(`[DriveSync] done: ${folderName}`);
  }
  console.log('[DriveSync] finished');
}

module.exports={sync};
if(require.main===module) sync().catch(console.error);
