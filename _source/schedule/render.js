const puppeteer=require('puppeteer-core');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/local/bin/google-chrome',args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage();await p.setViewport({width:794,height:1123,deviceScaleFactor:2});
await p.goto('file://'+__dirname+'/schedule.html',{waitUntil:'networkidle0'});await p.evaluate(()=>document.fonts.ready);
const over=[];
console.log('content bottom minus footer top (must be <0):',over.map(Math.round));
await p.pdf({path:__dirname+'/../../MedAtlas-Publishing-Schedule.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});
let i=1;for(const s of await p.$$('section.page')){await s.screenshot({path:__dirname+`/schedule-p${i}.png`});i++;}
await b.close();})();
