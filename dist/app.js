'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const input=$('#photo-input'), list=$('#preview-list'), empty=$('#empty-state'), statusEl=$('#status');
const processBtn=$('#process-all'), shareBtn=$('#share-all'), saveBtn=$('#save-all');
const facebookShareBtn=$('#facebook-share-photos'), facebookPhotoStatus=$('#facebook-photo-status');

const logo=new Image(), brandLogo=new Image();
const logoReady=fetch('./assets/dm-creations-watermark.b64')
  .then(r=>{if(!r.ok)throw new Error('Watermark kon niet worden geladen.');return r.text()})
  .then(b64=>new Promise((resolve,reject)=>{logo.onload=resolve;logo.onerror=reject;logo.src='data:image/png;base64,'+b64.trim()}));
const brandLogoReady=new Promise((resolve,reject)=>{brandLogo.onload=resolve;brandLogo.onerror=reject;brandLogo.src='./assets/dm-creations-logo.png'});

const SETTINGS_KEY='dm-watermark-settings-v2';
const PRICE_KEY='dm-price-settings-v1';
const TAB_KEY='dm-active-tab-v1';
const settings={size:18,opacity:95,margin:3,position:'bottom-right'};
const priceSettings={enabled:false,value:'4,50',style:'brand',position:'bottom-left',size:'normal'};
let items=[], renderTimer;

