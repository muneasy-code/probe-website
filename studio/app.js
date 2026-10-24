import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm";
const API="https://gwdfakptvnjixighnxiy.supabase.co";
const KEY="sb_publishable_Y-Oi7-tSnpKRauu2BiX5dA_QJ1SXY4h";
const db=createClient(API,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const DEMO=new URLSearchParams(location.search).get("demo")==="1";
const languages={de:"Deutsch",en:"Englisch",ar:"Arabisch",ru:"Russisch",tr:"Türkisch",uk:"Ukrainisch",vi:"Vietnamesisch"};
const sections=[
{id:"news",label:"Aktuelles / NEWS",file:"news.json",page:"index.html"},
{id:"team",label:"Team & Kontakte",file:"team.json",page:"team.html"},
{id:"settings",label:"Kontaktdaten",file:"settings.json",page:"kontakt.html"},
{id:"downloads",label:"Downloads",file:"downloads.json",page:"index.html"},
{id:"page-index",label:"Startseite",file:"page-index.json",page:"index.html"},
{id:"page-ueber-probe",label:"Über ProBe",file:"page-ueber-probe.json",page:"ueber-probe.html"},
{id:"page-unterstuetzung",label:"Unterstützung",file:"page-unterstuetzung.json",page:"unterstuetzung.html"},
{id:"page-team",label:"Teamseite",file:"page-team.json",page:"team.html"},
{id:"page-kontakt",label:"Kontaktseite",file:"page-kontakt.json",page:"kontakt.html"},
{id:"page-impressum",label:"Impressum",file:"page-impressum.json",page:"impressum.html"},
{id:"page-datenschutz",label:"Datenschutz",file:"page-datenschutz.json",page:"datenschutz.html"}
];
const $=(sel,root=document)=>root.querySelector(sel);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const htmlEscape=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const clone=x=>JSON.parse(JSON.stringify(x));
const safe=x=>String(x??"");
const state={section:"news",language:"de",data:null,published:null,selection:0,dirty:false,media:"",session:null};
let toastTimer;
function toast(message,error=false){const e=$("#flash");e.textContent=message;e.style.background=error?"#9d3948":"#012639";e.classList.remove("hidden");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.add("hidden"),4500);}
function errorMessage(err){return err?.message||String(err);}
function mark(){state.dirty=true;$("#save-state").textContent="Ungespeicherte Änderungen";}
function addField(parent,label,value,change,opts={}){
 const wrap=el("div","field"),lab=el("label","",label),input=opts.long?el("textarea"):el("input");
 if(!opts.long)input.type=opts.type||"text";
 input.value=safe(value);if(opts.placeholder)input.placeholder=opts.placeholder;
 input.addEventListener("input",()=>{change(input.value);mark();if(opts.refresh)sendPreview();});
 wrap.append(lab,input);parent.append(wrap);return input;
}
function addCheck(parent,label,value,change){
 const row=el("label","row field"),input=el("input");input.type="checkbox";input.style.width="auto";input.checked=value!==false;
 input.addEventListener("change",()=>{change(input.checked);mark();});
 row.append(input,el("span","",label));parent.append(row);
}
function smallButton(text,onClick,cls=""){const btn=el("button","button "+cls,text);btn.type="button";btn.addEventListener("click",onClick);return btn;}
function langPicker(parent,onChange){const s=el("select","select");for(const [code,name] of Object.entries(languages)){const o=el("option","",name);o.value=code;s.append(o);}s.value=state.language;s.addEventListener("change",()=>{state.language=s.value;onChange();});parent.append(s);}
function shell(title,description){
 const wrapper=el("div"),bar=el("div","toolbar"),h=el("div");
 h.append(el("h2","",title),el("p","hint",description));bar.append(h);wrapper.append(bar);$("#editor").replaceChildren(wrapper);return wrapper;
}
function panel(title){const card=el("section","card");card.append(el("h2","",title));return card;}
function split(parent){const grid=el("div","grid");parent.append(grid);return grid;}
function records(items,label,select,active){
 const list=el("div","record-list");
 items.forEach((item,i)=>{const btn=el("button","record"+(i===active?" selected":"")),left=el("span");
 left.append(el("b","",label(item,i)),el("small","",item.date||""));
 btn.append(left,el("span","muted","›"));btn.addEventListener("click",()=>select(i));list.append(btn);});
 return list;
}
function currentSection(){return sections.find(s=>s.id===state.section);}
function renderNav(){
 const nav=$("#sidebar");nav.replaceChildren();
 sections.forEach(s=>{const b=el("button","nav-btn"+(s.id===state.section?" active":""),s.label);b.addEventListener("click",()=>switchSection(s.id));nav.append(b);});
 const media=el("button","nav-btn"+(state.section==="media"?" active":""),"Medien");media.addEventListener("click",()=>switchSection("media"));nav.append(media);
}
async function editable(){
 const {data:{user},error}=await db.auth.getUser();if(error||!user)return false;
 const result=await db.from("probe_cms_editors").select("active").eq("user_id",user.id).maybeSingle();
 if(result.error)throw result.error;return result.data?.active===true;
}
function loggedIn(){
 $("#auth-screen").classList.add("hidden");$("#studio").classList.remove("hidden");
 if(DEMO){
  $("#save-state").textContent="Demo: keine Verbindung zum CMS";
  $("#logout").textContent="↩ Zum echten Login";
  const topbar=$(".topbar");
  if(!$("#demo-notice")){
   const notice=el("div","note");notice.id="demo-notice";
   notice.style.margin="10px 16px";notice.style.background="#edfbfe";
   notice.textContent="DEMO-MODUS · Probiere die Redaktion aus. Änderungen werden weder gespeichert noch veröffentlicht.";
   topbar.after(notice);
  }
 }
 switchSection("news");
}
async function authenticate(){
 const {data:{session}}=await db.auth.getSession();
 if(session){if(await editable()){state.session=session;loggedIn();}else{$("#auth-message").textContent="Dieses Konto ist noch nicht für die Redaktion freigeschaltet.";await db.auth.signOut();}}
}
$("#login-form").addEventListener("submit",async e=>{
 e.preventDefault();const submit=$("#login-form button");submit.disabled=true;$("#auth-message").textContent="Anmeldung wird geprüft …";
 try{
 const {data,error}=await db.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});
 if(error)throw error;if(!await editable()){await db.auth.signOut();throw Error("Dein Konto ist noch nicht als ProBe-Redaktion freigeschaltet.");}
 state.session=data.session;$("#auth-message").textContent="";loggedIn();
 }catch(err){$("#auth-message").textContent=errorMessage(err);}finally{submit.disabled=false;}
});
$("#logout").addEventListener("click",async()=>{if(DEMO){location.href="/studio/";return;}await db.auth.signOut();location.reload();});
async function switchSection(id){
 if(state.dirty&&!confirm("Ungespeicherte Änderungen verwerfen?"))return;
 state.section=id;state.selection=0;state.language="de";state.dirty=false;renderNav();
 $("#view-title").textContent=id==="media"?"Medien":currentSection().label;
 $("#save-state").textContent="Alle Änderungen gespeichert";
 $("#save-draft").disabled=id==="media";$("#publish").disabled=id==="media";
 if(id==="media"){state.data=null;renderMedia();return;}
 $("#editor").replaceChildren(el("p","muted","Inhalte werden geladen …"));
 try{
 const s=currentSection(),resp=await fetch("/content/"+s.file,{cache:"no-store"});
 if(!resp.ok)throw Error("Basisdatei nicht gefunden: "+s.file);
 const baseline=await resp.json();
 let pub={data:null},draft={data:null};
 if(!DEMO){
 [pub,draft]=await Promise.all([
 db.from("probe_cms_published").select("content").eq("slug",id).maybeSingle(),
 db.from("probe_cms_drafts").select("content").eq("slug",id).maybeSingle()
 ]);
 if(pub.error)throw pub.error;if(draft.error)throw draft.error;
 }
 state.published=pub.data?.content||baseline;
 state.data=clone(draft.data?.content||state.published);
 render();
 }catch(err){$("#editor").replaceChildren(el("p","muted","Laden fehlgeschlagen: "+errorMessage(err)));toast("Laden fehlgeschlagen",true);}
}
function newsEntries(){if(!Array.isArray(state.data.items))state.data.items=[];return state.data.items;}
function addNews(){const list=newsEntries();list.unshift({id:"news-"+Date.now(),date:new Date().toISOString().slice(0,10),visible:true,image:"",de:{title:"Neue Meldung",text:"",date:new Date().toISOString().slice(0,10)}});state.selection=0;mark();render();}
function renderNews(){
 const wrapper=shell("Aktuelles verwalten","Neue Meldungen, Beiträge, optionale Fotos und sieben Sprachen.");
 const grid=split(wrapper),left=panel("Beiträge"),right=panel("Beitrag bearbeiten"),items=newsEntries();
 const toolbar=el("div","toolbar");toolbar.append(smallButton("+ Neue Meldung",addNews,"cyan"));left.append(toolbar);
 left.append(records(items,(x)=>x.de?.title||"Ohne Titel",i=>{state.selection=i;render();},state.selection));grid.append(left,right);
 if(!items.length){right.append(el("p","muted","Erstelle die erste Meldung."));return;}
 const item=items[Math.min(state.selection,items.length-1)],lang=state.language;
 const row=el("div","toolbar");row.append(el("span","hint","Bearbeitungssprache"));langPicker(row,render);right.append(row);
 if(!item[lang])item[lang]={};const t=item[lang];
 addField(right,"Überschrift",t.title,v=>t.title=v);
 addField(right,"Text",t.text,v=>t.text=v,{long:true});
 if(lang==="de"){
  addField(right,"Veröffentlichungsdatum (JJJJ-MM-TT)",item.date||t.date,v=>{item.date=v;t.date=v;},{type:"date"});
  addCheck(right,"Auf Website anzeigen",item.visible,v=>item.visible=v);
  addField(right,"Kategorie / Datumszusatz (optional)",t.date,v=>t.date=v,{placeholder:"z. B. 10.10.2026"});
  mediaField(right,"Beitragsfoto (optional)",item.image||"",v=>item.image=v,"news");
 }else addField(right,"Datumszusatz (optional)",t.date,v=>t.date=v);
 const actions=el("div","row between");actions.append(smallButton("Beitrag entfernen",()=>{
  if(!confirm("Diesen Beitrag aus der Redaktion entfernen?"))return;
  items.splice(state.selection,1);state.selection=0;mark();render();
 },"danger"));right.append(actions);
 const note=el("div","note","Auf der Startseite erscheinen automatisch höchstens drei aktuelle veröffentlichte Beiträge. Alle weiteren sind im Newsarchiv erreichbar.");right.append(note);
 addPreview(wrapper,"news","index.html");
}
function mediaField(parent,label,value,onChange,folder){
 const box=el("div","field"),lab=el("label","",label),row=el("div","row"),url=el("input");
 url.value=safe(value);url.placeholder="/uploads/bild.jpg oder https://…";url.style.flex="1";
 url.addEventListener("input",()=>{onChange(url.value);mark();sendPreview();});
 const upload=smallButton("Foto / Datei wählen",()=>file.click());
 const file=el("input");file.type="file";file.accept=folder==="documents"?"image/jpeg,image/png,image/webp,application/pdf":"image/jpeg,image/png,image/webp";
 file.classList.add("hidden");file.addEventListener("change",async()=>{
  const selected=file.files?.[0];if(!selected)return;if(selected.size>10*1024*1024)return toast("Maximal 10 MB je Datei.",true);
  if(DEMO){
   const localUrl=URL.createObjectURL(selected);url.value=localUrl;onChange(localUrl);mark();sendPreview();
   file.value="";toast("Demo-Datei nur vorübergehend im Browser geladen.");return;
  }
  upload.disabled=true;upload.textContent="Lädt hoch …";
  try{
   const ext=selected.name.split(".").pop().toLowerCase();
   const path=folder+"/"+Date.now()+"-"+Math.random().toString(36).slice(2)+"."+ext;
   const {error}=await db.storage.from("probe-cms-media").upload(path,selected,{contentType:selected.type,upsert:false});
   if(error)throw error;
   const {data}=db.storage.from("probe-cms-media").getPublicUrl(path);
   url.value=data.publicUrl;onChange(url.value);mark();sendPreview();toast("Datei hochgeladen.");
  }catch(err){toast("Upload fehlgeschlagen: "+errorMessage(err),true);}
  finally{upload.disabled=false;upload.textContent="Foto / Datei wählen";file.value="";}
 });
 row.append(url,upload,file);box.append(lab,row);
 if(value&&/\.(png|jpg|jpeg|webp)(\?|$)/i.test(value)){const img=el("img","media-preview");img.src=value;img.alt="Bildvorschau";box.append(img);}
 parent.append(box);
}
function renderTeam(){
 const wrapper=shell("Team bearbeiten","Namen, Funktionen, Fotos und Kontakte zentral verwalten.");
 const grid=split(wrapper),list=panel("Teammitglieder"),form=panel("Teamprofil"),items=state.data.members||(state.data.members=[]);
 list.append(smallButton("+ Teammitglied",()=>{items.push({name:"Neues Teammitglied",visible:false,translations:{de:{role:"",region:"",about:""}}});state.selection=items.length-1;mark();render();},"cyan"));
 list.append(records(items,x=>x.name,i=>{state.selection=i;render();},state.selection));grid.append(list,form);
 const item=items[state.selection];if(!item)return;
 addField(form,"Name",item.name,v=>item.name=v);
 addCheck(form,"Auf Website anzeigen",item.visible,v=>item.visible=v);
 addField(form,"E-Mail",item.email,v=>item.email=v,{type:"email"});
 addField(form,"Telefon",item.phone,v=>item.phone=v);
 mediaField(form,"Teamfoto",item.image||"",v=>item.image=v,"team");
 addField(form,"Bildausschnitt",item.imagePosition||"50% 50%",v=>item.imagePosition=v,{placeholder:"50% 30%"});
 const row=el("div","toolbar");row.append(el("span","hint","Sprache der Texte"));langPicker(row,render);form.append(row);
 item.translations ||= {};item.translations[state.language] ||= {};const trans=item.translations[state.language];
 addField(form,"Region",trans.region,v=>trans.region=v);
 addField(form,"Rolle / Funktion",trans.role,v=>trans.role=v);
 addField(form,"Über die Person",trans.about,v=>trans.about=v,{long:true});
 form.append(smallButton("Teammitglied entfernen",()=>{if(!confirm("Teammitglied entfernen?"))return;items.splice(state.selection,1);state.selection=0;mark();render();},"danger"));
 addPreview(wrapper,"team","team.html");
}
function renderSettings(){
 const wrapper=shell("Zentrale Kontaktdaten","Änderungen gelten überall dort, wo die Website zentrale Kontaktdaten verwendet.");
 const card=panel("Projektkontakt");wrapper.append(card);
 const contact=state.data.contact||(state.data.contact={});
 addField(card,"E-Mail-Adresse",contact.email,v=>contact.email=v,{type:"email"});
 addField(card,"Telefon",contact.phone,v=>contact.phone=v);
 addField(card,"Postadresse",contact.address,v=>contact.address=v);
 mediaField(card,"Hauptflyer als PDF",state.data.flyer||"",v=>state.data.flyer=v,"documents");
 addPreview(wrapper,"settings","kontakt.html");
}
function renderDownloads(){
 const wrapper=shell("Downloads & Materialien","Neue Flyer, PDF-Dokumente und Materialien hinzufügen.");
 const grid=split(wrapper),left=panel("Dateien"),right=panel("Download bearbeiten"),items=state.data.items||(state.data.items=[]);
 left.append(smallButton("+ Neuer Download",()=>{items.unshift({visible:false,file:"",translations:{de:{title:"Neues Material",description:""}}});state.selection=0;mark();render();},"cyan"));
 left.append(records(items,x=>x.translations?.de?.title||"Ohne Titel",i=>{state.selection=i;render();},state.selection));grid.append(left,right);
 const item=items[state.selection];if(!item)return;
 addCheck(right,"Auf Website anzeigen",item.visible,v=>item.visible=v);
 mediaField(right,"Datei hochladen / URL",item.file||"",v=>item.file=v,"documents");
 const row=el("div","toolbar");row.append(el("span","hint","Sprache"));langPicker(row,render);right.append(row);
 item.translations ||= {};item.translations[state.language] ||= {};const t=item.translations[state.language];
 addField(right,"Bezeichnung",t.title,v=>t.title=v);
 addField(right,"Beschreibung",t.description,v=>t.description=v,{long:true});
 right.append(smallButton("Download entfernen",()=>{if(!confirm("Download entfernen?"))return;items.splice(state.selection,1);state.selection=0;mark();render();},"danger"));
 addPreview(wrapper,"downloads","index.html");
}
function renderPage(){
 const s=currentSection(),wrapper=shell(s.label,"Website-Texte, Bilder und Links ohne Code bearbeiten.");
 const row=el("div","toolbar");row.append(el("span","hint","Sprache auswählen"));langPicker(row,render);wrapper.append(row);
 const grid=split(wrapper),left=panel("Texte der Seite"),right=panel("Bilder & Links");
 left.classList.add("page-keys");state.data.texts ||= {};state.data.texts[state.language] ||= {};
 const de=state.data.texts.de||{},items=Object.keys(de);
 if(!items.length)left.append(el("p","muted","Keine editierbaren Textfelder."));
 items.forEach(key=>{
  const obj=state.data.texts[state.language];
  addField(left,key,obj[key]??"",v=>obj[key]=v,{long:safe(de[key]).length>125||safe(obj[key]).length>125});
 });
 if(Array.isArray(state.data.images))state.data.images.forEach((im,i)=>{
  mediaField(right,"Bild "+(i+1)+" · "+(im.key||""),im.source||"",v=>im.source=v,"pages");
  addField(right,"Bildbeschreibung",im.alt,v=>im.alt=v);
 });
 if(Array.isArray(state.data.links))state.data.links.forEach((link,i)=>{addField(right,"Link "+(i+1)+" · "+safe(link.key),link.url,v=>link.url=v);});
 if(state.data.plain)Object.entries(state.data.plain).forEach(([key,value])=>{addField(right,"Zusatzfeld: "+key,value,v=>state.data.plain[key]=v,{long:safe(value).length>120});});
 grid.append(left,right);addPreview(wrapper,"page",s.page);
}
function addPreview(parent,kind,path){
 const box=panel("Website-Vorschau"),label=el("div","preview-label");
 label.append(el("span","hint","Anzeige im tatsächlichen Redesign"),smallButton("Vorschau aktualisieren",sendPreview));
 const frame=el("iframe");frame.src="/"+path+"?cms-preview=1";frame.title="ProBe Website-Vorschau";
 frame.addEventListener("load",()=>setTimeout(sendPreview,100));box.classList.add("preview");box.append(label,frame);parent.append(box);
}
function sendPreview(){
 const iframe=$("#editor iframe");if(!iframe||!state.data)return;
 const kind=state.section.startsWith("page-")?"page":state.section;
 iframe.contentWindow?.postMessage({type:"probe:cms-preview",kind,data:state.data},location.origin);
}
function renderMedia(){
 const wrapper=shell("Medien hochladen","Bilder und PDF-Dokumente zentral speichern und ihre URLs verwenden.");
 const card=panel("Dateien");wrapper.append(card);
 mediaField(card,"Neues Medium hochladen",state.media,v=>state.media=v,"general");
 card.append(el("p","hint","Upload erfolgt in den geschützten Redaktionsbereich mit öffentlich auslieferbaren Bilddateien. Nur freigegebene Redakteurinnen können Dateien hinzufügen."));
}
function render(){renderNav();if(state.section==="news")renderNews();else if(state.section==="team")renderTeam();else if(state.section==="settings")renderSettings();else if(state.section==="downloads")renderDownloads();else if(state.section==="media")renderMedia();else renderPage();}
async function save(publish=false){
 if(!state.data)return;
 if(DEMO){
  state.dirty=false;
  $("#save-state").textContent=publish?"Demo: Veröffentlichung simuliert":"Demo: Speichern simuliert";
  toast(publish?"Demovorschau: Nichts wurde auf der Website veröffentlicht.":"Demovorschau: Nichts wurde in der Datenbank gespeichert.");
  return;
 }
 const button=$(publish?"#publish":"#save-draft");button.disabled=true;
 $("#save-state").textContent=publish?"Veröffentliche …":"Speichere …";
 try{
 const table=publish?"probe_cms_published":"probe_cms_drafts";
 const {error}=await db.from(table).upsert({slug:state.section,content:state.data,updated_at:new Date().toISOString()},{onConflict:"slug"});
 if(error)throw error;
 if(publish){state.published=clone(state.data);await db.from("probe_cms_drafts").delete().eq("slug",state.section);}
 state.dirty=false;$("#save-state").textContent=publish?"Veröffentlicht":"Entwurf gespeichert";
 toast(publish?"Inhalte wurden für die Redesign-Vorschau veröffentlicht.":"Entwurf gespeichert – noch nicht veröffentlicht.");
 }catch(err){toast(errorMessage(err),true);$("#save-state").textContent="Speichern fehlgeschlagen";}
 finally{button.disabled=false;}
}
$("#save-draft").addEventListener("click",()=>save(false));
$("#publish").addEventListener("click",()=>{
 if(confirm("Diese Inhalte für die Redesign-Vorschau veröffentlichen? Die bestehende Live-Website bleibt unverändert."))save(true);
});
if(DEMO)loggedIn();else authenticate().catch(err=>{$("#auth-message").textContent="Verbindung nicht verfügbar: "+errorMessage(err);});
