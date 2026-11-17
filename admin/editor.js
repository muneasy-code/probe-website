(() => {
"use strict";
const API="/api/probe-cms";
const LANGS=[["de","Deutsch"],["en","English"],["ar","العربية"],["ru","Русский"],["tr","Türkçe"],["uk","Українська"],["vi","Tiếng Việt"]];
const PAGES=[["index","Startseite"],["ueber-probe","Über ProBe"],["unterstuetzung","Unterstützung"],["team","Teamseite"],["kontakt","Kontakt"],["impressum","Impressum"],["datenschutz","Datenschutz"]];
const URLS={news:"/content/news.json",team:"/content/team.json",settings:"/content/settings.json",downloads:"/content/downloads.json"};
const $=id=>document.getElementById(id);
let doc=null,etag=null,dirty=false,busy=false,view="home",language="de",mediaList=[],selected={news:0,team:0,material:0,page:"index"},revision=0;
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
function append(parent,...kids){for(const child of kids)if(child)parent.append(child);return parent;}
function action(label,handler,cls="button"){const b=node("button",cls,label);b.type="button";b.addEventListener("click",handler);return b;}
function panel(parent,title){const p=node("section","panel");if(title)append(p,node("h2","",title));parent.append(p);return p;}
function note(parent,text,warn=false){return append(parent,node("div","notice"+(warn?" warning":""),text));}
function mark(){dirty=true;revision++;$("saveStatus").textContent="Ungespeicherte Änderungen";sendPreviewSoon();}
function toast(text){$("toast").textContent=text;setTimeout(()=>{$("toast").textContent="";},4400);}
function field(parent,label,value,onChange,opts={}){
  const wrap=node("div","field");
  const lab=node("label","",label);
  const el=document.createElement(opts.type==="textarea"?"textarea":opts.type==="select"?"select":"input");
  el.id="field-"+Math.random().toString(36).slice(2);
  lab.htmlFor=el.id;
  if(el.tagName==="INPUT")el.type=opts.type||"text";
  if(el.tagName==="SELECT"){
    for(const [v,t] of opts.options||[]){const o=node("option","",t);o.value=v;el.append(o);}
  }
  el.value=value??"";
  if(opts.dir)el.dir=opts.dir;
  if(opts.rows && el.tagName==="TEXTAREA")el.rows=opts.rows;
  el.addEventListener(el.tagName==="SELECT"?"change":"input",()=>{onChange(el.value);if(!opts.noDirty)mark();});
  append(wrap,lab,el);
  if(opts.hint)append(wrap,node("small","help",opts.hint));
  parent.append(wrap);return el;
}
function toggle(parent,label,value,onChange){
  const wrap=node("div","field-inline");
  const box=document.createElement("input");box.type="checkbox";box.checked=value!==false;
  const txt=node("label","",label);const id="check-"+Math.random().toString(36).slice(2);box.id=id;txt.htmlFor=id;
  box.addEventListener("change",()=>{onChange(box.checked);mark();});
  append(wrap,box,txt);parent.append(wrap);
}
function row(parent){const r=node("div","split-row");parent.append(r);return r;}
function req(path="",options={}){return fetch(API+path,{credentials:"same-origin",cache:"no-store",...options}).then(async r=>{
  let data;try{data=await r.json();}catch{throw new Error("Antwort des Redaktionsdienstes konnte nicht gelesen werden.");}
  if(!r.ok)throw new Error(data.error||"Fehler "+r.status);
  return data;
});}
function post(actionName,data={}){return req("?action="+actionName,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});}
async function seed(){
  const pagePairs=await Promise.all(PAGES.map(async ([id])=>{
    try{const r=await fetch("/content/page-"+id+".json",{cache:"no-store"});return [id,r.ok?await r.json():null];}
    catch{return [id,null];}
  }));
  const parts=await Promise.all(Object.values(URLS).map(async url=>{
    try{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);return r.json();}
    catch{return null;}
  }));
  const pages={};for(const [id,p] of pagePairs)if(p)pages[id]=p;
  return {schema:1,sections:{news:parts[0]||{items:[]},team:parts[1]||{members:[]},settings:parts[2]||{contact:{}},downloads:parts[3]||{items:[]}},pages};
}
function currentNews(){return doc.sections.news.items;}
function currentTeam(){return doc.sections.team.members;}
function currentDownloads(){return doc.sections.downloads.items;}
function setBusy(v){busy=v;for(const id of ["saveButton","publishButton","logoutButton"])$(id).disabled=v;}
async function initialize(){
  setBusy(true);
  try{
    const fetched=await req("?mode=draft");
    doc=fetched.document||await seed();etag=fetched.etag||null;dirty=false;revision=0;
    const m=await req("?mode=media").catch(()=>({images:[]}));
    mediaList=m.images||[];
    $("login").hidden=true;$("workspace").hidden=false;
    render();refreshPreview();
    $("saveStatus").textContent="Entwurf bereit";
  }catch(err){toast("Laden fehlgeschlagen: "+err.message);}finally{setBusy(false);}
}
function showLogin(){ $("workspace").hidden=true;$("login").hidden=false; }
async function authenticate(){
  try{const r=await req("?mode=session");if(r.authenticated)await initialize();
  else{$("loginNotice").textContent=r.configured?"Bitte mit dem Redaktionspasswort anmelden.":"Der Redaktionszugang ist noch nicht freigeschaltet.";showLogin();}}
  catch(err){showLogin();$("loginNotice").textContent="Redaktionsdienst nicht erreichbar: "+err.message;}
}
async function save(){
  if(busy)return false;
  const at=revision;setBusy(true);$("saveStatus").textContent="Speichere …";
  try{
    const d=await post("save",{document:doc,etag});
    etag=d.etag;dirty=revision!==at;$("saveStatus").textContent=dirty?"Weitere Änderungen offen":"Entwurf gespeichert";toast("Entwurf gesichert ✓");return true;
  }catch(err){$("saveStatus").textContent="Speichern fehlgeschlagen";toast(err.message);return false;}
  finally{setBusy(false);}
}
async function publish(){
  if(busy)return;
  if(!confirm("Diesen Entwurf wirklich in der ProBe-TESTVORSCHAU veröffentlichen? Die öffentliche Live-Website bleibt unverändert."))return;
  const ok=await save();if(!ok)return;
  setBusy(true);
  try{const p=await post("publish",{etag});$("saveStatus").textContent="In Testvorschau veröffentlicht";
    toast("In Testvorschau veröffentlicht ✓");refreshPreview();
  }catch(err){toast("Veröffentlichen fehlgeschlagen: "+err.message);}
  finally{setBusy(false);}
}
function languageTabs(parent){const tabs=node("div","segmented");for(const [code,name] of LANGS){
  const b=action(name,()=>{language=code;render();},"");b.className=language===code?"active":"";
  b.lang=code;b.dir=code==="ar"?"rtl":"ltr";tabs.append(b);
}parent.append(tabs);}
function languageData(obj){if(!obj[language])obj[language]={};return obj[language];}
function chooseList(parent,list,index,onSelect,labeler){
  const wrap=node("div","item-list");
  for(let i=0;i<list.length;i++){const it=action("",()=>{onSelect(i);render();},"item"+(i===index?" active":""));
    const info=node("span");append(info,node("strong","",labeler(list[i],i)),node("small","",i===index?" · ausgewählt":""));
    it.append(info);wrap.append(it);
  }parent.append(wrap);
}
function uploadControl(parent,label,onUploaded,accept="image/*"){
  const wrap=node("div","field");
  append(wrap,node("label","",label));
  const el=document.createElement("input");el.type="file";el.accept=accept;el.setAttribute("aria-label",label);
  el.addEventListener("change",async()=>{const file=el.files?.[0];if(!file)return;
    el.disabled=true;toast("Datei wird vorbereitet …");
    try{
      let payload=file;
      if(file.type.startsWith("image/") && file.type!=="image/gif")payload=await compressImage(file);
      if(payload.size>10*1024*1024)throw Error("Datei ist zu groß (max. 10 MB).");
      const response=await req("?action=upload",{method:"POST",headers:{"content-type":payload.type||file.type},body:payload});
      mediaList.unshift(response.url);const changed=onUploaded(response.url);if(changed!==false)mark();render();toast("Datei hochgeladen ✓");
    }catch(err){toast("Upload fehlgeschlagen: "+err.message);}
    finally{el.disabled=false;}
  });
  wrap.append(el);parent.append(wrap);
}
async function compressImage(file){
  const image=await createImageBitmap(file);
  const scale=Math.min(1,1800/Math.max(image.width,image.height));
  const w=Math.round(image.width*scale),h=Math.round(image.height*scale);
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  canvas.getContext("2d").drawImage(image,0,0,w,h);image.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",0.88));
  if(!blob)throw Error("Bild konnte nicht optimiert werden.");
  return blob;
}
function assetField(parent,label,value,onChange,accept){
  if(value){
    const url=String(value),p=node("p","help","Aktuelle Datei: "+url);
    parent.append(p);
    if(!/\.pdf(?:\?|$)/i.test(url)&&!url.includes(".pdf?")){
      const img=node("img","media-preview");img.src=url;img.alt=label;img.loading="lazy";parent.append(img);
    }
  }
  uploadControl(parent,label+" hochladen",onChange,accept);
}
function clear(parent){parent.replaceChildren();}
function render(){
  if(!doc)return;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const titles={home:["Hallo Katrin! 👋","Was möchtest du heute aktualisieren?"],news:["Aktuelles","Beiträge anlegen, bearbeiten und veröffentlichen."],team:["Team & Kontakte","Personen, Fotos und Kontaktdaten pflegen."],materials:["Flyer & Material","Flyer austauschen und Downloads verwalten."],pages:["Website bearbeiten","Texte und Bilder in den einzelnen Seiten pflegen."],media:["Mediathek","Hochgeladene Bilder und PDF-Dateien."]};
  $("viewTitle").textContent=titles[view][0];$("viewIntro").textContent=titles[view][1];
  const root=$("editor");clear(root);
  if(view==="home")renderHome(root);
  if(view==="news")renderNews(root);
  if(view==="team")renderTeam(root);
  if(view==="materials")renderMaterials(root);
  if(view==="pages")renderPages(root);
  if(view==="media")renderMedia(root);
  $("openPreview").href="/"+previewSlug()+".html";
}
function moveTo(tab){view=tab;render();refreshPreview();}
function renderHome(root){
  const intro=panel(root,"Alles an einem Ort");
  note(intro,"Deine Änderungen sind zunächst nur ein Entwurf. Du kannst sie in der Vorschau anschauen, bevor du sie veröffentlichst. Die öffentliche Website bleibt unverändert.");
  const tiles=node("div","tile-grid");
  for(const [id,title,sub] of [["news","Aktuelles","Meldungen erstellen"],["team","Team","Kontakte und Fotos"],["materials","Flyer & Material","PDFs und Downloads"],["pages","Website","Texte und Bilder"]]){
    const b=action("",()=>moveTo(id),"tile");append(b,node("strong","",title),node("small","",sub));tiles.append(b);
  }intro.append(tiles);
}
function renderNews(root){
  const all=currentNews(),box=panel(root,"News & Beiträge");
  const head=node("div","panel-header");
  append(head,node("span","pill",all.length+" Beiträge"),action("+ Neue Meldung",()=>{
    all.unshift({de:{date:new Date().toLocaleDateString("de-DE"),title:"Neue Meldung",text:""},visible:true});
    selected.news=0;language="de";mark();render();
  },"primary"));
  box.append(head);
  if(!all.length){note(box,"Noch keine Meldung. Lege oben die erste an.");return;}
  selected.news=Math.max(0,Math.min(selected.news,all.length-1));
  chooseList(box,all,selected.news,i=>{selected.news=i;},item=>item.de?.title||"Ohne Titel");
  const item=all[selected.news],edit=panel(root,"Meldung bearbeiten");
  toggle(edit,"Auf der Website anzeigen",item.visible!==false,v=>item.visible=v);
  languageTabs(edit);
  const lang=languageData(item);
  if(language!=="de")note(edit,"Eine leere Übersetzung fällt automatisch auf Deutsch zurück. Andere Sprachversionen werden nicht überschrieben.");
  field(edit,"Datum oder Kategorie",lang.date||"",v=>lang.date=v);
  field(edit,"Überschrift",lang.title||"",v=>lang.title=v,{hint:"Pflicht für eine sichtbare Meldung."});
  field(edit,"Text",lang.text||"",v=>lang.text=v,{type:"textarea",rows:5,dir:language==="ar"?"rtl":"auto"});
  assetField(edit,"Beitragsfoto (optional)",item.image||"",v=>item.image=v,"image/*");
  const actions=node("div","actions");
  append(actions,action("Meldung löschen",()=>{if(!confirm("Meldung wirklich entfernen?"))return;all.splice(selected.news,1);selected.news=0;mark();render();},"button danger"));
  edit.append(actions);
}
function renderTeam(root){
  const all=currentTeam(),box=panel(root,"Teammitglieder");
  const top=node("div","panel-header");
  append(top,node("span","pill",all.length+" Personen"),action("+ Person hinzufügen",()=>{
    all.push({name:"Neue Ansprechperson",visible:true,image:"/foto-platzhalter-weiblich.svg",email:"",phone:"",translations:{de:{region:"",role:"",about:""}}});
    selected.team=all.length-1;language="de";mark();render();
  },"primary"));box.append(top);
  if(!all.length){note(box,"Noch keine Teammitglieder.");return;}
  selected.team=Math.max(0,Math.min(selected.team,all.length-1));
  chooseList(box,all,selected.team,i=>{selected.team=i;},m=>m.name);
  const m=all[selected.team],edit=panel(root,"Kontaktkarte bearbeiten");
  field(edit,"Name",m.name||"",v=>{m.name=v;});
  toggle(edit,"Auf der Website anzeigen",m.visible!==false,v=>m.visible=v);
  const cols=row(edit);
  field(cols,"E-Mail-Adresse",m.email||"",v=>m.email=v,{type:"email"});
  field(cols,"Telefonnummer",m.phone||"",v=>m.phone=v,{type:"tel",hint:"Bleibt leer, wenn keine Nummer vorhanden ist."});
  assetField(edit,"Profilfoto",m.image||"",v=>m.image=v,"image/*");
  field(edit,"Bildausschnitt (horizontal vertikal)",m.imagePosition||"50% 50%",v=>m.imagePosition=v,{hint:"Zum Beispiel 50% 30%."});
  languageTabs(edit);
  const ld=languageData(m.translations||(m.translations={}));
  if(language!=="de")note(edit,"Noch keine Übersetzung? Dann bleiben die deutschen Inhalte sichtbar, bis du diese Sprachfassung ergänzt.");
  field(edit,"Region",ld.region||"",v=>ld.region=v,{dir:language==="ar"?"rtl":"auto"});
  field(edit,"Funktion / Standort",ld.role||"",v=>ld.role=v,{dir:language==="ar"?"rtl":"auto"});
  field(edit,"Persönlicher Vorstellungstext",ld.about||"",v=>ld.about=v,{type:"textarea",rows:7,dir:language==="ar"?"rtl":"auto",hint:"Ohne Vorstellungstext wird kein „Mehr über …“-Bereich angezeigt."});
  const actions=node("div","actions");
  append(actions,action("Person entfernen",()=>{if(!confirm("Diesen Teamkontakt wirklich entfernen?"))return;all.splice(selected.team,1);selected.team=0;mark();render();},"button danger"));
  edit.append(actions);
}
function renderMaterials(root){
  const settings=doc.sections.settings,contact=settings.contact||(settings.contact={});
  const panel1=panel(root,"Zentrale Kontaktdaten");
  field(panel1,"Projekt-E-Mail",contact.email||"",v=>contact.email=v,{type:"email"});
  field(panel1,"Telefon",contact.phone||"",v=>contact.phone=v);
  field(panel1,"Adresse",contact.address||"",v=>contact.address=v);
  const flyer=panel(root,"Hauptflyer");
  assetField(flyer,"Aktuellen PDF-Flyer",settings.flyer||"",v=>{
    settings.flyer=v;
    const list=currentDownloads();
    if(list.length)list[0].file=v;
  },"application/pdf");
  note(flyer,"Beim Ersetzen des Hauptflyers wird auch der erste Download aktualisiert. Die alten Dateien bleiben erhalten.");
  const list=currentDownloads(),all=panel(root,"Weitere Materialien");
  append(all,action("+ Download hinzufügen",()=>{list.push({visible:true,file:"",translations:{de:{title:"Neues Material",description:""}}});selected.material=list.length-1;mark();render();},"button"));
  if(!list.length)return;
  selected.material=Math.max(0,Math.min(selected.material,list.length-1));
  chooseList(all,list,selected.material,i=>{selected.material=i;},m=>m.translations?.de?.title||"Material");
  const m=list[selected.material];toggle(all,"Download anzeigen",m.visible!==false,v=>m.visible=v);
  assetField(all,"Datei",m.file||"",v=>m.file=v,"application/pdf,image/*");
  languageTabs(all);
  const ld=languageData(m.translations||(m.translations={}));
  field(all,"Titel",ld.title||"",v=>ld.title=v);
  field(all,"Beschreibung",ld.description||"",v=>ld.description=v,{type:"textarea"});
  append(all,action("Download entfernen",()=>{if(!confirm("Download-Eintrag entfernen?"))return;list.splice(selected.material,1);selected.material=0;mark();render();},"button danger"));
}
function prettify(key){return key.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[-_]/g," ").replace(/^./,x=>x.toUpperCase());}
function renderPages(root){
  const choose=panel(root,"Seite auswählen");
  const pageSelector=field(choose,"Website-Seite",selected.page,v=>{selected.page=v;render();refreshPreview();},{type:"select",options:PAGES,noDirty:true});
  const page=doc.pages[selected.page]||(doc.pages[selected.page]={texts:{de:{}},plain:{},images:[],links:[]});
  if(["impressum","datenschutz"].includes(selected.page))note(choose,"Rechtstexte bitte nur nach inhaltlicher Freigabe verändern.",true);
  const texts=panel(root,"Seitentexte");
  languageTabs(texts);
  const de=page.texts?.de||{},localized=(page.texts||(page.texts={}))[language]||{};
  const keys=Object.keys(de);
  if(!keys.length)note(texts,"Für diese Seite sind noch keine CMS-Texte hinterlegt.");
  for(const key of keys){
    const display=language==="de"?(localized[key]??""):(localized[key]??"");
    field(texts,prettify(key),display,v=>{if(!page.texts[language])page.texts[language]={};page.texts[language][key]=v;},{type:(display.length>90||de[key]?.length>90)?"textarea":"text",dir:language==="ar"?"rtl":"auto",hint:language!=="de"&&!localized[key]?"Leer = deutsche Fassung wird angezeigt.":""});
  }
  if(language==="de"&&Object.keys(page.plain||{}).length){
    const raw=panel(root,"Weitere Inhalte");
    note(raw,"Diese Felder werden direkt in die Seite übernommen. Formatierung und gesetzliche Angaben bitte mit Bedacht ändern.");
    for(const [key,val] of Object.entries(page.plain)){field(raw,prettify(key)+" · "+String(val).slice(0,38),val,v=>page.plain[key]=v,{type:val.length>90?"textarea":"text"});}
  }
  const imgs=(page.images||[]).filter(i=>i.source && !/^(?:drk|ms-logo|bpa|probe-logo)/i.test(i.source.replace(/^\//,"")));
  if(imgs.length){const pictures=panel(root,"Bilder austauschen");for(const item of imgs){
    const card=node("div","field");append(card,node("label","",item.label||item.alt||item.key));
    assetField(card,"Neues Bild",item.source||"",v=>item.source=v,"image/*");pictures.append(card);
  }}
}
function renderMedia(root){
  const box=panel(root,"Mediathek");
  note(box,"Dateien bleiben hier erhalten. Ein Upload allein verändert noch keine Seite. Verwende ihn in einem Beitrag, einer Teamkarte oder bei den Materialien.");
  uploadControl(box,"Bild oder PDF hinzufügen",()=>false, "image/*,application/pdf");
  const grid=node("div","media-grid");
  for(const url of mediaList){const item=node("div","media-card");
    if(!url.includes(".pdf")){const img=node("img");img.src=url;img.alt="Hochgeladenes Bild";img.loading="lazy";item.append(img);}
    const code=node("code","",url.split("media=").at(-1));item.append(code);
    append(item,action("Link kopieren",()=>{navigator.clipboard?.writeText(location.origin+url).then(()=>toast("Link kopiert ✓")).catch(()=>toast("Kopieren nicht möglich."));},"button"));
    grid.append(item);
  }
  box.append(grid);
}
function previewSlug(){return view==="team"?"team":view==="pages"?selected.page:"index";}
function previewUrl(){const slug=previewSlug();return "/"+slug+".html?cms-preview=1";}
function refreshPreview(){const iframe=$("previewFrame");const url=previewUrl();
  if(iframe.getAttribute("src")!==url)iframe.src=url;
  else sendPreview();
}
let previewJob=null;
function sendPreviewSoon(){clearTimeout(previewJob);previewJob=setTimeout(sendPreview,260);}
function sendPreview(){const iframe=$("previewFrame");if(!iframe?.contentWindow||!doc)return;
  const page=doc.pages[previewSlug()];
  for(const kind of ["news","team","settings","downloads"]){
    iframe.contentWindow.postMessage({type:"probe:cms-preview",kind,data:doc.sections[kind]},location.origin);
  }
  if(page)iframe.contentWindow.postMessage({type:"probe:cms-preview",kind:"page",data:page},location.origin);
}
window.addEventListener("message",ev=>{
  if(ev.origin!==location.origin||ev.source!==$("previewFrame")?.contentWindow)return;
  if(ev.data?.type==="probe:cmsready")sendPreview();
});
$("previewFrame").addEventListener("load",()=>setTimeout(sendPreview,250));
document.querySelectorAll(".nav-item").forEach(button=>button.addEventListener("click",()=>moveTo(button.dataset.view)));
$("refreshPreview").addEventListener("click",()=>{const iframe=$("previewFrame");iframe.src=previewUrl()+"&v="+Date.now();});
$("saveButton").addEventListener("click",()=>save());
$("publishButton").addEventListener("click",publish);
$("logoutButton").addEventListener("click",async()=>{if(dirty&&!confirm("Ungespeicherte Änderungen verwerfen und abmelden?"))return;try{await post("logout");}catch{}doc=null;etag=null;showLogin();});
$("loginForm").addEventListener("submit",async event=>{event.preventDefault();$("loginNotice").textContent="";
  const input=$("loginPassword");try{await post("login",{password:input.value});input.value="";await initialize();}
  catch(err){$("loginNotice").textContent=err.message;}
});
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
authenticate();
})();