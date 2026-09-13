'use strict';
(() => {
  const $=s=>document.querySelector(s);
  const form=$('#group-form'), nameInput=$('#group-name'), urlInput=$('#group-url');
  const list=$('#group-list'), empty=$('#group-empty'), text=$('#post-text');
  const progressText=$('#group-progress-text'), progressBar=$('#group-progress-bar');
  const copyBtn=$('#copy-post-text'), resetBtn=$('#reset-groups');
  const pasteBtn=$('#paste-group'), pasteStatus=$('#paste-status');
  const importField=$('#group-import'), importBtn=$('#import-groups'), importStatus=$('#group-import-status');
  if(!form)return;

  const GROUPS_KEY='dm-facebook-groups-v1';
  const TEXT_KEY='dm-facebook-post-text-v1';
  let groups=[];
  try{groups=JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]')}catch{groups=[]}
  text.value=localStorage.getItem(TEXT_KEY)||'Nieuwe handgemaakte 3D-kaart van DM-Creations ✨\n\nInteresse? Stuur gerust een bericht!';

  function save(){localStorage.setItem(GROUPS_KEY,JSON.stringify(groups))}
  function cleanUrl(value){
    let url=(value||'').trim();
    if(!url)throw new Error('Geen Facebook-link gevonden.');
    if(!/^https?:\/\//i.test(url))url='https://'+url;
    try{
      const u=new URL(url);
      if(!/(^|\.)(facebook\.com|fb\.com)$/i.test(u.hostname))throw new Error();
      u.protocol='https:';
      u.hash='';
      u.search='';
      if(!u.pathname.endsWith('/'))u.pathname+='/'
      return u.href;
    }catch{throw new Error('Gebruik een geldige Facebook-link.')}
  }
  function urlKey(url){
    try{const u=new URL(url);return (u.hostname.replace(/^www\./,'')+u.pathname).replace(/\/+$/,'').toLowerCase()}catch{return url.toLowerCase()}
  }
  function prettySegment(segment){
    try{segment=decodeURIComponent(segment)}catch{}
    return segment.replace(/[._-]+/g,' ').replace(/\s+/g,' ').trim().replace(/\b\w/g,c=>c.toUpperCase());
  }
  function guessName(url){
    try{
      const parts=new URL(url).pathname.split('/').filter(Boolean);
      const gi=parts.indexOf('groups');
      if(gi>=0&&parts[gi+1]&&!/^\d+$/.test(parts[gi+1])&&!['feed','discover'].includes(parts[gi+1].toLowerCase())){
        const guessed=prettySegment(parts[gi+1]);
        if(guessed)return guessed;
      }
    }catch{}
    return `Facebook-groep ${groups.length+1}`;
  }
  function parseLine(line){
    const raw=line.trim();
    if(!raw)return null;
    let name='',urlPart=raw;
    if(raw.includes('|')){
      const parts=raw.split('|');
      name=parts.shift().trim();
      urlPart=parts.join('|').trim();
    }else{
      const match=raw.match(/https?:\/\/[^\s]+/i);
      if(match){urlPart=match[0];name=raw.slice(0,match.index).trim().replace(/[-–—:]+$/,'').trim()}
    }
    const url=cleanUrl(urlPart);
    return {name:name||guessName(url),url};
  }
  function addGroup(name,url){
    const clean=cleanUrl(url),key=urlKey(clean);
    if(groups.some(g=>urlKey(g.url)===key))return false;
    groups.push({name:(name||'').trim()||guessName(clean),url:clean,done:false});
    return true;
  }
  function importLines(value){
    const lines=(value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    let added=0,duplicates=0,invalid=0;
    for(const line of lines){
      try{const parsed=parseLine(line);if(!parsed)continue;addGroup(parsed.name,parsed.url)?added++:duplicates++}catch{invalid++}
    }
    if(added)save();
    render();
    return {added,duplicates,invalid,total:lines.length};
  }
  async function copyText(){
    const value=text.value.trim();
    if(!value)return false;
    try{await navigator.clipboard.writeText(value);return true}catch{
      text.focus();text.select();return document.execCommand('copy');
    }
  }
  function progress(){
    const done=groups.filter(g=>g.done).length,total=groups.length;
    progressText.textContent=`${done} van ${total} geplaatst`;
    progressBar.style.width=total?`${Math.round(done/total*100)}%`:'0%';
  }
  function render(){
    list.innerHTML='';empty.hidden=groups.length>0;
    groups.forEach((group,index)=>{
      const row=document.createElement('div');row.className='group-row'+(group.done?' is-done':'');
      const check=document.createElement('button');check.type='button';check.className='group-check';check.textContent=group.done?'✓':'○';check.setAttribute('aria-label',group.done?'Markeer als niet geplaatst':'Markeer als geplaatst');
      check.addEventListener('click',()=>{groups[index].done=!groups[index].done;save();render()});

      const info=document.createElement('button');info.type='button';info.className='group-info group-name-edit';info.title='Tik om naam te wijzigen';
      const strong=document.createElement('strong');strong.textContent=group.name;
      const small=document.createElement('small');small.textContent=group.done?'Geplaatst · tik naam om te wijzigen':'Nog plaatsen · tik naam om te wijzigen';
      info.append(strong,small);
      info.addEventListener('click',()=>{
        const renamed=prompt('Naam van deze Facebook-groep:',group.name);
        if(renamed&&renamed.trim()){groups[index].name=renamed.trim();save();render()}
      });

      const open=document.createElement('button');open.type='button';open.className='facebook-button group-open';open.textContent='Open groep';
      open.addEventListener('click',()=>{
        copyText().then(ok=>{if(ok)small.textContent='Groep geopend · tekst gekopieerd'});
        window.open(group.url,'_blank','noopener');
      });
      const remove=document.createElement('button');remove.type='button';remove.className='group-remove';remove.textContent='×';remove.setAttribute('aria-label','Groep verwijderen');
      remove.addEventListener('click',()=>{groups.splice(index,1);save();render()});
      row.append(check,info,open,remove);list.append(row);
    });
    progress();
  }

  form.addEventListener('submit',e=>{
    e.preventDefault();
    try{
      const url=cleanUrl(urlInput.value),name=nameInput.value.trim()||guessName(url);
      if(!addGroup(name,url)){alert('Deze groep staat al in je lijst.');return}
      save();render();form.reset();urlInput.focus();
    }catch(err){alert(err.message)}
  });

  pasteBtn?.addEventListener('click',async()=>{
    pasteStatus.textContent='';
    try{
      const clip=(await navigator.clipboard.readText()).trim();
      if(!clip)throw new Error('Je klembord is leeg.');
      const result=importLines(clip);
      if(result.added){pasteStatus.textContent=`${result.added} groep${result.added===1?'':'en'} toegevoegd ✓`;return}
      if(result.duplicates){pasteStatus.textContent='Deze groep staat al in je lijst.';return}
      pasteStatus.textContent='Geen bruikbare Facebook-groepslink gevonden.';
    }catch{
      pasteStatus.textContent='Automatisch plakken is geblokkeerd. Gebruik “Meerdere groepen snel toevoegen” en plak de link daar.';
    }
  });

  importBtn?.addEventListener('click',()=>{
    const result=importLines(importField.value);
    const parts=[];
    if(result.added)parts.push(`${result.added} toegevoegd`);
    if(result.duplicates)parts.push(`${result.duplicates} al aanwezig`);
    if(result.invalid)parts.push(`${result.invalid} ongeldig`);
    importStatus.textContent=parts.length?parts.join(' · '):'Plak eerst één of meerdere Facebook-links.';
    if(result.added)importField.value='';
  });

  text.addEventListener('input',()=>localStorage.setItem(TEXT_KEY,text.value));
  copyBtn.addEventListener('click',async()=>{copyBtn.textContent=await copyText()?'Tekst gekopieerd ✓':'Kopiëren mislukt';setTimeout(()=>copyBtn.textContent='Kopieer tekst',1400)});
  resetBtn.addEventListener('click',()=>{groups=groups.map(g=>({...g,done:false}));save();render()});
  render();
})();
