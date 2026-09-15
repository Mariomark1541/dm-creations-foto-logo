const CACHE='dm-creations-v11';
const ASSETS=['./','./index.html','./styles.css','./groups.css','./price-per-photo.css','./watermark-quality.js','./groups.js','./app.js','./manifest.webmanifest','./assets/dm-creations-logo.png','./assets/dm-creations-watermark.b64','./assets/watermark/wm-0.b64','./assets/watermark/wm-1.b64','./assets/watermark/wm-2.b64','./assets/watermark/wm-3.b64','./assets/icons/icon-180.png','./assets/icons/icon-192.png','./assets/icons/icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(clients.map(client=>client.navigate(client.url).catch(()=>{})));
  })());
});

async function withQualityScript(response){
  const html=await response.text();
  const marker='<script src="./app.js" defer></script>';
  const injected='<script src="./watermark-quality.js"></script>\n  '+marker;
  const body=html.includes('./watermark-quality.js')?html:html.replace(marker,injected);
  const headers=new Headers(response.headers);headers.set('Content-Type','text/html;charset=utf-8');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/dm-creations-foto-logo/'))return withQualityScript(response);
      if(response&&response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{})}
      return response;
    }catch{
      const cached=await caches.match(request);
      if(cached){if(request.mode==='navigate')return withQualityScript(cached);return cached}
      if(request.mode==='navigate'){const index=await caches.match('./index.html');if(index)return withQualityScript(index)}
      throw new Error('Offline en bestand niet beschikbaar in cache.');
    }
  })());
});
