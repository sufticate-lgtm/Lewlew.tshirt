// drive-sync.js v3 — sync Google Drive → LewLew
// Hỗ trợ: PNG/JPG (front-zone-layer.png) + PSD (front-zone.psd → tách layer tự động)

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');

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
  const hdr = b64u(Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})));
  const pay = b64u(Buffer.from(JSON.stringify({
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

function driveDownload(token,fileId,destPath){
  return new Promise((ok,fail)=>{
    const file=fs.createWriteStream(destPath);
    https.get({hostname:'www.googleapis.com',
      path:`/drive/v3/files/${fileId}?alt=media`,
      headers:{'Authorization':`Bearer ${token}`}
    },res=>{
      if(res.statusCode>=400){fail(new Error('Download failed: '+res.statusCode));return;}
      res.pipe(file);
      file.on('finish',()=>{ file.close(); ok(destPath); });
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

function uploadLayer(designId,name,side,zoneId,pngPath){
  return new Promise((ok,fail)=>{
    const pngBuf=fs.readFileSync(pngPath);
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

// ── Parse tên file PNG ────────────────────────────────────
// front-nguc-than-chinh.png → {side, zoneSlug, zoneName, layerName}
function parseFileName(fname){
  const base=fname.replace(/\.(png|jpg|jpeg)$/i,'');
  const m=base.match(/^(front|back)-([^-]+)-(.+)$/i);
  if(!m) return null;
  return { side:m[1].toLowerCase(), zoneSlug:m[2].toLowerCase(),
           zoneName:m[2].replace(/-/g,' '), layerName:m[3].replace(/-/g,' ') };
}

// Parse tên file PSD: front-nguc.psd → {side, zoneSlug, zoneName}
function parsePSDName(fname){
  const base=fname.replace(/\.psd$/i,'');
  const m=base.match(/^(front|back)-(.+)$/i);
  if(!m) return null;
  return { side:m[1].toLowerCase(), zoneSlug:m[2].toLowerCase(), zoneName:m[2].replace(/-/g,' ') };
}

// ── Tách PSD thành các PNG ────────────────────────────────
function extractPSDLayers(psdPath, outDir){
  const script = `
import sys, os, json
from psd_tools import PSDImage
from PIL import Image

psdPath = sys.argv[1]
outDir  = sys.argv[2]
MAX_PX  = 2000

os.makedirs(outDir, exist_ok=True)
psd = PSDImage.open(psdPath)
results = []

def process_layers(layers):
    for layer in layers:
        if not layer.is_visible():
            continue
        if hasattr(layer, '__iter__') and layer.kind in ('group',):
            process_layers(layer)
            continue
        try:
            try:
                img = layer.composite()
                if img is None: img = layer.topil()
            except:
                img = layer.topil()
            if img is None:
                continue
            img = img.convert('RGBA')
            w, h = img.size
            if max(w,h) > MAX_PX:
                scale = MAX_PX / max(w,h)
                img = img.resize((int(w*scale), int(h*scale)), Image.LANCZOS)
            # Tên layer → filename an toàn
            safe = layer.name.strip().replace('/','-').replace('\\\\','-')
            outPath = os.path.join(outDir, safe + '.png')
            img.save(outPath, 'PNG', optimize=True)
            results.append({'name': layer.name, 'path': outPath,
                           'size': os.path.getsize(outPath)})
        except Exception as e:
            print(f'WARN layer {layer.name}: {e}', file=sys.stderr)

process_layers(psd)
print(json.dumps(results))
`;
  fs.writeFileSync('/tmp/_psd_extract.py', script);
  const res = spawnSync('python3', ['/tmp/_psd_extract.py', psdPath, outDir], {timeout:60000});
  if(res.status !== 0){
    throw new Error('PSD extract failed: ' + (res.stderr||'').toString());
  }
  try { return JSON.parse(res.stdout.toString().trim()); }
  catch { throw new Error('PSD extract bad output: ' + res.stdout.toString()); }
}

// ── Synced state ──────────────────────────────────────────
function loadSynced(){ try{return JSON.parse(fs.readFileSync(SYNCED_FILE,'utf8'));}catch{return {};} }
function saveSynced(d){ fs.writeFileSync(SYNCED_FILE,JSON.stringify(d,null,2)); }

// ── Main ──────────────────────────────────────────────────
async function sync(){
  if(!SA.private_key){ console.log('[DriveSync] no service account, skip'); return; }
  console.log('[DriveSync] start', new Date().toISOString());
  fs.mkdirSync(TMP_DIR, {recursive:true});

  let token;
  try{ token=await getToken(); }
  catch(e){ console.error('[DriveSync] auth fail:',e.message||e); return; }

  const synced   = loadSynced();
  const designs  = await apiReq('GET','/admin/designs').catch(()=>[]) || [];
  const designMap= {};
  for(const d of (Array.isArray(designs)?designs:[])) designMap[d.name]=d;

  const folders = await driveList(token, FOLDER_ID).catch(()=>[]);

  for(const df of folders){
    if(df.mimeType!=='application/vnd.google-apps.folder') continue;
    const designName=df.name;

    const files=await driveList(token,df.id).catch(()=>[]);
    const relevant=files.filter(f=>f.name.match(/\.(png|jpg|jpeg|psd)$/i));
    if(!relevant.length){ console.log(`[DriveSync] skip empty: ${designName}`); continue; }

    const stateKey=relevant.map(f=>f.id+f.modifiedTime).sort().join('|');
    if(synced[df.id]===stateKey){ console.log(`[DriveSync] no change: ${designName}`); continue; }

    console.log(`[DriveSync] syncing: ${designName} (${relevant.length} files)`);

    // Tạo design nếu chưa có
    let design=designMap[designName];
    if(!design){
      const res=await apiReq('POST','/admin/designs',{name:designName}).catch(()=>null);
      const list=Array.isArray(res)?res:[];
      design=list.find(d=>d.name===designName);
      if(!design){ console.error(`[DriveSync] cannot create: ${designName}`); continue; }
      designMap[designName]=design;
    }

    // Build zoneMap từ tất cả file
    const zoneMap={};
    for(const f of relevant){
      let parsed=null;
      if(f.name.match(/\.psd$/i)) parsed=parsePSDName(f.name);
      else parsed=parseFileName(f.name);
      if(!parsed) continue;
      const slug=`${parsed.side}-${parsed.zoneSlug}`;
      if(!zoneMap[slug]) zoneMap[slug]={id:`zone_${slug}`,name:parsed.zoneName,side:parsed.side,cx:0.50,cy:0.37,w:0.15};
    }

    // Lưu printZones
    const printZones=Object.values(zoneMap);
    if(printZones.length){
      await apiReq('PATCH',`/admin/designs/${encodeURIComponent(design.id)}`,{printZones}).catch(()=>{});
    }

    // Reload design
    const allD=await apiReq('GET','/admin/designs').catch(()=>[]);
    const cur=(Array.isArray(allD)?allD:[]).find(d=>d.id===design.id);
    const existingLayers=new Set((cur?.layers||[]).map(l=>`${l.zoneId}::${l.name}`));

    // Process từng file
    for(const f of relevant){
      if(f.name.match(/\.psd$/i)){
        // PSD: tách layer
        const psdInfo=parsePSDName(f.name);
        if(!psdInfo){ console.log(`  skip bad PSD name: ${f.name}`); continue; }
        const slug=`${psdInfo.side}-${psdInfo.zoneSlug}`;
        const zone=zoneMap[slug];
        const tmpPSD=path.join(TMP_DIR, `${df.id}_${f.id}.psd`);
        const tmpOut=path.join(TMP_DIR, `${df.id}_${f.id}_layers`);

        console.log(`  PSD: ${f.name} → extracting layers...`);
        try{
          await driveDownload(token,f.id,tmpPSD);
          const layers=extractPSDLayers(tmpPSD,tmpOut);
          console.log(`  PSD: ${layers.length} layers extracted`);

          for(const ly of layers){
            const key=`${zone.id}::${ly.name}`;
            if(existingLayers.has(key)){ console.log(`    skip exists: ${ly.name}`); continue; }
            console.log(`    upload layer: ${ly.name} (${Math.round(ly.size/1024)}KB)`);
            await uploadLayer(design.id,ly.name,psdInfo.side,zone.id,ly.path)
              .catch(e=>console.error('    upload err:',e.message));
          }
          // Dọn tmp
          try{ fs.rmSync(tmpOut,{recursive:true}); fs.unlinkSync(tmpPSD); }catch{}
        }catch(e){
          console.error(`  PSD extract error: ${e.message}`);
        }

      } else {
        // PNG/JPG thông thường
        const parsed=parseFileName(f.name);
        if(!parsed){ console.log(`  skip bad name: ${f.name}`); continue; }
        const slug=`${parsed.side}-${parsed.zoneSlug}`;
        const zone=zoneMap[slug];
        const key=`${zone.id}::${parsed.layerName}`;
        if(existingLayers.has(key)){ console.log(`  skip exists: ${parsed.layerName}`); continue; }

        const tmpPNG=path.join(TMP_DIR,`${f.id}.png`);
        console.log(`  upload: ${f.name} → ${zone.name}`);
        await driveDownload(token,f.id,tmpPNG).catch(e=>{console.error('  dl err:',e.message);});
        if(!fs.existsSync(tmpPNG)){ continue; }
        await uploadLayer(design.id,parsed.layerName,parsed.side,zone.id,tmpPNG)
          .catch(e=>console.error('  upload err:',e.message));
        try{ fs.unlinkSync(tmpPNG); }catch{}
      }
    }

    synced[df.id]=stateKey;
    saveSynced(synced);
    console.log(`[DriveSync] done: ${designName}`);
  }
  console.log('[DriveSync] finished');
}

module.exports={sync};
if(require.main===module) sync().catch(console.error);
