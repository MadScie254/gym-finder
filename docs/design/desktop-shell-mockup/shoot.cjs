const { chromium } = require("playwright");
const path = require("path");
const ARGS=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"];
const pages = process.argv.slice(2);
(async()=>{
  const b=await chromium.launch({args:ARGS});
  const desk=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const mob=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  for (const name of pages) {
    const page=await (name.startsWith("m-")?mob:desk).newPage();
    await page.goto("file://"+path.join(__dirname,name+".html"),{waitUntil:"load"});
    await page.waitForTimeout(600);
    await page.screenshot({path:path.join(__dirname,"shot-"+name+".png")});
    console.log("shot",name);
    await page.close();
  }
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
