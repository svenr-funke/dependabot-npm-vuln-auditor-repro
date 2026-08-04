import Arborist from "@npmcli/arborist";
import http from "http";

// Exact advisory list from the failing job definition (job_1506154854)
const ADVISORIES = [
  { dependency_name: "js-yaml", affected_versions: [">= 5.0.0 <= 5.2.1"] },
  { dependency_name: "js-yaml", affected_versions: [">= 5.0.0 <= 5.1.0"] },
  { dependency_name: "js-yaml", affected_versions: [">= 3.0.0 < 3.15.0", ">= 4.0.0 < 4.3.0"] },
  { dependency_name: "js-yaml", affected_versions: [">= 5.0.0 <= 5.2.0"] },
  { dependency_name: "js-yaml", affected_versions: [">= 4.0.0 <= 4.1.1", "< 3.15.0"] },
  { dependency_name: "js-yaml", affected_versions: [">= 4.0.0 < 4.1.1", "< 3.14.2"] },
  { dependency_name: "js-yaml", affected_versions: ["< 3.13.0"] },
  { dependency_name: "js-yaml", affected_versions: ["< 3.13.1"] },
  { dependency_name: "js-yaml", affected_versions: ["< 2.0.5"] },
];

// verbatim port of convertAdvisoriesToRegistryBulkFormat
function toBulk(advisories) {
  const out = {};
  for (const a of advisories) {
    out[a.dependency_name] ??= [];
    for (const v of a.affected_versions) {
      out[a.dependency_name].push({ id: Math.floor(Math.random() * 1e15), vulnerable_versions: v });
    }
  }
  return out;
}

const body = JSON.stringify(toBulk(ADVISORIES));
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/-/npm/v1/security/advisories/bulk") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
  } else { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}`;

const dir = process.argv[2];
const arb = new Arborist({ path: dir, auditRegistry: url, noProxy: "127.0.0.1", force: true, dryRun: true, ignoreScripts: true });
const report = await arb.audit();
const vuln = report.get("js-yaml");
if (!vuln) { console.log("no js-yaml vuln found"); process.exit(0); }
console.log("fixAvailable:", JSON.stringify(vuln.fixAvailable));
console.log("range (computed vulnerable range):", vuln.range);
console.log("nodes:", [...vuln.nodes].map(n => `${n.pkgid} @ ${n.location}`));
console.log("via:", [...vuln.via].map(v => typeof v === "string" ? v : v.name));
for (const dep of ["@istanbuljs/load-nyc-config"]) {
  const mv = report.get(dep);
  if (mv) console.log(`metavuln ${dep}: range=${mv.range} fixAvailable=${JSON.stringify(mv.fixAvailable)}`);
}
server.close();
