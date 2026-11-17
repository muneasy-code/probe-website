let getStore;
async function loadDependencies(){
  if(getStore)return;
  const blobs=await import('@netlify/blobs');
  getStore=blobs.getStore;
}
import { randomUUID, createHmac, timingSafeEqual, scryptSync } from 'node:crypto';

const JSON_HEADERS = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const REGION = 'eu-central-1';
const STORE_NAME = process.env.CONTEXT === 'production' ? 'probe-editor-live' : 'probe-editor-stage';
const COOKIE = 'probe_cms_session';
const PAGES = new Set(['index','ueber-probe','unterstuetzung','team','kontakt','impressum','datenschutz']);
const MAX_DOC_SIZE = 550000;
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const reply=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{...JSON_HEADERS,...headers}});
const store=()=>getStore({name:STORE_NAME,region:REGION,consistency:'strong'});
const cleanString=(v,len=2000)=>typeof v==='string'?v.slice(0,len):'';
const safeUrl=(v)=>{
  const value=cleanString(v,1500).trim();
  if(!value) return '';
  if(/^(https:\/\/|http:\/\/)/i.test(value)) return value;
  if(/^(assets\/|\/assets\/|\/api\/cms\?media=)/.test(value)) return value;
  if(/^(?:\/(?:[a-z0-9-]+\/?)?|[a-z0-9-]+\.html)?(?:[?#][^\s<>"\\]*)?$/i.test(value)) return value;
  return '';
};
const LANGUAGES = ['de','en','ar','ru','tr','uk','vi'];
function cleanObject(v, depth=0) {
  if (depth > 12) return null;
  if (typeof v === 'string') return v.slice(0,12000);
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean' || v === null) return v;
  if (Array.isArray(v)) return v.slice(0,200).map(item => cleanObject(item, depth+1));
  if (!v || typeof v !== 'object') return null;
  const out = {};
  for (const [key,value] of Object.entries(v).slice(0,300)) {
    if (!/^[a-z0-9_-]{1,90}$/i.test(key) || ['__proto__','constructor','prototype'].includes(key)) continue;
    out[key] = cleanObject(value,depth+1);
  }
  return out;
}
function normalize(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const sections = src.sections && typeof src.sections === 'object' ? src.sections : {};
  const news = Array.isArray(sections.news?.items) ? sections.news.items.slice(0,150) : [];
  const team = Array.isArray(sections.team?.members) ? sections.team.members.slice(0,50) : [];
  const downloads = Array.isArray(sections.downloads?.items) ? sections.downloads.items.slice(0,100) : [];
  const pages = {};
  for (const p of PAGES) {
    const content = sections.pages?.[p] || src.pages?.[p];
    if (content && typeof content === 'object') pages[p] = cleanObject(content);
  }
  return {
    schema: 1,
    sections: {
      news: {items: cleanObject(news)},
      team: {members: cleanObject(team)},
      settings: cleanObject(sections.settings || {}),
      downloads: {items: cleanObject(downloads)}
    },
    pages,
    updatedAt: new Date().toISOString()
  };
}
const blank = () => normalize({});
const writable = () => mutationAllowed() &&
  (process.env.CONTEXT !== 'production' || process.env.PROBE_CMS_LIVE_ENABLED === 'true');

function cookieValue(req){
  const cookie=req.headers.get('cookie')||'';
  return cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.split('=').slice(1).join('=')||'';
}
function sessionOk(req){
  const key=process.env.PROBE_CMS_SESSION_KEY;
  if(!key || key.length<32) return false;
  const v=cookieValue(req), parts=v.split('.');
  if(parts.length!==2) return false;
  const expected=createHmac('sha256',key).update(parts[0]).digest('base64url');
  if(parts[1].length!==expected.length || !timingSafeEqual(Buffer.from(parts[1]),Buffer.from(expected)))return false;
  try{
    const claims=JSON.parse(Buffer.from(parts[0],'base64url').toString());
    return claims.sub==='probe-editor' && claims.exp>Date.now() && claims.exp<Date.now()+8*24*3600*1000;
  }catch{return false;}
}
function newCookie(){
  const payload=Buffer.from(JSON.stringify({sub:'probe-editor',exp:Date.now()+8*3600*1000})).toString('base64url');
  const sig=createHmac('sha256',process.env.PROBE_CMS_SESSION_KEY).update(payload).digest('base64url');
  return `${COOKIE}=${payload}.${sig}; Path=/api/probe-cms; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
}
function checkOrigin(req){
  const origin=req.headers.get('origin');
  return !!origin && origin===new URL(req.url).origin;
}
function comparePassword(v){
  const raw=process.env.PROBE_CMS_PASSWORD_HASH||'';
  const [salt,hash]=raw.split(':');
  if(!salt||!hash||!process.env.PROBE_CMS_SESSION_KEY)return false;
  const actual=scryptSync(cleanString(v,500),salt,64);
  const expected=Buffer.from(hash,'hex');
  return actual.length===expected.length && timingSafeEqual(actual,expected);
}
const mutationAllowed=()=>Boolean(process.env.PROBE_CMS_PASSWORD_HASH&&process.env.PROBE_CMS_SESSION_KEY);
const readJson=async (req)=>{
  if(Number(req.headers.get('content-length')||0)>MAX_DOC_SIZE)throw Error('Zu große Anfrage.');
  const text=await req.text();
  if(text.length>MAX_DOC_SIZE)throw Error('Zu große Anfrage.');
  return JSON.parse(text);
};
async function getDocument(key){
  const s=store();
  const entry=await s.getWithMetadata(key,{type:'json'});
  if(!entry)return {doc:null,etag:null};
  return {doc:entry.data||null,etag:entry.etag||null};
}
async function getPublicMedia(req,key){
  if(!/^media\/[a-f0-9-]{36}\.(png|jpg|webp|gif|pdf)$/.test(key)) return new Response('Nicht gefunden',{status:404});
  const ext=key.split('.').pop();
  const type={png:'image/png',jpg:'image/jpeg',webp:'image/webp',gif:'image/gif',pdf:'application/pdf'}[ext];
  const bytes=await store().get(key,{type:'arrayBuffer'});
  if(!bytes)return new Response('Nicht gefunden',{status:404});
  return new Response(bytes,{headers:{
    'content-type':type,'x-content-type-options':'nosniff',
    'content-disposition':ext==='pdf'?'inline':'inline',
    'cache-control':'public, max-age=600','content-security-policy':"default-src 'none'; sandbox"
  }});
}
function validMedia(bytes,type){
  const b=Buffer.from(bytes);
  if(type==='image/png')return b.length>8 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(type==='image/jpeg')return b.length>3 && b[0]===255 && b[1]===216 && b[2]===255;
  if(type==='image/webp')return b.length>12 && b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
  if(type==='image/gif')return ['GIF87a','GIF89a'].includes(b.toString('ascii',0,6));
  if(type==='application/pdf')return b.length>8 && b.toString('ascii',0,5)==='%PDF-';
  return false;
}
export default async function handler(req) {
  let phase='modules';
  try{
    await loadDependencies();
    phase='request';
    const url=new URL(req.url);
    const media=url.searchParams.get('media');
    if(req.method==='GET' && media)return getPublicMedia(req,'media/'+media);
    if(req.method==='GET' && url.searchParams.get('mode')==='session')
      return reply({authenticated:sessionOk(req),configured:writable(),environment:process.env.CONTEXT === 'production'?'live':'test'});
    if(req.method==='GET' && url.searchParams.get('mode')==='media'){
      if(!sessionOk(req))return reply({error:'Nicht angemeldet.'},401);
      const entries=await store().list({prefix:'media/'});
      return reply({images:(entries.blobs||[]).map(e=>'/api/probe-cms?media='+encodeURIComponent(e.key.slice(6)))});
    }
    if(req.method==='GET' && url.searchParams.get('mode')==='history'){
      if(!sessionOk(req))return reply({error:'Nicht angemeldet.'},401);
      const entries=await store().list({prefix:'history/'});
      const versions=(entries.blobs||[]).map(e=>({key:e.key,at:Number((e.key||'').split('/')[1]?.split('-')[0])||null}))
        .sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,15);
      return reply({versions});
    }
    if(req.method==='GET' && url.searchParams.get('mode')==='draft'){
      if(!sessionOk(req))return reply({error:'Nicht angemeldet.'},401);
      const {doc,etag}=await getDocument('draft');
      if(doc)return reply({document:doc,etag});
      const pub=await getDocument('published');
      return reply({document:pub.doc||null,etag:null});
    }
    if(req.method==='GET'){
      phase='blobs';
      const pub=await getDocument('published');
      return reply({document:pub.doc || null},200,{'cache-control':'no-store'});
    }
    if(req.method!=='POST')return reply({error:'Methode nicht erlaubt.'},405);
    if(!checkOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
    const action=url.searchParams.get('action');
    if(action==='login'){
      if(!writable())return reply({error:'Redaktionszugang in dieser Umgebung noch nicht aktiviert.'},503);
      const input=await readJson(req);
      if(!comparePassword(input.password))return reply({error:'Passwort falsch.'},401);
      return reply({ok:true},200,{'set-cookie':newCookie()});
    }
    if(action==='logout')return reply({ok:true},200,{'set-cookie':COOKIE+'=; Path=/api/probe-cms; Max-Age=0; HttpOnly; Secure; SameSite=Strict'});
    if(!sessionOk(req))return reply({error:'Bitte anmelden.'},401);
    if(!writable())return reply({error:'Bearbeiten ist in dieser Umgebung gesperrt.'},403);
    if(action==='save'){
      const input=await readJson(req);
      const doc=normalize(input.document);
      const current=await getDocument('draft');
      const provided=typeof input.etag==='string'?input.etag:null;
      if(provided!==current.etag)return reply({error:'Es gibt neuere Änderungen. Bitte neu laden.'},409);
      const opts=current.etag?{onlyIfMatch:current.etag}:{onlyIfNew:true};
      const result=await store().setJSON('draft',doc,opts);
      if(result.modified===false)return reply({error:'Inzwischen wurde geändert. Bitte neu laden.'},409);
      return reply({ok:true,etag:result.etag,updatedAt:doc.updatedAt});
    }
    if(action==='publish'){
      const input=await readJson(req);
      const published=await getDocument('published');
      const draft=await getDocument('draft');
      if(!draft.doc)return reply({error:'Noch kein Entwurf gespeichert.'},400);
      if(input.etag!==draft.etag)return reply({error:'Der Entwurf wurde inzwischen geändert. Bitte neu laden.'},409);
      const opts=published.etag?{onlyIfMatch:published.etag}:{onlyIfNew:true};
      const result=await store().setJSON('published',draft.doc,opts);
      if(result.modified===false)return reply({error:'Inzwischen wurde eine andere Version veröffentlicht. Bitte neu laden.'},409);
      if(published.doc){
        const name='history/'+Date.now()+'-'+randomUUID();
        await store().setJSON(name,published.doc);
      }
      return reply({ok:true,publishedAt:new Date().toISOString(),environment:process.env.CONTEXT === 'production'?'live':'test'});
    }
    if(action==='restore'){
      const input=await readJson(req);
      const key=typeof input.key==='string'?input.key:'';
      if(!/^history\/\d{13}-[0-9a-f-]{36}$/.test(key))return reply({error:'Ungültige Version.'},400);
      const old=await store().get(key,{type:'json'});
      if(!old)return reply({error:'Version nicht gefunden.'},404);
      const current=await getDocument('draft');
      const etag=typeof input.etag==='string'?input.etag:null;
      if(etag!==current.etag)return reply({error:'Entwurf inzwischen geändert. Bitte neu laden.'},409);
      const saved=await store().setJSON('draft',normalize(old),current.etag?{onlyIfMatch:current.etag}:{onlyIfNew:true});
      if(saved.modified===false)return reply({error:'Entwurf inzwischen geändert.'},409);
      return reply({ok:true,etag:saved.etag,document:old});
    }
    if(action==='upload'){
      const type=(req.headers.get('content-type')||'').split(';')[0].toLowerCase();
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','application/pdf':'pdf'}[type];
      if(!ext)return reply({error:'Nur JPG, PNG, WEBP, GIF oder PDF.'},415);
      if(Number(req.headers.get('content-length')||0)>MAX_UPLOAD_SIZE)return reply({error:'Datei zu groß (maximal 10 MB).'},413);
      const bytes=await req.arrayBuffer();
      if(bytes.byteLength>MAX_UPLOAD_SIZE||!validMedia(bytes,type))return reply({error:'Ungültige Bilddatei.'},400);
      const key='media/'+randomUUID()+'.'+ext;
      await store().set(key,bytes);
      return reply({ok:true,url:'/api/probe-cms?media='+encodeURIComponent(key.slice(6))});
    }
    return reply({error:'Unbekannte Aktion.'},404);
  }catch(error){
    console.error('ProBe CMS:',phase,error?.name,error?.message);
    const code=phase==='modules'?521:phase==='blobs'?522:500;
    return reply({error:'Der CMS-Dienst konnte die Anfrage nicht bearbeiten.'},code);
  }
}
