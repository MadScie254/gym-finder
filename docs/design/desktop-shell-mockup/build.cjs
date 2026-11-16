// THROWAWAY mockup of the new desktop shell. Nothing here ships. Generates static HTML pages.
const fs = require("fs");
const dir = __dirname;
const icons = JSON.parse(fs.readFileSync(dir + "/icons.json", "utf8"));
const ic = (name, size = 20, cls = "") =>
  icons[name].replace('width="20"', `width="${size}"`).replace('height="20"', `height="${size}"`).replace("<svg", `<svg class="ic ${cls}"`);

const css = `
@font-face{font-family:"Archivo Signwriter";font-weight:400 800;font-stretch:75% 100%;src:url(archivo-signwriter.woff2) format("woff2")}
:root{--chalk:#f2f4f7;--enamel:#fff;--plate:#1b2333;--cobalt:#2346d8;--cobalt-h:#1a37b3;--signal:#ffc42e;--court:#0a7a51;--stop:#c43420;--slate:#5a6477;--sunk:#e7eaf0;
--line:rgba(27,35,51,.10);--line-strong:rgba(27,35,51,.20);
--glass:rgba(255,255,255,.56);--glass-strong:rgba(255,255,255,.74);--glass-edge:rgba(255,255,255,.92);--blur:blur(22px) saturate(1.7);
--shadow-float:0 12px 32px rgba(27,35,51,.12);--ease:cubic-bezier(.2,.8,.2,1);--ff:"Archivo Signwriter",Archivo,system-ui,sans-serif}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{font:400 15px/1.45 "Archivo Signwriter",Archivo,system-ui,sans-serif;color:var(--plate);background:#f2f4f7 url(contours.svg) center/cover fixed;-webkit-font-smoothing:antialiased;overflow:hidden}
.sign{font-stretch:76%;font-weight:780;letter-spacing:-.004em}
.ic{flex:none;stroke:currentColor}
.muted{color:var(--slate)}
.glass{background:var(--glass);-webkit-backdrop-filter:var(--blur);backdrop-filter:var(--blur);border:1px solid var(--glass-edge);box-shadow:0 0 0 1px var(--line),var(--shadow-float)}
/* shell */
.app{display:grid;grid-template-columns:272px 1fr;grid-template-rows:minmax(0,1fr);height:100vh}
.side{margin:12px 0 12px 12px;border-radius:16px;display:flex;flex-direction:column;padding:10px 10px 12px;min-height:0;overflow:hidden}
.brand{display:flex;align-items:center;gap:10px;height:48px;padding:0 8px;font-size:23px}
.mark{width:24px;height:24px;border-radius:6px;background:var(--plate);position:relative}
.mark::after{content:"";position:absolute;left:5px;bottom:5px;width:9px;height:4px;border-radius:1px;background:var(--signal)}
.brand .collapse{margin-left:auto;color:var(--slate);display:grid;place-items:center;width:32px;height:32px;border-radius:6px}
.glabel{font-size:13px;font-weight:640;color:var(--slate);padding:16px 10px 6px}
.nav{position:relative;display:flex;align-items:center;gap:12px;height:40px;padding:0 10px;border-radius:8px;color:var(--plate);font-weight:560;text-decoration:none}
.nav .ic{color:var(--slate)}
.nav.on{background:rgba(35,70,216,.09);color:var(--cobalt);font-weight:640}
.nav.on .ic{color:var(--cobalt)}
.nav.on::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:2px;background:var(--cobalt)}
.nav .tag{margin-left:auto;font-size:11px;font-weight:640;border:1px dashed var(--slate);border-radius:4px;padding:1px 5px;color:var(--slate)}
.nav .count{margin-left:auto;font-stretch:75%;font-weight:800;font-size:14px;background:var(--plate);color:#fff;padding:0 7px;border-radius:4px;line-height:20px}
.sfoot{margin-top:auto;border-top:1px solid var(--line);padding:12px 8px 0;display:grid;gap:8px}
.status{display:flex;align-items:center;gap:8px;font-weight:560;font-size:13px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--court)}
.small{font-size:13px}
.main{display:flex;flex-direction:column;min-width:0;min-height:0;padding:12px 12px 0}
.top{height:56px;border-radius:16px;display:flex;align-items:center;gap:14px;padding:0 10px 0 20px;flex:none}
.top .ptitle{font-size:23px;min-width:150px}
.top .sp{flex:1}
.widget{display:flex;align-items:center;gap:10px;width:380px;height:38px;padding:0 8px 0 12px;border-radius:10px;background:rgba(255,255,255,.72);border:1px solid var(--line-strong);color:var(--slate);font:inherit;font-size:14px;cursor:pointer}
.widget span{flex:1;text-align:left}
kbd{font:640 12px/1 var(--ff);color:var(--slate);border:1px solid var(--line-strong);border-bottom-width:2px;border-radius:5px;padding:4px 6px;background:#fff}
.ibtn{display:grid;place-items:center;width:38px;height:38px;border-radius:8px;color:var(--plate);border:0;background:none}
.chip{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 12px;border-radius:8px;font-weight:640;font-size:14px;background:rgba(255,255,255,.7);border:1px solid var(--line-strong)}
.page{flex:1;min-height:0;overflow:auto;padding:26px 6px 36px}
.wrap{max-width:1120px;margin:0 auto}
h1,h2,h3{margin:0}
.btn{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 18px;border-radius:6px;font:640 15px/1 var(--ff);border:1px solid var(--line-strong);background:#fff;color:var(--plate);text-decoration:none;cursor:pointer}
.btn.primary{background:var(--cobalt);border-color:var(--cobalt);color:#fff}
.btn.primary:hover{background:var(--cobalt-h)}
.btn.quiet{border-color:transparent;background:transparent;color:var(--cobalt)}
.btn.sm{height:36px;padding:0 12px;font-size:14px}
.card{background:var(--enamel);border:1px solid var(--line);border-radius:10px}
/* accordion */
.acc{background:var(--enamel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.acc>div{border-top:1px solid var(--line)}
.acc>div:first-child{border-top:0}
.acc .row{display:flex;align-items:center;gap:12px;min-height:52px;padding:0 16px;font-weight:640}
.acc .row .ic:last-child{margin-left:auto;color:var(--slate)}
.acc .row .ic:first-child{color:var(--slate)}
.acc .body{padding:0 16px 16px 48px;color:var(--slate);max-width:62ch}
.acc .open .row .ic:last-child{transform:rotate(180deg)}
/* home */
.hero h1{font-size:66px;line-height:1;font-stretch:76%;font-weight:800;letter-spacing:-.01em}
.hero p{font-size:19px;max-width:34em;margin:16px 0 22px}
.actions{display:flex;gap:12px;align-items:center}
.hint{display:flex;align-items:center;gap:8px;margin-left:8px;color:var(--slate);font-size:14px}
.cols{display:grid;grid-template-columns:2fr 1fr;gap:22px;margin-top:34px}
.sec{display:flex;align-items:baseline;gap:12px;margin-bottom:12px}
.sec h2{font-size:28px;font-stretch:76%;font-weight:780}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.tile{padding:12px 14px;display:flex;flex-direction:column;gap:2px}
.tile b{font-weight:560;font-size:15px}
.tile .n{font-stretch:75%;font-weight:800;font-size:34px;line-height:1}
.tile .n small{font:560 13px/1 var(--ff);font-stretch:100%;color:var(--slate);margin-left:4px}
.side-col{display:grid;gap:12px;align-content:start}
.pad{padding:16px}
.stack{display:grid;gap:12px}
/* find */
.ftitle{display:flex;align-items:baseline;gap:14px}
.ftitle h1{font-size:40px;font-stretch:76%;font-weight:800}
.fbar{display:flex;gap:8px;align-items:center;margin:14px 0}
.fbar .chip.on{background:rgba(35,70,216,.1);border-color:rgba(35,70,216,.5);color:var(--cobalt)}
.split{display:grid;grid-template-columns:minmax(440px,540px) 1fr;gap:16px;height:calc(100vh - 56px - 12px - 26px - 36px - 118px)}
.list{display:grid;gap:12px;align-content:start;overflow:hidden}
.gym{display:grid;grid-template-columns:96px 1fr;gap:16px;padding:14px;align-items:stretch}
.dist{background:var(--plate);color:#fff;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-stretch:75%;font-weight:800;line-height:1}
.dist b{font-size:34px;font-weight:800}
.dist small{font:640 13px/1 var(--ff);font-stretch:100%;margin-top:4px;opacity:.85}
.dist.open{background:var(--signal);color:var(--plate)}
.gym h3{font-size:25px;font-stretch:76%;font-weight:780;line-height:1.05}
.gym .meta{color:var(--slate);margin:3px 0 8px}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:640;background:var(--sunk);border-radius:4px;padding:3px 8px}
.badge .ic{color:var(--court)}
.grow{display:flex;gap:8px;align-items:center;margin-top:12px}
.mapbox{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--line);background:#dde3ea url(map.png) center/cover}
.mapbox .gl{position:absolute}
.zoom{right:14px;top:14px;display:grid;border-radius:10px;overflow:hidden}
.zoom .ibtn{border-radius:0}
.zoom .ibtn+.ibtn{border-top:1px solid var(--line)}
.area{left:50%;top:14px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:999px;font-weight:640}
.legend{left:14px;bottom:14px;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:560}
/* palette */
.scrim{position:fixed;inset:0;background:rgba(27,35,51,.24);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.pal{position:fixed;left:50%;top:7vh;transform:translateX(-50%);width:700px;border-radius:20px;overflow:hidden;background:var(--glass-strong);-webkit-backdrop-filter:blur(30px) saturate(1.8);backdrop-filter:blur(30px) saturate(1.8);border:1px solid var(--glass-edge);box-shadow:0 0 0 1px var(--line),0 28px 70px rgba(27,35,51,.30)}
.pin{display:flex;align-items:center;gap:12px;height:60px;padding:0 18px;border-bottom:1px solid var(--line)}
.pin .q{flex:1;font-size:19px;font-weight:560}
.pin .q i{font-style:normal;color:var(--slate);font-weight:400}
.caret{display:inline-block;width:2px;height:22px;background:var(--cobalt);vertical-align:-4px;margin-left:1px}
.plist{padding:6px 8px 8px;max-height:540px;overflow:hidden}
.pgl{font-size:13px;font-weight:640;color:var(--slate);padding:12px 10px 6px}
.prow{position:relative;display:flex;align-items:center;gap:12px;height:48px;padding:0 10px;border-radius:10px;font-weight:560}
.prow .tilei{display:grid;place-items:center;width:30px;height:30px;border-radius:7px;background:rgba(27,35,51,.07);color:var(--plate)}
.prow .r{margin-left:auto;color:var(--slate);font-size:13px;font-weight:400;display:flex;gap:8px;align-items:center}
.prow.on{background:rgba(35,70,216,.11)}
.prow.on .tilei{background:var(--cobalt);color:#fff}
.prow.on::before{content:"";position:absolute;left:0;top:11px;bottom:11px;width:3px;border-radius:2px;background:var(--cobalt)}
.pfoot{display:flex;gap:16px;align-items:center;height:44px;padding:0 18px;border-top:1px solid var(--line);color:var(--slate);font-size:13px}
.pfoot span{display:flex;gap:6px;align-items:center}
/* my week */
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin:14px 0 20px}
.tabs a{padding:10px 14px;font-weight:640;color:var(--slate);position:relative}
.tabs a.on{color:var(--plate)}
.tabs a.on::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:3px;background:var(--cobalt)}
.today{background:var(--plate);color:#fff;border-radius:10px;padding:22px 24px}
.today small{color:#b5bdcc;font-size:14px}
.today h2{font-size:58px;font-stretch:75%;font-weight:800;line-height:1;margin:6px 0 8px}
.today .acts{display:flex;gap:10px;margin-top:18px}
.btn.signal{background:var(--signal);border-color:var(--signal);color:var(--plate)}
.btn.ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.4)}
.today .acc{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.16);margin-top:18px;color:#fff}
.today .acc .row .ic{color:#b5bdcc!important}
.todo .rowi{display:flex;align-items:center;gap:14px;padding:12px 16px;border-top:1px solid var(--line)}
.todo .rowi:first-child{border-top:0}
.todo .rowi span:last-child{margin-left:auto;color:var(--slate);font-size:14px}
/* win button */
.win{position:relative;overflow:hidden;min-width:226px;justify-content:center}
.win .lbl{display:grid;justify-items:center}
.win .lbl>span{grid-area:1/1;transition:transform .26s var(--ease),opacity .2s;white-space:nowrap}
.win .l2{opacity:0;transform:translateY(70%)}
.win .plane{display:grid;place-items:center;width:20px;height:20px;overflow:visible}
.win:hover .l1,.win.is-hover .l1{opacity:0;transform:translateY(-70%)}
.win:hover .l2,.win.is-hover .l2{opacity:1;transform:none}
.win:hover .plane svg{animation:fly 1.5s cubic-bezier(.5,0,.3,1) infinite}
.win.f1 .plane svg{transform:translate(13px,-11px) rotate(6deg);opacity:.75}
.win.f2 .plane svg{transform:translate(-11px,9px);opacity:.75}
@keyframes fly{0%{transform:translate(0,0);opacity:1}38%{transform:translate(30px,-26px) rotate(8deg);opacity:0}39%{transform:translate(-30px,26px);opacity:0}72%{transform:translate(-5px,4px);opacity:1}100%{transform:translate(0,0);opacity:1}}
@media (prefers-reduced-motion:reduce){.win:hover .plane svg{animation:none}.win .lbl>span{transition:none}}
.dlg{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:560px;border-radius:20px;padding:26px}
.dlg h2{font-size:34px;font-stretch:76%;font-weight:800;margin-bottom:6px}
.kv{display:grid;grid-template-columns:110px 1fr;gap:8px 12px;margin:16px 0;padding:14px;border-radius:10px;background:rgba(255,255,255,.6);border:1px solid var(--line)}
.kv b{font-weight:640;color:var(--slate)}
.states{position:fixed;right:40px;top:50%;transform:translateY(-50%);width:420px;border-radius:20px;padding:22px;display:grid;gap:16px}
.states .cap{font-size:13px;font-weight:640;color:var(--slate);margin-bottom:6px}
`;

