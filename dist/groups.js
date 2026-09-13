'use strict';
(() => {
  const $=s=>document.querySelector(s);
  const form=$('#group-form'), nameInput=$('#group-name'), urlInput=$('#group-url');
  const list=$('#group-list'), empty=$('#group-empty'), text=$('#post-text');
  const progressText=$('#group-progress-text'), progressBar=$('#group-progress-bar');
  const copyBtn=$('#copy-post-text'), resetBtn=$('#reset-groups');
  if(!form)return;

  const GROUPS_KEY='dm-facebook-groups-v1';
  const TEXT_KEY='dm-facebook-post-text-v1';
  let groups=[];
  try{groups=JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]')}catch{groups=[]}
  text.value=localStorage.getItem(TEXT_KEY)||'Nieuwe handgemaakte 3D-kaart van DM-Creations ✨\n\nInteresse? Stuur gerust een bericht!';

  function save(){localStorage.setItem(GROUPS_KEY,JSON.stringify(groups))}
  function cleanUrl(value){
    let url=value.trim();
    if(!/^https?:\/\//i.test(url))url='https://'+url;
    try{const u=new URL(url);if(!/(^|\.)facebook\.com$/i.test(u.hostname)&&!/(^|\.)fb\.com$/i.test(u.hostname))throw new Error();return u.href}catch{throw new Error('Gebruik een geldige Facebook-groepslink.')}
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
      const info=document.createElement('div');info.className='group-info';
      const strong=document.createElement('strong');strong.textContent=group.name;
      const small=document.createElement('small');small.textContent=group.done?'Geplaatst':'Nog plaatsen';
      info.append(strong,small);
      const open=document.createElement('button');open.type='button';open.className='facebook-button group-open';open.textContent='Open groep';
      open.addEventListener('click',async()=>{
        await copyText();
        window.open(group.url,'_blank','noopener');
        small.textContent='Groep geopend · tekst gekopieerd';
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
      const name=nameInput.value.trim(),url=cleanUrl(urlInput.value);
      if(!name)return;
      groups.push({name,url,done:false});save();render();form.reset();nameInput.focus();
    }catch(err){alert(err.message)}
  });
  text.addEventListener('input',()=>localStorage.setItem(TEXT_KEY,text.value));
  copyBtn.addEventListener('click',async()=>{copyBtn.textContent=await copyText()?'Tekst gekopieerd ✓':'Kopiëren mislukt';setTimeout(()=>copyBtn.textContent='Kopieer tekst',1400)});
  resetBtn.addEventListener('click',()=>{groups=groups.map(g=>({...g,done:false}));save();render()});
  render();
})();
