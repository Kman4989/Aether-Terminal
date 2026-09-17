// Boot-test the built single file: execute its 3 scripts in order under a DOM shim,
// and verify: no anti-tamper redirect, page markup applied, socket init reached.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const html = readFileSync(new URL("../aether-terminal.html", import.meta.url), "utf8");
const scripts = [];
const re = /<script type="text\/javascript">/g;
let m;
while ((m = re.exec(html))) {
  const end = html.indexOf("<" + "/script>", m.index);
  scripts.push(html.slice(m.index + m[0].length, end));
  re.lastIndex = end;
}
if (scripts.length !== 3) { console.error("expected 3 scripts, got", scripts.length); process.exit(1); }

const events = [];
const redirects = [];
function fakeEl(id) {
  const el = {
    id, children: [], style: new Proxy({}, { get: () => "", set: () => true }),
    setAttribute(k, v) { if (k === "src") el._src = v; }, getAttribute() { return null; },
    removeAttribute() {}, hasAttribute() { return false; },
    appendChild(c) { events.push("append:" + (c && c.id || c && c.tagName || "?")); return c; },
    remove() {}, addEventListener() {}, removeEventListener() {},
    insertBefore(c) { return c; }, querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { top:0,left:0,right:0,bottom:0,width:0,height:0 }; },
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    dataset: {}, content: null, innerHTML: "", textContent: "",
    firstElementChild: null, attachShadow() { return fakeEl("shadow"); },
    onclick: null, onblur: null, onload: null, onerror: null, value: "", disabled: false,
  };
  let outer = "";
  return new Proxy(el, {
    get(t,p){ if (p === "outerHTML") return outer; if (p in t) return t[p]; return undefined; },
    set(t,p,v){ if (p === "outerHTML") { outer = String(v); events.push("outerHTML-set:" + String(v).length + "ch"); return true; } t[p] = v; return true; },
  });
}
const documentStub = {
  contentType: "text/html", readyState: "complete", title: "NettleWeb",
  head: fakeEl("head"), body: fakeEl("body"), documentElement: fakeEl("html"),
  currentScript: null,
  getElementById: (id) => fakeEl(id),
  querySelector: () => fakeEl("q"),
  querySelectorAll: () => [],
  createElement: (t) => fakeEl(t),
  createElementNS: (ns, t) => fakeEl(t),
  createTextNode: () => fakeEl("text"),
  addEventListener() {}, removeEventListener() {},
  getElementsByTagName: () => [],
  fonts: { load: async () => [] },
};
globalThis.window = globalThis;
globalThis.document = documentStub;
Object.defineProperty(globalThis, "location", { configurable: true, value: {
  href: "https://example.test/", origin: "https://example.test", protocol: "https:",
  host: "example.test", hostname: "example.test", pathname: "/", search: "", hash: "",
  replace: (u) => { redirects.push(String(u)); }, assign: (u) => { redirects.push(String(u)); },
}});
globalThis.history = { replaceState(){}, pushState(){}, state: null, scrollRestoration: "auto", back(){}, forward(){} };
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent: "boot-test", onLine: true, language: "en-US", languages: ["en-US"] } });
const ls = new Map();
const storage = { getItem: k => ls.has(k)?ls.get(k):null, setItem: (k,v)=>ls.set(k,String(v)), removeItem: k=>ls.delete(k), clear: ()=>ls.clear(), key(i){return [...ls.keys()][i]??null}, get length(){return ls.size} };
globalThis.localStorage = storage; globalThis.sessionStorage = {...storage};
globalThis.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
globalThis.requestAnimationFrame = cb => setTimeout(cb, 0);
globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" });
globalThis.self = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => true;
globalThis.open = () => null;
class Fake {} 
globalThis.Element = class Element extends Fake {};
globalThis.HTMLElement = class extends globalThis.Element {};
globalThis.HTMLIFrameElement = class extends globalThis.HTMLElement {};
globalThis.HTMLScriptElement = class extends globalThis.HTMLElement {};
globalThis.Node = class Node extends Fake {};
globalThis.Event = class { initEvent(){} preventDefault(){} stopPropagation(){} };
globalThis.CustomEvent = globalThis.Event; globalThis.MessageEvent = globalThis.Event;
globalThis.ErrorEvent = globalThis.Event; globalThis.CloseEvent = globalThis.Event;
globalThis.WebSocket = class { constructor(){ this.readyState=0; } close(){} send(){} addEventListener(){} };
globalThis.XMLHttpRequest = class { open(){} send(){} setRequestHeader(){} addEventListener(){} };
globalThis.Worker = class { postMessage(){} addEventListener(){} terminate(){} };
globalThis.MessageChannel = class { constructor(){ this.port1={postMessage(){},addEventListener(){},start(){}}; this.port2={postMessage(){},addEventListener(){},start(){}}; } };
globalThis.FileReader = class { readAsDataURL(){} readAsArrayBuffer(){} };
globalThis.Image = class extends globalThis.Element { decode(){ return Promise.resolve(); } set src(v){} };
globalThis.MutationObserver = class { observe(){} disconnect(){} };
globalThis.IntersectionObserver = class { observe(){} disconnect(){} };
globalThis.ResizeObserver = class { observe(){} disconnect(){} };
globalThis.caches = { open: async()=>({match:async()=>undefined,put:async()=>{},addAll:async()=>{},keys:async()=>[],delete:async()=>true}), match:async()=>undefined, keys:async()=>[], delete:async()=>true };
globalThis.indexedDB = { open: () => ({ set onsuccess(f){}, set onupgradeneeded(f){}, set onerror(f){}, set onblocked(f){} }) };
globalThis.Notification = class { static get permission(){return "denied";} static requestPermission(){return Promise.resolve("denied")} };
globalThis.PaymentRequest = class { show(){ return Promise.reject(new Error("no")); } };
globalThis.screen = { width:1920, height:1080 };
globalThis.outerWidth=1920; globalThis.outerHeight=1080; globalThis.innerWidth=1920; globalThis.innerHeight=1080;
globalThis.opener=null; globalThis.parent=globalThis; globalThis.top=globalThis; globalThis.frames=globalThis;
globalThis.print=()=>{}; globalThis.stop=()=>{}; globalThis.focus=()=>{}; globalThis.blur=()=>{};
globalThis.alert=()=>{}; globalThis.confirm=()=>false; globalThis.prompt=()=>null;
globalThis.DOMParser = class { parseFromString(){ return { documentElement: fakeEl("p"), body: fakeEl("pb") }; } };
globalThis.XMLSerializer = class { serializeToString(){ return ""; } };
globalThis.customElements = { define(){}, get(){ return undefined; }, whenDefined: () => Promise.resolve() };
globalThis.CSS = { escape: s => String(s), supports: () => false };