try{Object.assign(settings,JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'))}catch{}
try{const saved=JSON.parse(localStorage.getItem(PRICE_KEY)||'{}');Object.assign(priceSettings,saved,{enabled:false})}catch{}

for(const key of ['size','opacity','margin']){
  const el=$('#'+key);el.value=settings[key];$('#'+key+'-output').value=settings[key]+'%';
}
const initialPosition=document.querySelector(`input[name="position"][value="${settings.position}"]`);if(initialPosition)initialPosition.checked=true;

const priceEnabled=$('#price-enabled'), priceOptions=$('#price-options'), priceValue=$('#price-value'), priceSize=$('#price-size');
priceEnabled.checked=false;
priceValue.value=priceSettings.value;
priceSize.value=priceSettings.size;
const initialPriceStyle=document.querySelector(`input[name="price-style"][value="${priceSettings.style}"]`);if(initialPriceStyle)initialPriceStyle.checked=true;
const initialPricePosition=document.querySelector(`input[name="price-position"][value="${priceSettings.position}"]`);if(initialPricePosition)initialPricePosition.checked=true;

function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
function savePriceSettings(){
  const {value,style,position,size}=priceSettings;
  localStorage.setItem(PRICE_KEY,JSON.stringify({value,style,position,size}));
}
function emitFilesChanged(){
  const detail={selected:items.length,processed:items.filter(i=>i.output).length};
  window.dispatchEvent(new CustomEvent('dm:files-updated',{detail}));
  updateFacebookPhotoStatus(detail);
}
function updateFacebookPhotoStatus(detail={selected:items.length,processed:items.filter(i=>i.output).length}){
  if(!facebookPhotoStatus)return;
  if(!detail.selected){facebookPhotoStatus.textContent='Nog geen foto’s gekozen.';facebookShareBtn.disabled=true;return}
  facebookPhotoStatus.textContent=`${detail.selected} foto${detail.selected===1?'':'’s'} geselecteerd${detail.processed?` · ${detail.processed} verwerkt`:''}.`;
  facebookShareBtn.disabled=false;
}
function invalidateItem(item){
  item.output=null;
  item.card.querySelector('.item-actions').hidden=true;
}
function changed(){
  for(const item of items)invalidateItem(item);
  shareBtn.disabled=saveBtn.disabled=true;
  statusEl.textContent=items.length?'Voorbeelden bijgewerkt. Tik op Alles verwerken voor delen of bewaren.':'';
  clearTimeout(renderTimer);renderTimer=setTimeout(renderAllPreviews,90);emitFilesChanged();
}
function changedItem(item){
  invalidateItem(item);
  shareBtn.disabled=saveBtn.disabled=true;
  statusEl.textContent='Prijs voor deze foto bijgewerkt. Tik op Alles verwerken voor delen of bewaren.';
  clearTimeout(item.renderTimer);
  item.renderTimer=setTimeout(()=>renderPreview(item),90);
  emitFilesChanged();
}
function refreshPriceInputs(){
  for(const item of items){
    const row=item.card.querySelector('.item-price'), field=item.card.querySelector('.item-price-input');
    row.hidden=!priceSettings.enabled;
    if(field&&field.value!==item.priceValue)field.value=item.priceValue;
  }
}

for(const key of ['size','opacity','margin']){
  $('#'+key).addEventListener('input',e=>{settings[key]=Number(e.target.value);$('#'+key+'-output').value=e.target.value+'%';saveSettings();changed()});
}
$('#positions').addEventListener('change',e=>{if(e.target.name==='position'){settings.position=e.target.value;saveSettings();changed()}});

priceEnabled.addEventListener('change',()=>{
  priceSettings.enabled=priceEnabled.checked;
  priceOptions.hidden=!priceSettings.enabled;
  refreshPriceInputs();
  changed();
});
priceValue.addEventListener('input',()=>{
  priceSettings.value=priceValue.value;
  savePriceSettings();
  for(const item of items){
    if(!item.priceCustom){
      item.priceValue=priceSettings.value;
      const field=item.card.querySelector('.item-price-input');
      if(field)field.value=item.priceValue;
    }
  }
  changed();
});
$('#price-styles').addEventListener('change',e=>{if(e.target.name==='price-style'){priceSettings.style=e.target.value;savePriceSettings();changed()}});
$('#price-positions').addEventListener('change',e=>{if(e.target.name==='price-position'){priceSettings.position=e.target.value;savePriceSettings();changed()}});
priceSize.addEventListener('change',()=>{priceSettings.size=priceSize.value;savePriceSettings();changed()});

function friendlyBytes(n){return n<1e6?Math.round(n/1024)+' KB':(n/1e6).toFixed(1)+' MB'}
async function loadBitmap(file){
  if('createImageBitmap' in window){try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch{}}
  return await new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Deze foto kan Safari niet openen. Zet HEIC zo nodig eerst om naar JPEG in de Foto’s-app.'))};
    img.src=url;
  });
}
function coordinates(w,h,lw,lh){
  const m=Math.min(w,h)*settings.margin/100;
  switch(settings.position){case'top-left':return[m,m];case'top-right':return[w-lw-m,m];case'bottom-left':return[m,h-lh-m];case'center':return[(w-lw)/2,(h-lh)/2];default:return[w-lw-m,h-lh-m]}
}
function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}
function priceText(value=priceSettings.value){
  let raw=String(value||'').trim().replace(/€/g,'').replace(/\s/g,'').replace('.',',');
  if(!raw)raw='0,00';
  if(/^\d+$/.test(raw))raw+=',00';
  else if(/^\d+,\d$/.test(raw))raw+='0';
  return `€ ${raw}`;
}
function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function cornerPosition(position,w,h,lw,lh,m){
  switch(position){case'top-left':return[m,m];case'top-right':return[w-lw-m,m];case'bottom-right':return[w-lw-m,h-lh-m];default:return[m,h-lh-m]}
}
function drawPriceLabel(ctx,w,h,watermarkRect,itemPrice){
  if(!priceSettings.enabled)return;
  const minSide=Math.min(w,h), scale={small:.82,normal:1,large:1.2}[priceSettings.size]||1;
  const fs=Math.max(18,minSide*.032*scale), padX=fs*.75, padY=fs*.48, gap=fs*.38;
  const price=priceText(itemPrice);
  let title='',logoSize=0;
  ctx.save();ctx.textBaseline='middle';
  if(priceSettings.style==='available')title='♥ BESCHIKBAAR';
  if(priceSettings.style==='brand'){title='DM-Creations';logoSize=fs*1.65}
  ctx.font=`700 ${fs}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
  const priceWidth=ctx.measureText(price).width;
  let width,height;
  if(priceSettings.style==='price'){
    width=priceWidth+padX*2;height=fs+padY*2;
  }else if(priceSettings.style==='available'){
    const t=ctx.measureText(title).width;width=Math.max(t,priceWidth)+padX*2;height=fs*2+padY*2+gap*.35;
  }else{
    ctx.font=`700 ${fs*.92}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    const t=ctx.measureText(title).width;width=Math.max(t,priceWidth)+padX*2+logoSize+gap;height=Math.max(logoSize,fs*2+gap*.2)+padY*2;
  }
  const m=minSide*.03;
  let [x,y]=cornerPosition(priceSettings.position,w,h,width,height,m);
  let rect={x,y,w:width,h:height};
  if(watermarkRect&&rectsOverlap(rect,watermarkRect)){
    const delta=watermarkRect.h+m;
    if(priceSettings.position.startsWith('bottom'))y=Math.max(m,y-delta);
    else y=Math.min(h-height-m,y+delta);
    rect={x,y,w:width,h:height};
  }
  const radius=Math.min(height*.28,fs*.75);
  ctx.shadowColor='rgba(18,61,43,.18)';ctx.shadowBlur=fs*.35;ctx.shadowOffsetY=fs*.12;
  roundRect(ctx,x,y,width,height,radius);
  if(priceSettings.style==='brand')ctx.fillStyle='rgba(255,250,240,.97)';else ctx.fillStyle='rgba(255,255,255,.96)';ctx.fill();
  ctx.shadowColor='transparent';ctx.lineWidth=Math.max(2,minSide*.0025);
  ctx.strokeStyle=priceSettings.style==='brand'?'#c99637':'rgba(18,61,43,.18)';ctx.stroke();

  if(priceSettings.style==='price'){
    ctx.fillStyle='#123d2b';ctx.font=`800 ${fs}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;ctx.textAlign='center';ctx.fillText(price,x+width/2,y+height/2);
  }else if(priceSettings.style==='available'){
    ctx.textAlign='center';ctx.fillStyle='#123d2b';ctx.font=`800 ${fs*.76}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;ctx.fillText(title,x+width/2,y+padY+fs*.45);
    ctx.font=`800 ${fs}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;ctx.fillText(price,x+width/2,y+height-padY-fs*.42);
  }else{
    const lx=x+padX,ly=y+(height-logoSize)/2;
    ctx.save();roundRect(ctx,lx,ly,logoSize,logoSize,logoSize/2);ctx.clip();ctx.drawImage(brandLogo,lx,ly,logoSize,logoSize);ctx.restore();
    const tx=lx+logoSize+gap,avail=width-(tx-x)-padX;
    ctx.textAlign='left';ctx.fillStyle='#123d2b';ctx.font=`800 ${fs*.9}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;ctx.fillText('DM-Creations',tx,y+height*.38);
    ctx.fillStyle='#9b6b1d';ctx.font=`800 ${fs}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;ctx.fillText(price,tx,y+height*.68,avail);
  }
  ctx.restore();
}
function draw(target,source,maxSide=0,item=null){
  let w=source.width||source.naturalWidth,h=source.height||source.naturalHeight;
  if(maxSide&&Math.max(w,h)>maxSide){const scale=maxSide/Math.max(w,h);w=Math.round(w*scale);h=Math.round(h*scale)}
  target.width=w;target.height=h;
  const ctx=target.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,w,h);
  const lw=w*settings.size/100,lh=lw*(logo.naturalHeight/logo.naturalWidth),[x,y]=coordinates(w,h,lw,lh);
  ctx.globalAlpha=settings.opacity/100;ctx.drawImage(logo,x,y,lw,lh);ctx.globalAlpha=1;
  drawPriceLabel(ctx,w,h,{x,y,w:lw,h:lh},item?.priceValue??priceSettings.value);
}
async function renderPreview(item){
  const loading=item.card.querySelector('.loading'),err=item.card.querySelector('.item-error');loading.hidden=false;err.hidden=true;
  try{await Promise.all([logoReady,brandLogoReady]);if(!item.bitmap)item.bitmap=await loadBitmap(item.file);draw(item.canvas,item.bitmap,1400,item);item.card.querySelector('.file-meta').textContent=`${item.bitmap.width} × ${item.bitmap.height} · ${friendlyBytes(item.file.size)}`}
  catch(e){err.textContent=e.message;err.hidden=false}finally{loading.hidden=true}
}
async function renderAllPreviews(){await Promise.allSettled([logoReady,brandLogoReady]);await Promise.all(items.map(renderPreview))}

input.addEventListener('change',async()=>{
  for(const file of input.files){
    const t=$('#preview-template').content.cloneNode(true),card=t.querySelector('.preview-card');
    const item={file,card,canvas:t.querySelector('canvas'),bitmap:null,output:null,priceValue:priceSettings.value,priceCustom:false,renderTimer:null};
    card.querySelector('.file-name').textContent=file.name;
    card.querySelector('.remove').addEventListener('click',()=>removeItem(item));
    card.querySelector('.share-one').addEventListener('click',()=>shareFiles([item]));
    card.querySelector('.save-one').addEventListener('click',()=>saveToPhotos([item]));
    const itemPrice=card.querySelector('.item-price'),itemPriceInput=card.querySelector('.item-price-input');
    itemPrice.hidden=!priceSettings.enabled;
    itemPriceInput.value=item.priceValue;
    itemPriceInput.addEventListener('input',()=>{
      item.priceValue=itemPriceInput.value;
      item.priceCustom=true;
      changedItem(item);
    });
    list.append(t);items.push(item);
  }
  input.value='';refresh();await renderAllPreviews();
});
function removeItem(item){if(item.bitmap?.close)item.bitmap.close();clearTimeout(item.renderTimer);items=items.filter(x=>x!==item);item.card.remove();refresh()}
function refresh(){
  empty.hidden=items.length>0;processBtn.disabled=!items.length;
  $('#preview-help').textContent=items.length?`${items.length} foto${items.length===1?'':'’s'} klaar voor verwerking.`:'Kies foto’s om het resultaat vooraf te bekijken.';
  if(!items.length){shareBtn.disabled=saveBtn.disabled=true;statusEl.textContent=''}
  refreshPriceInputs();emitFilesChanged();
}
function outputType(file){return file.type==='image/png'?'image/png':file.type==='image/webp'?'image/webp':'image/jpeg'}
function extension(type){return type==='image/png'?'png':type==='image/webp'?'webp':'jpg'}
async function processItem(item){
  await Promise.all([logoReady,brandLogoReady]);if(!item.bitmap)item.bitmap=await loadBitmap(item.file);
  const canvas=document.createElement('canvas');draw(canvas,item.bitmap,0,item);
  const type=outputType(item.file),blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Verwerken mislukt.')),type,type==='image/jpeg'?0.95:undefined));
  const base=item.file.name.replace(/\.[^.]+$/,'');item.output=new File([blob],`${base}-DM-Creations.${extension(type)}`,{type,lastModified:Date.now()});
  item.card.querySelector('.item-actions').hidden=false;return item.output;
}
processBtn.addEventListener('click',async()=>{
  processBtn.disabled=true;statusEl.textContent=`0 van ${items.length} verwerkt…`;let done=0,ok=0;
  for(const item of items){
    try{await processItem(item);ok++}catch(e){const p=item.card.querySelector('.item-error');p.textContent=e.message;p.hidden=false}
    statusEl.textContent=`${++done} van ${items.length} verwerkt…`;await new Promise(r=>setTimeout(r,0));
  }
  statusEl.textContent=`Klaar: ${ok} foto${ok===1?'':'’s'} verwerkt.`;shareBtn.disabled=saveBtn.disabled=!ok;processBtn.disabled=false;emitFilesChanged();
});
async function ensureOutputs(selected=items){for(const item of selected)if(!item.output)await processItem(item);emitFilesChanged();return selected.filter(i=>i.output).map(i=>i.output)}

async function nativeShare(files,title,text){if(!navigator.share||!navigator.canShare?.({files}))return false;await navigator.share({files,title,text});return true}
async function shareFiles(selected=items){
  try{const files=await ensureOutputs(selected);if(!files.length)return false;if(await nativeShare(files,'DM-Creations foto’s','DM-Creations')){statusEl.textContent='Deelmenu geopend.';return true}
    if(files.length>1){statusEl.textContent='Je apparaat kan deze foto’s niet samen delen. Gebruik Delen bij elke foto.';selected[0]?.card?.scrollIntoView({behavior:'smooth',block:'center'})}else statusEl.textContent='Delen van bestanden wordt hier niet ondersteund.';
  }catch(e){if(e.name!=='AbortError')statusEl.textContent='Delen lukte niet. Probeer opnieuw.'}return false;
}
async function saveToPhotos(selected=items){
  try{const files=await ensureOutputs(selected);if(!files.length)return false;if(await nativeShare(files,'DM-Creations foto’s','')){statusEl.textContent='Kies in het deelmenu “Bewaar afbeelding” of “Bewaar afbeeldingen”.';return true}
    files.forEach((f,i)=>setTimeout(()=>saveFile(f),i*350));statusEl.textContent='Download gestart. Safari kan niet rechtstreeks in Foto’s opslaan.';return true;
  }catch(e){if(e.name!=='AbortError')statusEl.textContent='Bewaren lukte niet. Probeer opnieuw.'}return false;
}
shareBtn.addEventListener('click',()=>shareFiles(items));
saveBtn.addEventListener('click',()=>saveToPhotos(items));
facebookShareBtn?.addEventListener('click',()=>shareFiles(items));
function saveFile(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}

function activateTab(name,remember=true){
  const isFacebook=name==='facebook';
  $('#tab-edit').hidden=isFacebook;$('#tab-edit').classList.toggle('is-active',!isFacebook);
  $('#tab-facebook').hidden=!isFacebook;$('#tab-facebook').classList.toggle('is-active',isFacebook);
  $('#edit-actions').hidden=isFacebook;document.body.dataset.activeTab=isFacebook?'facebook':'edit';
  for(const button of $$('.tab-button')){const active=button.dataset.tab===name;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',active?'true':'false')}
  if(remember)localStorage.setItem(TAB_KEY,name);
}
for(const button of $$('.tab-button'))button.addEventListener('click',()=>activateTab(button.dataset.tab));
activateTab(localStorage.getItem(TAB_KEY)==='facebook'?'facebook':'edit',false);

window.DMCreations={
  ensureOutputs:()=>ensureOutputs(items),
  shareFiles:()=>shareFiles(items),
  saveToPhotos:()=>saveToPhotos(items),
  getCounts:()=>({selected:items.length,processed:items.filter(i=>i.output).length})
};
emitFilesChanged();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
