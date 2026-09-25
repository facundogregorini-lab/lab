const http=require('node:http'),fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const screenshots=path.join(root,'test-results');fs.mkdirSync(screenshots,{recursive:true});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,'index.html')));});
const reports=[];const check=(name,ok)=>{assert.ok(ok,name);reports.push(name);console.log('PASS',name)};
(async()=>{await new Promise(r=>server.listen(4178,'127.0.0.1',r));const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4178');await page.waitForFunction(()=>typeof manuelitaDebug==='function');const state=()=>page.evaluate(()=>manuelitaDebug());
async function dragPiece(p){await page.mouse.move(p.screen.x,p.screen.y);await page.mouse.down();await page.mouse.move(p.home.x,p.home.y,{steps:12});await page.mouse.up();}
check('12 pieces at start',(await state()).count===12);await page.click('#guide');check('Guide toggles',await page.getAttribute('#guide','aria-pressed')==='true');await page.screenshot({path:path.join(screenshots,'desktop.png')});
await dragPiece((await state()).pieces[0]);check('Pointer drag snaps to correct cell',(await state()).placed===1);check('Move counted',(await state()).moves===1);
await page.click('#restart');await page.click('#cancelRestart');check('Restart cancel preserves progress',(await state()).placed===1);
await page.selectOption('#level','3x3');await page.click('#cancelRestart');check('Difficulty cancel restores selection',await page.inputValue('#level')==='4x3');
await page.click('#help');const t=(await state()).time;await page.waitForTimeout(350);check('Timer pauses in help',(await state()).time===t);await page.keyboard.press('Escape');check('Escape closes help',await page.locator('#helpModal').isHidden());
await page.click('#view');check('Camera toggles',await page.getAttribute('#view','aria-pressed')==='true');
await page.click('#hint');await page.click('#hint');await page.click('#hint');check('Hints place exactly 3 pieces',(await state()).placed===4);check('Hints exhaust',await page.locator('#hint').isDisabled());
await page.selectOption('#level','3x3');await page.click('#confirmRestart');check('Confirmed difficulty resets state',(await state()).count===9&&(await state()).moves===0);
await page.locator('canvas').focus();await page.keyboard.press('Enter');check('Keyboard selects piece',(await state()).selected);await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');check('Escape cancels drag without a move',!(await state()).selected&&(await state()).moves===0);
for(let attempt=0;attempt<3;attempt++){for(const p of (await state()).pieces.filter(p=>!p.placed))await dragPiece(p);if((await state()).finished)break;}
check('All pieces can be placed and trigger win',(await state()).finished);await page.waitForSelector('#winModal:not([hidden])');await page.screenshot({path:path.join(screenshots,'victory.png')});await page.click('#again');check('Play again resets win',!(await state()).finished&&(await state()).placed===0);
for(const [level,count] of [['4x3',12],['5x4',20],['6x5',30],['8x6',48]]){await page.selectOption('#level',level);check('Difficulty '+count,(await state()).count===count);}
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);check('Mobile layout',(await state()).mobile);check('No horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
const cdp=await page.context().newCDPSession(page);const p=(await state()).pieces[0];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.screen.x,y:p.screen.y}]});for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.screen.x+(p.home.x-p.screen.x)*i/10,y:p.screen.y+(p.home.y-p.screen.y)*i/10}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});check('Touch drag at 48 pieces',(await state()).placed===1);
await page.selectOption('#level','4x3');await page.click('#confirmRestart');await page.click('#view');await page.screenshot({path:path.join(screenshots,'mobile.png')});
const rects=await page.evaluate(()=>{const r=id=>{const a=document.querySelector(id).getBoundingClientRect();return{top:a.top,bottom:a.bottom,right:a.right,left:a.left}};return{toolbar:r('.toolbar'),stage:r('#stage'),intro:r('.intro'),route:r('.journey')}});check('Mobile title and route do not overlap',rects.intro.bottom<=rects.route.top);check('Mobile stage clears toolbar',rects.stage.bottom<=rects.toolbar.top);
const photoPage=await browser.newPage({viewport:{width:1440,height:1000}});photoPage.on('pageerror',e=>errors.push(e.message));await photoPage.setContent('<div style="width:600px;height:900px;background:linear-gradient(red 0 50%,blue 0)"></div>');const photo=await photoPage.locator('div').screenshot();await photoPage.goto('http://127.0.0.1:4178');await photoPage.waitForFunction(()=>typeof manuelitaDebug==='function');const photoState=()=>photoPage.evaluate(()=>manuelitaDebug());
await photoPage.setInputFiles('#photoInput',{name:'foto.png',mimeType:'image/png',buffer:photo});await photoPage.waitForFunction(()=>manuelitaDebug().customPhoto);check('Uploaded photo becomes the puzzle',(await photoPage.getAttribute('#reference','src')).startsWith('data:image/jpeg')&&(await photoState()).count===12);
await photoPage.setInputFiles('#photoInput',{name:'nota.txt',mimeType:'text/plain',buffer:Buffer.from('hola')});check('Non-image upload is rejected',(await photoState()).customPhoto);
await photoPage.reload();await photoPage.waitForFunction(()=>typeof manuelitaDebug==='function');check('Uploaded photo persists after reload',(await photoState()).customPhoto);
await photoPage.click('#resetPhoto');check('Original Manuelita can be restored',!(await photoState()).customPhoto&&await photoPage.locator('#resetPhoto').isHidden());await photoPage.close();
check('No uncaught browser errors',errors.length===0);
const fallback=await browser.newPage();await fallback.route('**/three@*/**',r=>r.abort());await fallback.goto('http://127.0.0.1:4178');await fallback.waitForSelector('#retry:not([hidden])');check('Network failure gives retry UI',await fallback.locator('#loadText').innerText().then(t=>t.includes('conexión')));
console.log(JSON.stringify({passed:reports.length,errors},null,2));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