import { Worker } from "node:worker_threads";
new Worker(`const {parentPort}=require("node:worker_threads");const {readFileSync}=require("node:fs");setTimeout(()=>{let m="";try{m=readFileSync("/tmp/marks.log","utf8")}catch{}parentPort.postMessage(m);process.exit(0)},12000);`, { eval: true }).on("message", (m) => {
  console.log("WATCHDOG marks:\n" + m);
  console.log("HUNG - killing");
  process.exit(2);
});

process.on("SIGTERM", () => { process.exit(2); });
process.on("unhandledRejection", e => events.push("UNHANDLED:" + String(e && e.message || e).slice(0, 120)));
globalThis.__MARK = (t) => { events.push("MARK:" + t); try { appendFileSync("/tmp/marks.log", t + "\n"); } catch {} };
process.on("uncaughtException", e => events.push("UNCAUGHT:" + String(e && e.message || e).slice(0, 120)));

{
  let s2 = scripts[2];
  const anchors = [
    ["mr.onerror=(a,b,c,d,e)", "M1-onerror", "semi"],
    ['b("content-page").outerHTML=mL.l', "M2-pages-applied", "comma"],
    ["const bj=X?e(\"link[rel*='icon']\")", "M3-wiring-start", "semi"],
    ["const il=b(\"home-btn\")", "M4-routing-vars", "semi"],
    ["iz=O.pathname", "M5-routing", "paren"],
    ["const iQ=b(\"headlines\")", "M6-headlines", "semi"],
    ['b("clear-cache")', "G1", "comma"],
    ['const bX=b("game-container")', "G2", "semi"],
    ["function cM()", "G3", "semi"],
    ["ab.onclick=d3.onclick", "G4", "comma"],
    ["d6.onchange=", "G5", "comma"],
    ["gT.value=a5.getItem(f5)", "G6", "semi"],
    ['b("chat-profile")', "G7", "semi"],
  ];
  for (const [anchor, tag, mode] of anchors) {
    if (!s2.includes(anchor)) { events.push("MARK-MISSING:" + tag); continue; }
    const call = `globalThis.__MARK("${tag}")`;
    const repl = mode === "semi" ? (() => call + ";" + anchor)
      : mode === "comma" ? (() => call + "," + anchor)
      : (() => anchor.replace("=", "=(" + call + ",") + ")");
    s2 = s2.replace(anchor, repl);
  }
  scripts[2] = s2;
}
const _log = console.log.bind(console), _err = console.error.bind(console);
try {
  const st = globalThis.setTimeout;
  let n = 0;
  for (const s of scripts) {
    _err("EVAL-START len=" + s.length);
    (0, eval)(s);
    _err("EVAL-DONE");
    const alive = await Promise.race([ new Promise(r => st(() => r(true), 500)), new Promise(r => setTimeout(() => r(false), 1500)) ]);
    _err("LOOP-ALIVE[" + n++ + "]:", alive);
  }
  console.error("setTimeout same:", st === globalThis.setTimeout, "clearTimeout same:", true);
  st(() => _err("RAW-TIMER-FIRED"), 1000);
} catch (e) { events.push("SYNC:" + String(e && e.message || e).slice(0, 200)); }

setTimeout(() => {
  _log("TIMER-FIRED");
  _log("redirects:", JSON.stringify(redirects));
  _log("events:", events.slice(0, 40).join("\n  "));
  const ok = redirects.length === 0 && events.some(e => String(e).startsWith("outerHTML-set:"));
  _log(ok ? "BOOT OK" : "BOOT PROBLEM");
  process.exit(ok ? 0 : 1);
}, 8000);
