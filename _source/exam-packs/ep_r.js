const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/local/bin/google-chrome',args:['--no-sandbox','--font-render-hinting=none','--allow-file-access-from-files']});
const p=await b.newPage();await p.setViewport({width:1080,height:1350});
for(const n of process.argv.slice(2)){await p.goto('file://'+path.resolve('ep/'+n+'.html'),{waitUntil:'networkidle0'});await p.evaluate(()=>document.fonts.ready);
console.log(n,await p.evaluate(()=>{const f=document.querySelector('.frame');return f.scrollHeight-f.clientHeight}));await p.screenshot({path:'/tmp/cap/ep-'+n+'.png'});}
await b.close();})();
