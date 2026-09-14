'use strict';
(() => {
  const $=s=>document.querySelector(s);
  const form=$('#group-form'), nameInput=$('#group-name'), urlInput=$('#group-url');
  const list=$('#group-list'), empty=$('#group-empty'), text=$('#post-text');
  const progressText=$('#group-progress-text'), progressBar=$('#group-progress-bar');
  const copyBtn=$('#copy-post-text'), resetBtn=$('#reset-groups');
  const pasteBtn=$('#paste-group'), pasteStatus=$('#paste-status');
  const importField=$('#group-import'), importBtn=$('#import-groups'), importStatus=$('#group-import-status');
  const startRoundBtn=$('#start-round'), roundCard=$('#round-card'), roundProgress=$('#round-progress');
  const roundState=$('#round-state'), roundName=$('#round-group-name'), roundLastPlaced=$('#round-last-placed');
  const roundCopy=$('#round-copy'), roundShare=$('#round-share'), roundOpen=$('#round-open');
  const roundDone=$('#round-done'), roundSkip=$('#round-skip'), roundNext=$('#round-next');
  if(!form)return;

  const GROUPS_KEY='dm-facebook-groups-v1';
  const TEXT_KEY='dm-facebook-post-text-v1';
  const ROUND_KEY='dm-facebook-round-v1';
  let groups=[], round=null;

  const makeId=()=>globalThis.crypto?.randomUUID?.()||`g-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try{
    const saved=JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]');
    groups=Array.isArray(saved)?saved.map((g,index)=>({
      id:g.id||makeId(),name:g.name||`Facebook-groep ${index+1}`,url:g.url||'',
      active:g.active!==false,selected:g.selected!==false,done:!!g.done,
      lastPlaced:g.lastPlaced||null,order:Number.isFinite(g.order)?g.order:index
    })).filter(g=>g.url):[];
  }catch{groups=[]}
  try{round=JSON.parse(localStorage.getItem(ROUND_KEY)||'null')}catch{round=null}
  text.value=localStorage.getItem(TEXT_KEY)||'Nieuwe handgemaakte kaart van DM-Creations ✨\n\nInteresse? Stuur gerust een bericht!';

  function save(){localStorage.setItem(GROUPS_KEY,JSON.stringify(groups))}
  function saveRound(){if(round)localStorage.setItem(ROUND_KEY,JSON.stringify(round));else localStorage.removeItem(ROUND_KEY)}
  function cleanUrl(value){
    let url=(value||'').trim();
    if(!url)throw new Error('Geen Facebook-groepslink gevonden.');
    if(!/^https?:\/\//i.test(url))url='https://'+url;
    try{
      const u=new URL(url);
      if(!/(^|\.)(facebook\.com|fb\.com)$/i.test(u.hostname))throw new Error();
      const parts=u.pathname.split('/').filter(Boolean),gi=parts.findIndex(p=>p.toLowerCase()==='groups');
      if(gi<0||!parts[gi+1])throw new Error();
      const groupPart=parts[gi+1];
      return `https://www.facebook.com/groups/${encodeURIComponent(decodeURIComponent(groupPart))}/`;
    }catch{throw new Error('Gebruik een geldige Facebook-groepslink.')}
  }
  function urlKey(url){try{const u=new URL(url);return u.pathname.replace(/\/+$/,'').toLowerCase()}catch{return url.toLowerCase()}}
  function prettySegment(segment){try{segment=decodeURIComponent(segment)}catch{}return segment.replace(/[._-]+/g,' ').replace(/\s+/g,' ').trim().replace(/\b\w/g,c=>c.toUpperCase())}
  function guessName(url){
    try{const parts=new URL(url).pathname.split('/').filter(Boolean),gi=parts.indexOf('groups');if(gi>=0&&parts[gi+1]&&!/^\d+$/.test(parts[gi+1])){const guessed=prettySegment(parts[gi+1]);if(guessed)return guessed}}catch{}
    return `Facebook-groep ${groups.length+1}`;
  }
  function parseLine(line){
    const raw=line.trim();if(!raw)return null;let name='',urlPart=raw;
    if(raw.includes('|')){const parts=raw.split('|');name=parts.shift().trim();urlPart=parts.join('|').trim()}
    else{const match=raw.match(/https?:\/\/[^\s]+/i);if(match){urlPart=match[0];name=raw.slice(0,match.index).trim().replace(/[-–—:]+$/,'').trim()}}
    const url=cleanUrl(urlPart);return {name:name||guessName(url),url};
  }
  function addGroup(name,url){
    const clean=cleanUrl(url),key=urlKey(clean);if(groups.some(g=>urlKey(g.url)===key))return false;
    groups.push({id:makeId(),name:(name||'').trim()||guessName(clean),url:clean,active:true,selected:true,done:false,lastPlaced:null,order:groups.length});return true;
  }
  function importLines(value){
    const lines=(value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);let added=0,duplicates=0,invalid=0;
    for(const line of lines){try{const parsed=parseLine(line);if(!parsed)continue;addGroup(parsed.name,parsed.url)?added++:duplicates++}catch{invalid++}}
    if(added)save();render();return {added,duplicates,invalid,total:lines.length};
  }
  async function copyText(){
    const value=text.value.trim();if(!value)return false;
    try{await navigator.clipboard.writeText(value);return true}catch{text.focus();text.select();return document.execCommand('copy')}
  }
  function formatDate(value){if(!value)return 'Nog niet eerder geplaatst';try{return `Laatst geplaatst: ${new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value))}`}catch{return 'Laatst geplaatst: onbekend'}}
  function progress(){
    const active=groups.filter(g=>g.active),done=active.filter(g=>g.done).length,total=active.length;
    progressText.textContent=`${done} van ${total} geplaatst`;progressBar.style.width=total?`${Math.round(done/total*100)}%`:'0%';
  }
  function move(index,delta){
    const other=index+delta;if(other<0||other>=groups.length)return;[groups[index],groups[other]]=[groups[other],groups[index]];groups.forEach((g,i)=>g.order=i);save();render();
  }
  function editGroup(index){
    const group=groups[index],renamed=prompt('Naam van deze Facebook-groep:',group.name);if(renamed===null)return;
    const relink=prompt('Facebook-groepslink:',group.url);if(relink===null)return;
    try{const cleaned=cleanUrl(relink);if(groups.some((g,i)=>i!==index&&urlKey(g.url)===urlKey(cleaned))){alert('Deze groep staat al in je lijst.');return}group.name=renamed.trim()||guessName(cleaned);group.url=cleaned;save();render()}catch(err){alert(err.message)}
  }
  function render(){
    groups.sort((a,b)=>(a.order||0)-(b.order||0));list.innerHTML='';empty.hidden=groups.length>0;
    groups.forEach((group,index)=>{
      const row=document.createElement('div');row.className='group-row'+(group.done?' is-done':'')+(group.active?'':' is-inactive');
      const select=document.createElement('label');select.className='group-select';select.title='Meenemen in plaatsronde';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=group.selected&&group.active;checkbox.disabled=!group.active;
      const marker=document.createElement('span');marker.textContent='✓';select.append(checkbox,marker);
      checkbox.addEventListener('change',()=>{groups[index].selected=checkbox.checked;save()});

      const info=document.createElement('button');info.type='button';info.className='group-info group-name-edit';info.title='Tik om groep te wijzigen';
      const strong=document.createElement('strong');strong.textContent=group.name;
      const small=document.createElement('small');small.textContent=group.active?(group.done?'Geplaatst in huidige ronde':formatDate(group.lastPlaced)):'Uitgeschakeld';
      info.append(strong,small);info.addEventListener('click',()=>editGroup(index));

      const open=document.createElement('button');open.type='button';open.className='facebook-button group-open';open.textContent='Open';
      open.addEventListener('click',()=>{copyText();window.open(group.url,'_blank','noopener')});

      const tools=document.createElement('div');tools.className='group-mini-tools';
      const active=document.createElement('button');active.type='button';active.textContent=group.active?'Aan':'Uit';active.title='Groep activeren of uitschakelen';active.addEventListener('click',()=>{group.active=!group.active;if(!group.active)group.selected=false;save();render()});
      const up=document.createElement('button');up.type='button';up.textContent='↑';up.title='Omhoog';up.disabled=index===0;up.addEventListener('click',()=>move(index,-1));
      const down=document.createElement('button');down.type='button';down.textContent='↓';down.title='Omlaag';down.disabled=index===groups.length-1;down.addEventListener('click',()=>move(index,1));
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Verwijderen';remove.className='danger-mini';remove.addEventListener('click',()=>{if(confirm(`“${group.name}” verwijderen?`)){groups.splice(index,1);groups.forEach((g,i)=>g.order=i);save();render();renderRound()}});
      tools.append(active,up,down,remove);
      row.append(select,info,open,tools);list.append(row);
    });
    progress();renderRound();
  }

  function validRoundGroups(){
    if(!round?.ids?.length)return [];
    return round.ids.map(id=>groups.find(g=>g.id===id)).filter(Boolean);
  }
  function startRound(){
    const selected=groups.filter(g=>g.active&&g.selected);if(!selected.length){alert('Selecteer eerst minimaal één actieve Facebook-groep.');return}
    groups.forEach(g=>{if(selected.some(s=>s.id===g.id))g.done=false});save();
    round={ids:selected.map(g=>g.id),current:0,completed:[],skipped:[],startedAt:Date.now(),state:'active'};saveRound();render();roundCard.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function currentRoundGroup(){const arr=validRoundGroups();return {arr,group:arr[round?.current||0]}}
  function renderRound(){
    const {arr,group}=currentRoundGroup();
    if(!round||!arr.length){roundCard.hidden=true;startRoundBtn.textContent='Start plaatsronde';return}
    roundCard.hidden=false;startRoundBtn.textContent='Nieuwe plaatsronde';
    if(round.state==='finished'||!group){
      roundProgress.textContent=`${arr.length} groepen afgerond`;roundState.textContent='Klaar ✓';roundName.textContent='Plaatsronde afgerond';roundLastPlaced.textContent='Je kunt een nieuwe plaatsronde starten.';
      roundCopy.disabled=roundShare.disabled=roundOpen.disabled=roundDone.disabled=roundSkip.disabled=roundNext.disabled=true;return;
    }
    [roundCopy,roundShare,roundOpen,roundDone,roundSkip,roundNext].forEach(b=>b.disabled=false);
    roundProgress.textContent=`Groep ${round.current+1} van ${arr.length}`;
    const done=round.completed?.includes(group.id),skipped=round.skipped?.includes(group.id);
    roundState.textContent=done?'Geplaatst ✓':skipped?'Overgeslagen':'Bezig';roundName.textContent=group.name;roundLastPlaced.textContent=formatDate(group.lastPlaced);
    roundNext.textContent=round.current>=arr.length-1?'Ronde afronden':'Volgende groep';
  }
  function markDone(){
    const {group}=currentRoundGroup();if(!group)return;group.done=true;group.lastPlaced=Date.now();round.completed=[...new Set([...(round.completed||[]),group.id])];round.skipped=(round.skipped||[]).filter(id=>id!==group.id);save();saveRound();render();
  }
  function markSkipped(){
    const {group}=currentRoundGroup();if(!group)return;round.skipped=[...new Set([...(round.skipped||[]),group.id])];round.completed=(round.completed||[]).filter(id=>id!==group.id);saveRound();renderRound();
  }
  function nextRound(){
    const {arr}=currentRoundGroup();if(!arr.length)return;if(round.current>=arr.length-1){round.state='finished'}else round.current++;saveRound();renderRound();
  }

  form.addEventListener('submit',e=>{
    e.preventDefault();try{const url=cleanUrl(urlInput.value),name=nameInput.value.trim()||guessName(url);if(!addGroup(name,url)){alert('Deze groep staat al in je lijst.');return}save();render();form.reset();urlInput.focus()}catch(err){alert(err.message)}
  });
  pasteBtn?.addEventListener('click',async()=>{
    pasteStatus.textContent='';try{const clip=(await navigator.clipboard.readText()).trim();if(!clip)throw new Error();const result=importLines(clip);if(result.added){pasteStatus.textContent=`${result.added} groep${result.added===1?'':'en'} toegevoegd ✓`;return}if(result.duplicates){pasteStatus.textContent='Deze groep staat al in je lijst.';return}pasteStatus.textContent='Geen bruikbare Facebook-groepslink gevonden.'}catch{pasteStatus.textContent='Automatisch plakken is geblokkeerd. Gebruik de snelle import hieronder.'}
  });
  importBtn?.addEventListener('click',()=>{
    const result=importLines(importField.value),parts=[];if(result.added)parts.push(`${result.added} toegevoegd`);if(result.duplicates)parts.push(`${result.duplicates} al aanwezig`);if(result.invalid)parts.push(`${result.invalid} ongeldig`);importStatus.textContent=parts.length?parts.join(' · '):'Plak eerst één of meerdere Facebook-links.';if(result.added)importField.value='';
  });
  text.addEventListener('input',()=>localStorage.setItem(TEXT_KEY,text.value));
  copyBtn.addEventListener('click',async()=>{copyBtn.textContent=await copyText()?'Tekst gekopieerd ✓':'Kopiëren mislukt';setTimeout(()=>copyBtn.textContent='Kopieer tekst',1400)});
  resetBtn.addEventListener('click',()=>{groups=groups.map(g=>({...g,done:false}));round=null;save();saveRound();render()});
  startRoundBtn?.addEventListener('click',startRound);
  roundCopy?.addEventListener('click',async()=>{roundCopy.textContent=await copyText()?'Gekopieerd ✓':'Kopiëren mislukt';setTimeout(()=>roundCopy.textContent='Kopieer tekst',1200)});
  roundShare?.addEventListener('click',()=>window.DMCreations?.shareFiles?.());
  roundOpen?.addEventListener('click',()=>{const {group}=currentRoundGroup();if(!group)return;copyText();window.open(group.url,'_blank','noopener')});
  roundDone?.addEventListener('click',markDone);roundSkip?.addEventListener('click',markSkipped);roundNext?.addEventListener('click',nextRound);
  render();
})();
