import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const blockedTenantId = "11111111-1111-1111-1111-111111111111";
const blockedCompanyNames = [
  "گچ آهوان",
  "شرکت گچ سمنان ساری",
  "Ahavan",
];

const runtimeRoots = ["app", "src"];
const runtimeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

function collectFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "out") {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (runtimeExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const violations = [];

for (const root of runtimeRoots) {
  const absoluteRoot = path.join(projectRoot, root);

  if (!fs.existsSync(absoluteRoot)) {
    continue;
  }

  for (const file of collectFiles(absoluteRoot)) {
    const content = fs.readFileSync(file, "utf8");
    const relative = path.relative(projectRoot, file);

    if (content.includes(blockedTenantId)) {
      violations.push(`${relative}: hard-coded company id ${blockedTenantId}`);
    }

    for (const companyName of blockedCompanyNames) {
      if (content.includes(companyName)) {
        violations.push(`${relative}: hard-coded company name ${companyName}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Runtime tenant isolation check FAILED:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Runtime tenant isolation check PASSED.");
console.log("No Ahavan-specific company id/name was found under app/ or src/.");
