const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/local/bin/google-chrome',args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage();await p.setViewport({width:1080,height:1080});
for(const k of ['blue','dark']){await p.goto('file://'+path.resolve(`pfp-${k}.html`),{waitUntil:'networkidle0'});await p.evaluate(()=>document.fonts.ready);
const r=await p.evaluate(()=>[...document.body.children].map(e=>{const q=e.getBoundingClientRect();return [Math.round(q.left),Math.round(q.top),Math.round(q.right),Math.round(q.bottom)]}));console.log(k,JSON.stringify(r));
await p.screenshot({path:`pfp-${k}.png`});}
await b.close();})();
