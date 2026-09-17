import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const html = readFileSync(new URL("../aether-terminal.html", import.meta.url), "utf8");
const bs = html.indexOf("var docs = ");
const end = html.indexOf(";\n", bs);
let json = html.slice(bs + "var docs = ".length, end).replace(/<\\\//g, "</");
const docs = JSON.parse(json);
console.log("docs:", Object.keys(docs).join(", "), "|", Object.entries(docs).map(([k,v]) => k + "=" + (v.length/1024).toFixed(0) + "K").join(" "));

for (const [name, doc] of Object.entries(docs)) {
  // extract inline scripts
  const re = /<script>([^]*?)<\/script>/g;
  let m, i = 0, fails = 0;
  while ((m = re.exec(doc))) {
    i++;
    const { writeFileSync, unlinkSync } = await import("node:fs");
    writeFileSync(`/tmp/doc-${name}-${i}.js`, m[1]);
    const r = spawnSync("node", ["--check", `/tmp/doc-${name}-${i}.js`], { encoding: "utf8" });
    if (r.status !== 0) { fails++; console.log(`${name}#${i}: SYNTAX ERROR: ${(r.stderr||"").slice(0,200)}`); }
  }
  console.log(`${name}: ${i} script(s), ${fails} errors`);
}