const shellFor = ({ title, active, body, extra = "", widget = true }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<div class="app">
  <aside class="side glass" aria-label="Primary">
    <div class="brand"><span class="mark"></span><span class="sign">Find My Gym</span><span class="collapse">${ic("PanelLeft", 18)}</span></div>
    <div class="glabel">Explore</div>
    <a class="nav ${active === "home" ? "on" : ""}">${ic("House")}Home</a>
    <a class="nav ${active === "find" ? "on" : ""}">${ic("Search")}Find gyms</a>
    <a class="nav ${active === "saved" ? "on" : ""}">${ic("Bookmark")}Saved<span class="count">2</span></a>
    <div class="glabel">Plan</div>
    <a class="nav ${active === "week" ? "on" : ""}">${ic("CalendarDays")}My week</a>
    <a class="nav">${ic("Utensils")}Meals</a>
    <a class="nav">${ic("ListChecks")}Shopping list</a>
    <a class="nav">${ic("ShoppingBasket")}Order food<span class="tag">Demo</span></a>
    <div class="glabel">Help</div>
    <a class="nav">${ic("Flag")}My reports</a>
    <a class="nav">${ic("Info")}About the data</a>
    <a class="nav">${ic("ShieldCheck")}Data and privacy</a>
    <div class="sfoot">
      <div class="status"><i class="dot"></i>Works offline</div>
      <div class="small muted">Gym list from 11 Nov 2026</div>
      <a class="btn sm">${ic("Download", 18)}Install the app</a>
    </div>
  </aside>
  <div class="main">
    <header class="top glass">
      <span class="ptitle sign">${title}</span>
      <span class="sp"></span>
      ${widget ? `<button class="widget">${ic("Search", 18)}<span>Search gyms, places, actions</span><kbd>⌘K</kbd></button>` : ""}
      <span class="sp"></span>
      <span class="chip">${ic("Globe", 16)}EN</span>
      <button class="ibtn" aria-label="Appearance">${ic("Sun", 20)}</button>
      <button class="ibtn" aria-label="Use my location">${ic("LocateFixed", 20)}</button>
    </header>
    ${body}
  </div>
</div>${extra}</body></html>`;

// ---------- Home ----------
const counties = [["Nairobi", 284], ["Kiambu", 79], ["Mombasa", 36], ["Nakuru", 17], ["Kisumu", 12], ["Uasin Gishu", 7], ["Kisii", 5], ["Kajiado", 4]];
const home = shellFor({
  title: "Home", active: "home",
  body: `<main class="page"><div class="wrap">
    <section class="hero">
      <h1>Find a gym.<br>Build your routine.</h1>
      <p>Explore gyms across Kenya, compare the details, and plan your next session. No account needed. Saved on this device.</p>
      <div class="actions">
        <a class="btn primary">${ic("LocateFixed", 20)}Find gyms near me</a>
        <a class="btn">${ic("MapPin", 20)}Browse by county</a>
        <span class="hint">or press <kbd>⌘K</kbd> to search anything</span>
      </div>
    </section>
    <div class="cols">
      <section>
        <div class="sec"><h2>Explore by location</h2><span class="muted">Gyms you can see in the list</span></div>
        <div class="tiles">${counties.map(([n, c]) => `<div class="card tile"><b>${n}</b><span class="n">${c}<small>gyms</small></span></div>`).join("")}</div>
        <div class="acc" style="margin-top:10px"><div><div class="row">${ic("MapPin", 18)}All 32 counties with gyms${ic("ChevronDown", 18)}</div></div></div>
      </section>
      <section class="side-col">
        <div class="card pad"><div class="muted small">Today at 18:00</div><div class="sign" style="font-size:30px;line-height:1.05;margin:4px 0 12px">Full body A</div><a class="btn sm primary">Open My week</a></div>
        <div class="card pad"><div class="sign" style="font-size:22px">Saved gyms</div><p class="muted" style="margin:6px 0 0">Tap the bookmark on any gym to keep it here.</p></div>
      </section>
    </div>
    <div class="sec" style="margin-top:34px"><h2>Good to know</h2></div>
    <div class="acc">
      <div class="open"><div class="row">${ic("ShieldCheck", 18)}What the badges mean${ic("ChevronDown", 18)}</div><div class="body">Verified means we checked the gym's own website on a date we show. Corroborated means two sources list it. Listed means one source does. We never invent hours, prices or ratings.</div></div>
      <div><div class="row">${ic("Info", 18)}How we check gym details${ic("ChevronDown", 18)}</div></div>
      <div><div class="row">${ic("FilePlus", 18)}A gym is missing or wrong${ic("ChevronDown", 18)}</div></div>
    </div>
  </div></main>`,
});

// ---------- Find gyms ----------
const gyms = [
  ["2.4", "km", false, "Banana House And Wellness Centre", "Lamu, Yoga", true],
  ["3.1", "km", true, "Dojo", "Saint Francis, Ngong, Martial arts", true],
  ["4.8", "km", false, "Health Hub Oasis", "Kisumu, Gym", true],
];
const findBody = `<main class="page" style="overflow:hidden"><div class="wrap" style="max-width:none">
  <div class="ftitle"><h1>Gyms in Kenya</h1><span class="muted">Showing 1 to 40 of 495</span></div>
  <div class="fbar">
    <span class="chip">${ic("SlidersHorizontal", 16)}Filters<span class="badge" style="background:var(--plate);color:#fff">2</span>${ic("ChevronDown", 16)}</span>
    <span class="chip on">Has phone</span><span class="chip on">Within 5 km</span><span class="chip">Open now</span>
    <span class="sp" style="flex:1"></span>
    <span class="chip">Nearest first${ic("ChevronDown", 16)}</span>
  </div>
  <div class="split">
    <div class="list">${gyms.map(([n, u, open, name, meta]) => `
      <article class="card gym"><div class="dist ${open ? "open" : ""}"><b>${n}</b><small>${open ? "open now" : u}</small></div>
        <div><h3>${name}</h3><div class="meta">${meta}</div><span class="badge">${ic("Check", 14)}Website checked</span>
        <div class="grow"><a class="btn sm primary">View gym</a><button class="ibtn card" style="width:36px;height:36px">${ic("Bookmark", 18)}</button><button class="ibtn card" style="width:36px;height:36px">${ic("Columns3", 18)}</button></div></div></article>`).join("")}
    </div>
    <div class="mapbox">
      <div class="gl area glass">${ic("Search", 16)}Search this area</div>
      <div class="gl zoom glass"><button class="ibtn">${ic("Plus", 18)}</button><button class="ibtn" style="font-size:22px">−</button></div>
      <div class="gl legend glass">495 gyms. Numbers show how many are grouped.</div>
    </div>
  </div>
</div></main>`;
const find = shellFor({ title: "Find gyms", active: "find", body: findBody });

// ---------- Command palette ----------
const row = (icon, label, right = "", on = false) => `<div class="prow ${on ? "on" : ""}"><span class="tilei">${ic(icon, 17)}</span>${label}<span class="r">${right}</span></div>`;
const palFrame = (inner) => `<div class="scrim"></div><div class="pal" role="dialog" aria-label="Quick actions">${inner}
  <div class="pfoot"><span><kbd>↑</kbd><kbd>↓</kbd>move</span><span><kbd>↵</kbd>open</span><span><kbd>esc</kbd>close</span><span style="margin-left:auto">Type to search, or pick an action</span></div></div>`;
const palEmpty = palFrame(`
  <div class="pin">${ic("Search", 22)}<div class="q"><span class="caret"></span><i> Search gyms, places or type an action</i></div><kbd>esc</kbd></div>
  <div class="plist">
    <div class="pgl">Actions</div>
    ${row("LocateFixed", "Use my location", "Sort by distance", true)}
    ${row("FilePlus", "Add a missing gym")}
    ${row("CalendarDays", "Set up my week")}
    <div class="pgl">Go to</div>
    ${row("Search", "Find gyms", "G then F")}
    ${row("Bookmark", "Saved", "2 gyms")}
    ${row("Utensils", "Order food", "Demo")}
    <div class="pgl">Settings</div>
    ${row("Languages", "Switch to Kiswahili")}
    ${row("Moon", "Appearance: dark")}
    ${row("Download", "Install the app")}
  </div>`);
const palTyped = palFrame(`
  <div class="pin">${ic("Search", 22)}<div class="q">slaute<span class="caret"></span></div><kbd>esc</kbd></div>
  <div class="plist">
    <div class="pgl">Gyms</div>
    ${row("Dumbbell", "Salute Gym", "Imara Daima Estate, Nairobi", true)}
    <div class="pgl">Places</div>
    ${row("MapPin", "Imara Daima Estate", "Area, 53 gyms")}
    <div class="pgl">Actions</div>
    ${row("Search", "Search all gyms for “slaute”", "Open Find gyms")}
  </div>`);
const findDim = (pal) => shellFor({ title: "Find gyms", active: "find", body: findBody, extra: pal });

// ---------- My week ----------
const week = shellFor({
  title: "My week", active: "week",
  body: `<main class="page"><div class="wrap">
    <div class="tabs"><a class="on">Today</a><a>Week</a><a>Meals</a><a>Shopping</a></div>
    <div class="cols" style="grid-template-columns:1.5fr 1fr;margin-top:0">
      <section class="stack">
        <div class="today">
          <small>Today, 18:00 · Week 1 of 4: Find your baseline</small>
          <h2>Full body A</h2>
          <div>35–50 minutes. A conservative starting point.</div>
          <div class="acts"><a class="btn signal">${ic("Dumbbell", 18)}Start session</a><a class="btn ghost">${ic("MapPin", 18)}Pick my gym</a></div>
          <div class="acc"><div><div class="row">${ic("ClipboardList", 18)}Exercises, 6 moves${ic("ChevronDown", 18)}</div></div></div>
        </div>
        <div class="card pad" style="display:flex;align-items:center;gap:14px">
          <div style="flex:1"><div class="sign" style="font-size:24px">Eat around training</div><div class="muted">Porridge and banana earlier today, a light starch before the session.</div></div>
          <a class="btn">${ic("ShoppingBasket", 18)}Order food (demo)</a>
        </div>
      </section>
      <section class="stack" style="align-content:start">
        <div><div class="sec"><h2 style="font-size:24px">Still to do this week</h2></div>
          <div class="card todo"><div class="rowi"><b>Wednesday</b><span class="sign" style="font-size:20px">Steady cardio</span><span>25–35 min</span></div><div class="rowi"><b>Friday</b><span class="sign" style="font-size:20px">Full body B</span><span>35–50 min</span></div></div></div>
        <div class="acc">
          <div><div class="row">${ic("Info", 18)}Set up my week${ic("ChevronDown", 18)}</div></div>
          <div><div class="row">${ic("ShieldCheck", 18)}Safety notes${ic("ChevronDown", 18)}</div></div>
          <div><div class="row">${ic("Globe", 18)}Activity guidance from the WHO${ic("ChevronDown", 18)}</div></div>
        </div>
      </section>
    </div>
  </div></main>`,
});

// ---------- Win button: dialog + states ----------
const winBtn = (cls, label2 = "Off it goes!") => `<a class="btn primary win ${cls}"><span class="lbl"><span class="l1">Send on WhatsApp</span><span class="l2" aria-hidden="true">${label2}</span></span><span class="plane">${ic("Send", 20)}</span></a>`;
const report = shellFor({
  title: "Find gyms", active: "find", body: findBody, widget: true,
  extra: `<div class="scrim"></div>
  <div class="dlg glass" style="background:var(--glass-strong);left:34%">
    <h2>Report a problem</h2>
    <div class="muted">Saved on this device. Next, send it to us on WhatsApp.</div>
    <div class="kv"><b>Gym</b><span>Level 24, Upper Parklands Estate</span><b>Problem</b><span>Wrong details</span><b>Note</b><span>The phone number no longer works.</span></div>
    <div class="muted small" style="margin-bottom:16px">Opens WhatsApp with the report written out. You press send.</div>
    <div style="display:flex;gap:10px;justify-content:flex-end"><a class="btn">Close</a>${winBtn("is-hover f1")}</div>
  </div>
  <div class="states glass" style="background:var(--glass-strong)">
    <div><div class="cap">At rest</div>${winBtn("")}</div>
    <div><div class="cap">Hover: text swaps, plane leaves</div>${winBtn("is-hover f1")}</div>
    <div><div class="cap">Hover: plane comes back in, then repeats</div>${winBtn("is-hover f2")}</div>
    <div class="muted small">Loops only while the pointer is on the button. On phones the same motion plays once on press. Reduced motion: text swap only.</div>
  </div>`,
});


// ---------- Phone (390 px): solid surfaces, bottom tabs, search button opens the same palette as a full-screen sheet ----------
const mcss = `
body.m{overflow:hidden}
.mtop{display:flex;align-items:center;gap:6px;height:56px;padding:0 6px 0 16px;background:var(--enamel);border-bottom:1px solid var(--line)}
.mtop .sign{font-size:23px}.mtop .sp{flex:1}
.mpage{height:calc(100vh - 56px - 64px);overflow:auto;padding:22px 16px 24px}
.mh1{font-size:47px;line-height:1;font-stretch:76%;font-weight:800;margin:0}
.mp{font-size:16px;margin:12px 0 18px}
.mbtn{display:flex;width:100%;justify-content:center;margin-bottom:10px;height:50px}
.mtiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mtabs{position:fixed;left:0;right:0;bottom:0;height:64px;display:grid;grid-template-columns:repeat(4,1fr);background:var(--enamel);border-top:1px solid var(--line)}
.mtabs a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:12px;font-weight:640;color:var(--slate)}
.mtabs a.on{color:var(--cobalt)}
.msheet{position:fixed;inset:0;background:var(--chalk);display:flex;flex-direction:column}
.mfade{position:fixed;inset:0;background:rgba(242,244,247,.62);z-index:0}
.mtop,.mpage,.mtabs{position:relative;z-index:1}.mtabs{position:fixed}
.msearch{display:flex;align-items:center;gap:10px;height:60px;padding:0 8px 0 16px;background:var(--enamel);border-bottom:1px solid var(--line)}
.msearch .q{flex:1;font-size:18px;font-weight:560}
.msheet .plist{max-height:none;flex:1;padding:4px 10px}
.msheet .prow{height:54px}
`;
const mshell = ({ tab, body, extra = "" }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Find My Gym</title><style>${css}${mcss}</style></head><body class="m"><div class="mfade"></div>
<header class="mtop"><span class="mark" style="margin-right:6px"></span><span class="sign">Find My Gym</span><span class="sp"></span><button class="ibtn" aria-label="Search">${ic("Search", 22)}</button><button class="ibtn" aria-label="Menu">${ic("PanelLeft", 22)}</button></header>
<main class="mpage">${body}</main>
<nav class="mtabs" aria-label="Primary"><a class="${tab === "home" ? "on" : ""}">${ic("House", 22)}Home</a><a>${ic("Search", 22)}Find gyms</a><a>${ic("Bookmark", 22)}Saved</a><a>${ic("CalendarDays", 22)}My week</a></nav>${extra}</body></html>`;
const mHome = mshell({ tab: "home", body: `
  <h1 class="mh1">Find a gym. Build your routine.</h1>
  <p class="mp">Explore gyms across Kenya, compare the details, and plan your next session.</p>
  <a class="btn primary mbtn">${ic("LocateFixed", 20)}Find gyms near me</a>
  <a class="btn mbtn">${ic("MapPin", 20)}Browse by county</a>
  <div class="sec" style="margin-top:26px"><h2 style="font-size:26px">Explore by location</h2></div>
  <div class="mtiles">${counties.slice(0, 4).map(([n, c]) => `<div class="card tile"><b>${n}</b><span class="n">${c}<small>gyms</small></span></div>`).join("")}</div>
  <div class="acc" style="margin-top:10px"><div><div class="row">${ic("MapPin", 18)}All 32 counties${ic("ChevronDown", 18)}</div></div></div>
  <div class="acc" style="margin-top:22px"><div><div class="row">${ic("ShieldCheck", 18)}What the badges mean${ic("ChevronDown", 18)}</div></div><div><div class="row">${ic("FilePlus", 18)}A gym is missing or wrong${ic("ChevronDown", 18)}</div></div></div>` });
