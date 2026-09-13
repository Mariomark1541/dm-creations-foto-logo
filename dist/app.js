'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const input=$('#photo-input'), list=$('#preview-list'), empty=$('#empty-state'), statusEl=$('#status');
const processBtn=$('#process-all'), shareBtn=$('#share-all'), saveBtn=$('#save-all');
const logo=new Image(); logo.src='./assets/dm-creations-logo.png';
const settings={size:12,opacity:70,margin:3,position:'bottom-right'};
let items=[], renderTimer;

try{Object.assign(settings,JSON.parse(localStorage.getItem('dm-watermark-settings')||'{}'))}catch{}
for(const key of ['size','opacity','margin']){const el=$('#'+key); el.value=settings[key]; $('#'+key+'-output').value=settings[key]+'%'}
const initialPosition=document.querySelector(`input[name="position"][value="${settings.position}"]`); if(initialPosition) initialPosition.checked=true;

function saveSettings(){localStorage.setItem('dm-watermark-settings',JSON.stringify(settings))}
function changed(){for(const item of items){item.output=null;item.card.querySelector('.item-actions').hidden=true}shareBtn.disabled=saveBtn.disabled=true;statusEl.textContent=items.length?'Voorbeelden bijgewerkt. Tik op Alles verwerken voor delen of opslaan.':'';clearTimeout(renderTimer);renderTimer=setTimeout(renderAllPreviews,90)}
for(const key of ['size','opacity','margin']){$('#'+key).addEventListener('input',e=>{settings[key]=Number(e.target.value);$('#'+key+'-output').value=e.target.value+'%';saveSettings();changed()})}
$('#positions').addEventListener('change',e=>{if(e.target.name==='position'){settings.position=e.target.value;saveSettings();changed()}});

function friendlyBytes(n){return n<1e6?Math.round(n/1024)+' KB':(n/1e6).toFixed(1)+' MB'}
async function loadBitmap(file){
  if('createImageBitmap' in window){try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch{}}
  return await new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Deze foto kan Safari niet openen. Zet HEIC zo nodig eerst om naar JPEG in de Foto’s-app.'))};img.src=url});
}
function coordinates(w,h,lw,lh){const m=Math.min(w,h)*settings.margin/100;switch(settings.position){case'top-left':return[m,m];case'top-right':return[w-lw-m,m];case'bottom-left':return[m,h-lh-m];case'center':return[(w-lw)/2,(h-lh)/2];default:return[w-lw-m,h-lh-m]}}
function draw(target,source,maxSide=0){let w=source.width||source.naturalWidth,h=source.height||source.naturalHeight;if(maxSide&&Math.max(w,h)>maxSide){const scale=maxSide/Math.max(w,h);w=Math.round(w*scale);h=Math.round(h*scale)}target.width=w;target.height=h;const ctx=target.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,w,h);const lw=w*settings.size/100,lh=lw*(logo.naturalHeight/logo.naturalWidth),[x,y]=coordinates(w,h,lw,lh);ctx.globalAlpha=settings.opacity/100;ctx.drawImage(logo,x,y,lw,lh);ctx.globalAlpha=1}
async function renderPreview(item){const loading=item.card.querySelector('.loading'),err=item.card.querySelector('.item-error');loading.hidden=false;err.hidden=true;try{if(!item.bitmap)item.bitmap=await loadBitmap(item.file);draw(item.canvas,item.bitmap,1400);item.card.querySelector('.file-meta').textContent=`${item.bitmap.width} × ${item.bitmap.height} · ${friendlyBytes(item.file.size)}`}catch(e){err.textContent=e.message;err.hidden=false}finally{loading.hidden=true}}
async function renderAllPreviews(){await logo.decode().catch(()=>{});await Promise.all(items.map(renderPreview))}

