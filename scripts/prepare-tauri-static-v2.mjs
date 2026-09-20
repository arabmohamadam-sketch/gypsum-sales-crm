import fs from "fs";
import path from "path";

const root = process.cwd();

const backupDir = path.join(
  root,
  `.tauri-static-backup-${Date.now()}`
);

function abs(p) {
  return path.join(root, p);
}

function exists(p) {
  return fs.existsSync(abs(p));
}

function read(p) {
  return fs.readFileSync(abs(p), "utf8");
}

function write(p, value) {
  fs.mkdirSync(path.dirname(abs(p)), { recursive: true });
  fs.writeFileSync(abs(p), value, "utf8");
}

function backup(p) {
  if (!exists(p)) return;
  const dest = path.join(backupDir, p);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(abs(p), dest, { recursive: true });
}

fs.mkdirSync(backupDir, { recursive: true });

const dynamicRoutes = [
  ["app/activities/calls/[id]", "app/activities/calls/view", "callId"],
  ["app/activities/calls/[id]/edit", "app/activities/calls/edit", "callId"],
  ["app/activities/follow-ups/[id]/edit", "app/activities/follow-ups/edit", "followUpId"],
  ["app/customers/[id]", "app/customers/view", "customerId"],
  ["app/customers/[id]/edit", "app/customers/edit", "customerId"],
  ["app/orders/[id]", "app/orders/view", "orderId"],
  ["app/waybills/[id]", "app/waybills/view", "waybillId"],
];

for (const [from, to] of dynamicRoutes) {
  backup(path.join(from, "page.tsx"));
}

backup("next.config.ts");

for (const [from, to] of dynamicRoutes) {
  const source = abs(path.join(from, "page.tsx"));
  const target = abs(path.join(to, "page.tsx"));

  if (!fs.existsSync(source)) {
    throw new Error(`Missing route: ${from}`);
  }

  fs.mkdirSync(target.split(path.sep).slice(0, -1).join(path.sep), {
    recursive: true,
  });

  fs.copyFileSync(source, target);
}

const hook = `"use client";

import { useEffect, useState } from "react";

export function useQueryId(): string {
  const [id, setId] = useState("");

  useEffect(() => {
    const value =
      new URLSearchParams(window.location.search).get("id") ?? "";

    setId(value);
  }, []);

  return id;
}
`;

write("src/lib/hooks/useQueryId.ts", hook);

function transformUseParams(file, variable) {
  let text = read(file);

  text = text.replace(
    /import\s*\{\s*([^}]*)\}\s*from\s*["']next\/navigation["'];?/m,
    (full, body) => {
      const names = body
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((x) => !/^useParams(?:\b|$)/.test(x));

      const nextNav = [...new Set(names)];

      let result = "";

      if (nextNav.length) {
        result += `import { ${nextNav.join(", ")} } from "next/navigation";\n`;
      }

      result +=
        'import { useQueryId } from "@/src/lib/hooks/useQueryId";';

      return result;
    }
  );

  const variablePattern = new RegExp(
    String.raw`const\s+${variable}\s*=\s*typeof\s+params\??\.id\s*===\s*"string"\s*\?\s*params\??\.id\s*:\s*""\s*;`,
    "m"
  );

  if (!variablePattern.test(text)) {
    throw new Error(
      `Could not find ${variable} params.id block in ${file}`
    );
  }

  text = text.replace(
    variablePattern,
    `const ${variable} = useQueryId();`
  );

  text = text.replace(
    /const\s+params\s*=\s*useParams(?:<[\s\S]*?>)?\(\)\s*;\s*/m,
    ""
  );

  if (text.includes("useParams")) {
    throw new Error(`useParams still exists in ${file}`);
  }

  write(file, text);
}

transformUseParams(
  "app/activities/calls/view/page.tsx",
  "callId"
);

transformUseParams(
  "app/activities/calls/edit/page.tsx",
  "callId"
);

transformUseParams(
  "app/activities/follow-ups/edit/page.tsx",
  "followUpId"
);

transformUseParams(
  "app/customers/edit/page.tsx",
  "customerId"
);

transformUseParams(
  "app/orders/view/page.tsx",
  "orderId"
);

transformUseParams(
  "app/waybills/view/page.tsx",
  "waybillId"
);

write(
  "app/customers/view/page.tsx",
  `"use client";

import CustomerPage from "@/src/lib/components/customers/CustomerPage";
import { useQueryId } from "@/src/lib/hooks/useQueryId";

export default function Page() {
  const customerId = useQueryId();

  if (!customerId) {
    return null;
  }

  return <CustomerPage customerId={customerId} />;
}
`
);

for (const [from, to] of dynamicRoutes) {
  const sourceDir = abs(from);
  const page = path.join(sourceDir, "page.tsx");

  if (fs.existsSync(page)) {
    fs.rmSync(sourceDir, {
      recursive: true,
      force: true,
    });
  }
}

const scanRoots = ["app", "src"];

function walk(dir) {
  const full = abs(dir);
  const out = [];

  if (!fs.existsSync(full)) return out;

  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(rel));
    } else if (
      entry.name.endsWith(".tsx") ||
      entry.name.endsWith(".ts")
    ) {
      out.push(rel);
    }
  }

  return out;
}

const replacements = [
  [
    /\/activities\/calls\/\$\{([^}]+)\}\/edit/g,
    "/activities/calls/edit?id=${encodeURIComponent($1)}",
  ],
  [
    /\/activities\/calls\/\$\{([^}]+)\}/g,
    "/activities/calls/view?id=${encodeURIComponent($1)}",
  ],
  [
    /\/activities\/follow-ups\/\$\{([^}]+)\}\/edit/g,
    "/activities/follow-ups/edit?id=${encodeURIComponent($1)}",
  ],
  [
    /\/customers\/\$\{([^}]+)\}\/edit/g,
    "/customers/edit?id=${encodeURIComponent($1)}",
  ],
  [
    /\/customers\/\$\{([^}]+)\}/g,
    "/customers/view?id=${encodeURIComponent($1)}",
  ],
  [
    /\/orders\/\$\{([^}]+)\}/g,
    "/orders/view?id=${encodeURIComponent($1)}",
  ],
  [
    /\/waybills\/\$\{([^}]+)\}/g,
    "/waybills/view?id=${encodeURIComponent($1)}",
  ],
];

for (const base of scanRoots) {
  for (const file of walk(base)) {
    let text = read(file);

    if (file.includes(`${path.sep}[id]${path.sep}`)) {
      continue;
    }

    const original = text;

    for (const [pattern, replacement] of replacements) {
      text = text.replace(pattern, replacement);
    }

    if (text !== original) {
      write(file, text);
    }
  }
}

const testApi = "app/api/test-supabase";

if (exists(testApi)) {
  fs.rmSync(abs(testApi), {
    recursive: true,
    force: true,
  });
}

console.log("");
console.log("Static Tauri patch applied successfully.");
console.log(`Backup: ${path.relative(root, backupDir)}`);
console.log("Dynamic routes converted to query-based static routes.");
console.log("Test API removed from static export.");
console.log("");
