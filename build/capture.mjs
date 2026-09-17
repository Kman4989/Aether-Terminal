// Capture the decrypted page markup from main.js by executing it in Node with a DOM shim.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

let src = readFileSync(join(ROOT, "main.js"), "utf8");
src = src.replace(",mL=mK,", ",mL=(globalThis.__DUMP(mH),mK),");

// 1) Capture payload at the seal call:
src = src.replace(
  "mL._(mr,mE.decode(aO.decryptCTR(aQ,aP)))",
  "mL._(mr,globalThis.__WRITE(mE.decode(aO.decryptCTR(aQ,aP))))"
);
// 2) Neutralize the tamper/origin-lock branch (keep evaluation side effects, skip redirect):
src = src.replace(
  "if((()=>{aD(aT,aU);",
  "try{(()=>{aD(aT,aU);"
);
src = src.replace(
  "})())return aD(aX,b1),void setTimeout(()=>{O.replace(di)},300);",
  "})()}catch(__e){globalThis.__TAMPER_ERR=String(__e&&__e.message||__e)};"
);
if (!globalThis.__TESTED) {}
if (!src.includes("globalThis.__WRITE(")) { console.error("FATAL: injection failed"); process.exit(1); }
globalThis.__DUMP = (m) => { const o={}; for (const k of Object.keys(m)) { try { o[k] = typeof m[k] === "string" && m[k].length > 300 ? "<" + m[k].length + " bytes>" : m[k]; } catch(e){ o[k]="<err>"; } } try { writeFileSync(join(HERE, "mh-dump.json"), JSON.stringify(o,null,1)); console.error("MH DUMPED", Object.keys(o).length); } catch(e){ console.error("dumpfail", e); } };
globalThis.__WRITE = (t) => { try { writeFileSync(join(HERE, "captured-page.html"), t); console.error("WROTE", t.length); } catch (e) { console.error("write fail", e); } };

// ---- Minimal DOM/browser shims ----
function fakeEl(id) {
  const el = {
    id, children: [], style: new Proxy({}, { get: () => "", set: () => true }),
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    hasAttribute() { return false; }, appendChild(c) { return c; }, remove() {},
    addEventListener() {}, removeEventListener() {}, insertBefore(c) { return c; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { top:0,left:0,right:0,bottom:0,width:0,height:0 }; },
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    dataset: {}, content: null, innerHTML: "", outerHTML: "", textContent: "",
    firstElementChild: null, attachShadow() { return fakeEl("shadow"); },
  };
  return new Proxy(el, { get(t,p){ if (p in t) return t[p]; return undefined; }, set(){ return true; } });
}

const documentStub = {
  contentType: "image/svg+xml", readyState: "complete", // => X = false
  title: "NettleWeb",
  head: fakeEl("head"), body: fakeEl("body"), documentElement: fakeEl("html"),
  currentScript: null,
  getElementById: (id) => fakeEl(id),
  querySelector: () => fakeEl("q"),
  querySelectorAll: () => [],
  createElement: (t) => fakeEl(t),
  createElementNS: (ns, t) => fakeEl(t),
  createTextNode: () => fakeEl("text"),
  createEvent: () => ({ initEvent(){} }),
  addEventListener() {}, removeEventListener() {},
  createRange: () => ({ selectNode(){}, createContextualFragment: () => fakeEl("frag") }),
  getElementsByTagName: () => [],
  fonts: { load: async () => [] },
};

globalThis.window = globalThis;
globalThis.document = documentStub;
Object.defineProperty(globalThis, "location", { value: { href: "https://nettleweb.com/", origin: "https://nettleweb.com", protocol: "https:", host: "nettleweb.com", hostname: "nettleweb.com", pathname: "/", search: "", hash: "", replace(){}, assign(){} }, configurable: true });
globalThis.history = { replaceState(){}, pushState(){}, replaceState(){}, state: null, scrollRestoration: "auto", back(){}, forward(){} };
globalThis.origin = "https://nettleweb.com";
Object.defineProperty(globalThis, "navigator", { value: { userAgent: "node-capture", serviceWorker: undefined, onLine: true, language: "en-US", languages: ["en-US"], clipboard: {} }, configurable: true });
const lsData = new Map();
const storageStub = { getItem: k => lsData.has(k) ? lsData.get(k) : null, setItem: (k,v) => lsData.set(k,String(v)), removeItem: k => lsData.delete(k), clear: () => lsData.clear(), key: i => [...lsData.keys()][i] ?? null, get length(){ return lsData.size; } };
globalThis.localStorage = storageStub;
globalThis.sessionStorage = { ...storageStub };
globalThis.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" });