input.addEventListener('change',async()=>{for(const file of input.files){const t=$('#preview-template').content.cloneNode(true),card=t.querySelector('.preview-card'),item={file,card,canvas:t.querySelector('canvas'),bitmap:null,output:null};card.querySelector('.file-name').textContent=file.name;card.querySelector('.remove').addEventListener('click',()=>removeItem(item));card.querySelector('.share-one').addEventListener('click',()=>shareFiles([item]));card.querySelector('.save-one').addEventListener('click',()=>saveItem(item));list.append(t);items.push(item)}input.value='';refresh();await renderAllPreviews()});
function removeItem(item){if(item.bitmap?.close)item.bitmap.close();items=items.filter(x=>x!==item);item.card.remove();refresh()}
function refresh(){empty.hidden=items.length>0;processBtn.disabled=!items.length;$('#preview-help').textContent=items.length?`${items.length} foto${items.length===1?'':'’s'} klaar voor verwerking.`:'Kies foto’s om het resultaat vooraf te bekijken.';if(!items.length){shareBtn.disabled=saveBtn.disabled=true;statusEl.textContent=''}}
function outputType(file){return file.type==='image/png'?'image/png':file.type==='image/webp'?'image/webp':'image/jpeg'}
function extension(type){return type==='image/png'?'png':type==='image/webp'?'webp':'jpg'}
async function processItem(item){if(!item.bitmap)item.bitmap=await loadBitmap(item.file);const canvas=document.createElement('canvas');draw(canvas,item.bitmap);const type=outputType(item.file),blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Verwerken mislukt.')),type,type==='image/jpeg'?0.95:undefined));const base=item.file.name.replace(/\.[^.]+$/,'');item.output=new File([blob],`${base}-DM-Creations.${extension(type)}`,{type,lastModified:Date.now()});item.card.querySelector('.item-actions').hidden=false;return item.output}
processBtn.addEventListener('click',async()=>{processBtn.disabled=true;statusEl.textContent=`0 van ${items.length} verwerkt…`;let done=0,ok=0;for(const item of items){try{await processItem(item);ok++}catch(e){const p=item.card.querySelector('.item-error');p.textContent=e.message;p.hidden=false}statusEl.textContent=`${++done} van ${items.length} verwerkt…`;await new Promise(r=>setTimeout(r,0))}statusEl.textContent=`Klaar: ${ok} foto${ok===1?'':'’s'} verwerkt.`;shareBtn.disabled=saveBtn.disabled=!ok;processBtn.disabled=false});
async function ensureOutputs(selected=items){for(const item of selected)if(!item.output)await processItem(item);return selected.filter(i=>i.output).map(i=>i.output)}
async function shareFiles(selected){try{const files=await ensureOutputs(selected);if(!files.length)return;if(navigator.share&&navigator.canShare?.({files})){await navigator.share({files,title:'DM-Creations foto’s'});statusEl.textContent='Deelmenu geopend.'}else if(files.length>1){statusEl.textContent='Je apparaat kan deze foto’s niet samen delen. Gebruik Delen bij elke foto.';selected.forEach(i=>i.card.querySelector('.item-actions').hidden=false);selected[0].card.scrollIntoView({behavior:'smooth',block:'center'})}else{statusEl.textContent='Delen van bestanden wordt hier niet ondersteund. Gebruik Opslaan.'}}catch(e){if(e.name!=='AbortError')statusEl.textContent='Delen lukte niet. Probeer Opslaan.'}}
shareBtn.addEventListener('click',()=>shareFiles(items));
function saveFile(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function saveItem(item){try{await ensureOutputs([item]);saveFile(item.output);statusEl.textContent='Download gestart. Je originele foto blijft bestaan.'}catch{statusEl.textContent='Opslaan lukte niet.'}}
saveBtn.addEventListener('click',async()=>{const files=await ensureOutputs();if(files.length>1&&!confirm(`${files.length} downloads starten? Safari kan per bestand om toestemming vragen.`))return;files.forEach((f,i)=>setTimeout(()=>saveFile(f),i*350));statusEl.textContent=`${files.length} download${files.length===1?'':'s'} gestart.`});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
