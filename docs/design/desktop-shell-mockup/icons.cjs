const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const L = require("lucide-react");
const names = ["House","Search","Bookmark","CalendarDays","Utensils","ListChecks","Flag","Info","ShieldCheck","Settings","Languages","Sun","Moon","Download","MapPin","Send","Command","Plus","ChevronDown","ChevronRight","SlidersHorizontal","Columns3","Navigation","Phone","MessageCircle","LocateFixed","CornerDownLeft","ArrowUp","ArrowDown","Dumbbell","ShoppingBasket","ClipboardList","Share2","FilePlus","Palette","Check","X","Compass","Layers","PanelLeft","Clock","Globe"];
const out = {};
for (const n of names) {
  if (!L[n]) { console.error("missing", n); continue; }
  out[n] = renderToStaticMarkup(React.createElement(L[n], { size: 20, strokeWidth: 2, "aria-hidden": "true" }));
}
require("fs").writeFileSync(process.argv[2] + "/icons.json", JSON.stringify(out));
console.log("icons", Object.keys(out).length);