const mRow = (icon, label, right = "", on = false) => row(icon, label, right, on);
const mPalette = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Search</title><style>${css}${mcss}</style></head><body class="m">
<div class="msheet" role="dialog" aria-label="Quick actions">
  <div class="msearch">${ic("Search", 22)}<div class="q">slaute<span class="caret"></span></div><a class="btn quiet sm">Cancel</a></div>
  <div class="plist">
    <div class="pgl">Gyms</div>
    ${mRow("Dumbbell", "Salute Gym", "Nairobi", true)}
    <div class="pgl">Places</div>
    ${mRow("MapPin", "Imara Daima Estate", "53 gyms")}
    <div class="pgl">Actions</div>
    ${mRow("LocateFixed", "Use my location")}
    ${mRow("FilePlus", "Add a missing gym")}
    <div class="pgl">Settings</div>
    ${mRow("Languages", "Switch to Kiswahili")}
    ${mRow("Moon", "Appearance: dark")}
  </div>
</div></body></html>`;

const winPage = `<!doctype html><html><head><meta charset="utf-8"><style>${css}body{display:grid;place-items:center;overflow:hidden}.stage{padding:30px 38px;border-radius:20px;display:grid;gap:16px;justify-items:center;background:var(--glass-strong)}</style></head><body><div class="stage glass"><div class="muted small" style="max-width:34ch;text-align:center">Hover the button. The plane flies off the edge and comes back, and repeats until the pointer leaves.</div>${winBtn("")}</div></body></html>`;
const out = { home, find, "palette-empty": findDim(palEmpty), "palette-typed": findDim(palTyped), week, report, "m-home": mHome, "m-palette": mPalette, win: winPage };
for (const [name, html] of Object.entries(out)) fs.writeFileSync(`${dir}/${name}.html`, html);
console.log("pages:", Object.keys(out).join(", "));