class Fake {}
globalThis.Element = class Element extends Fake {};
globalThis.HTMLElement = class HTMLElement extends globalThis.Element {};
globalThis.HTMLIFrameElement = class extends globalThis.HTMLElement {};
globalThis.HTMLScriptElement = class extends globalThis.HTMLElement {};
globalThis.Node = class Node extends Fake {};
globalThis.Event = class Event { constructor(){ } initEvent(){} preventDefault(){} stopPropagation(){} };
globalThis.CustomEvent = globalThis.Event;
globalThis.MessageEvent = globalThis.Event;
globalThis.ErrorEvent = globalThis.Event;
globalThis.CloseEvent = globalThis.Event;
globalThis.WebSocket = class WebSocket { constructor(){ this.readyState=0; } close(){} send(){} addEventListener(){} };
globalThis.XMLHttpRequest = class XMLHttpRequest { open(){} send(){} setRequestHeader(){} addEventListener(){} };
globalThis.Worker = class Worker { constructor(){} postMessage(){} addEventListener(){} terminate(){} };
globalThis.MessageChannel = class { constructor(){ this.port1={ postMessage(){}, addEventListener(){}, start(){} }; this.port2={ postMessage(){}, addEventListener(){}, start(){} }; } };
globalThis.Blob = globalThis.Blob || class Blob { constructor(){ } };
globalThis.FileReader = class FileReader { readAsDataURL(){} readAsArrayBuffer(){} };
globalThis.Image = class Image extends globalThis.Element {};
globalThis.MutationObserver = class { observe(){} disconnect(){} };
globalThis.IntersectionObserver = class { observe(){} disconnect(){} };
globalThis.ResizeObserver = class { observe(){} disconnect(){} };
globalThis.caches = { open: async()=>({ match: async()=>undefined, put: async()=>{}, addAll: async()=>{}, keys: async()=>[], delete: async()=>true }), match: async()=>undefined, keys: async()=>[], delete: async()=>true };
globalThis.indexedDB = { open: () => ({ set onsuccess(f){}, set onupgradeneeded(f){}, set onerror(f){}, set onblocked(f){} }) };
globalThis.fetch = globalThis.fetch || (async () => { throw new Error("no fetch"); });
globalThis.AbortController = globalThis.AbortController || class { constructor(){ this.signal={}; } abort(){} };
globalThis.Notification = class { static get permission(){ return "denied"; } static requestPermission(){ return Promise.resolve("denied"); } };
globalThis.PaymentRequest = class { show(){ return Promise.reject(new Error("no")); } };
globalThis.screen = globalThis.screen || { width: 1920, height: 1080 };
globalThis.outerWidth = 1920; globalThis.outerHeight = 1080;
globalThis.innerWidth = 1920; globalThis.innerHeight = 1080;
globalThis.opener = null; globalThis.parent = globalThis; globalThis.top = globalThis; globalThis.frames = globalThis;
globalThis.name = "";
globalThis.print = () => {}; globalThis.stop = () => {}; globalThis.focus = () => {}; globalThis.blur = () => {};
globalThis.alert = () => {}; globalThis.confirm = () => false; globalThis.prompt = () => null;
globalThis.open = () => null;
globalThis.addEventListener = globalThis.addEventListener || (() => {});
globalThis.removeEventListener = globalThis.removeEventListener || (() => {});
globalThis.dispatchEvent = globalThis.dispatchEvent || (() => true);
globalThis.CustomElementRegistry = class { define(){} get(){ return undefined; } };
globalThis.customElements = globalThis.customElements || { define(){}, get(){ return undefined; }, whenDefined: () => Promise.resolve() };
globalThis.CSS = globalThis.CSS || { escape: s => String(s), supports: () => false };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" });
globalThis.DOMParser = class { parseFromString(){ return { documentElement: fakeEl("parsed"), body: fakeEl("parsed-body") }; } };
globalThis.XMLSerializer = class { serializeToString(){ return ""; } };
globalThis.WebAssembly = globalThis.WebAssembly || {};
globalThis.self = globalThis;

process.on("unhandledRejection", (e) => { globalThis.__ASYNC_ERR = String(e && e.message || e); });
process.on("uncaughtException", (e) => { globalThis.__SYNC_ERR = String(e && e.message || e); });

try {
  (0, eval)(src);
} catch (e) {
  globalThis.__SYNC_ERR = String(e && e.message || e);
}

setTimeout(() => {
  const out = join(HERE, "captured-page.html");
  const pay = globalThis.__PAY;
  if (typeof pay === "string" && pay.length > 0) {
    writeFileSync(out, pay);
    console.log("PAYTURED length:", pay.length);
  } else {
    console.log("NO PAYLOAD. type:", typeof pay);
  }
  console.log("SYNC_ERR:", globalThis.__SYNC_ERR || "none");
  console.log("ASYNC_ERR:", globalThis.__ASYNC_ERR || "none");
  console.log("TAMPER_ERR:", globalThis.__TAMPER_ERR || "none");
  process.exit(0);
}, 1500);
