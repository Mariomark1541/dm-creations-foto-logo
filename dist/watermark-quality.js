'use strict';
(() => {
  const originalFetch=window.fetch.bind(window);
  const parts=['./assets/watermark/wm-0.b64','./assets/watermark/wm-1.b64','./assets/watermark/wm-2.b64','./assets/watermark/wm-3.b64'];
  window.fetch=async(input,init)=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.endsWith('assets/dm-creations-watermark.b64')){
      const data=await Promise.all(parts.map(path=>originalFetch(path,init).then(response=>{
        if(!response.ok)throw new Error('Scherp watermark kon niet worden geladen.');
        return response.text();
      })));
      return new Response(data.join(''),{status:200,headers:{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-cache'}});
    }
    return originalFetch(input,init);
  };

  const settingsKey='dm-watermark-settings-v2';
  const qualityKey='dm-watermark-quality-v3';
  if(!localStorage.getItem(qualityKey)){
    try{
      const settings=JSON.parse(localStorage.getItem(settingsKey)||'{}');
      if(settings.opacity===undefined||settings.opacity===95)settings.opacity=100;
      localStorage.setItem(settingsKey,JSON.stringify(settings));
    }catch{}
    localStorage.setItem(qualityKey,'1');
  }
})();
