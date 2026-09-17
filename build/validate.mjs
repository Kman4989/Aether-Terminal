import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const html = readFileSync(new URL("../aether-terminal.html", import.meta.url), "utf8");
console.log("size:", (html.length / 1048576).toFixed(2), "MB");

// 1) extract top-level scripts (not inside JSON strings — the JSON-escaped ones contain <\/script>)
const scripts = [];
const re = /<script type="text\/javascript">/g;
let m;
while ((m = re.exec(html))) {
  // find closing </script> from this point
  const end = html.indexOf("<" + "/script>", m.index);
  scripts.push([m.index, end, html.slice(m.index + m[0].length, end)]);
  re.lastIndex = end;
}
console.log("top-level script blocks:", scripts.length);
scripts.forEach(([a, b, s], i) => console.log(`  #${i}: offset=${a} len=${(s.length / 1024).toFixed(0)}K starts: ${JSON.stringify(s.slice(0, 60))}`));

// 2) syntax check each block
for (const [i, [a, b, s]] of scripts.entries()) {
  const r = spawnSync("node", ["--check", "--input-type=module"], { input: s, encoding: "utf8" });
  // --check with stdin: node --check file — use a temp approach: write & check
  if (r.status !== 0) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(`/tmp/script-${i}.js`, s);
    const r2 = spawnSync("node", ["--check", `/tmp/script-${i}.js`], { encoding: "utf8" });
    console.log(`script #${i}: ${r2.status === 0 ? "OK" : "SYNTAX ERROR: " + (r2.stderr || "").slice(0, 400)}`);
  } else {
    console.log(`script #${i}: OK`);
  }
}

// 3) structural checks
const checks = [
  ["pages markup present", html.includes('id="games-page"') && html.includes('id="webemu-page"')],
  ["no stub main left", !html.includes("<main id=\"content-page\">")],
  ["no base tag in shell", !html.slice(0, 200000).includes('<base href="/"')],
  ["no external stylesheet", !html.includes('rel="stylesheet" type="text/css" href="index.css"')],
  ["no server script refs", !html.includes('src="main.js"')],
  ["res icons inlined", !/src="res\//.test(html) ],
  ["css inlined", !html.includes('href="index.css"')],
  ["dark css inlined", !html.includes("/index.dark.css")],
  ["player blob fn", html.includes("__NP")],
  ["ext placeholders", html.includes("__AETHER_WEBEMU__")],
  ["cloudflare removed", !html.includes("cdn-cgi")],
  ["hls present", scripts.some(s => s[2].includes("Hls"))],
];
for (const [name, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + name);
