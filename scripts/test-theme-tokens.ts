/**
 * Theme token enforcement: scans codebase for hard-coded colors.
 * Ensures all semantic colors use CSS variables or Tailwind brand tokens.
 * Run: npm run test:theme-tokens
 */

import * as fs from "fs";
import * as path from "path";

interface Violation {
  file: string;
  line: number;
  match: string;
  type: string;
}

const violations: Violation[] = [];

// Files/paths to exclude
const ALLOWLIST_PATHS = [
  "src/app/globals.css",
  "src/lib/email-templates.ts",
  "src/app/(marketing)",
  "src/app/call",
  "scripts",
  "node_modules",
  ".next",
];

// Recursively find files
function findFiles(dir: string, ext: string[], found: string[] = []): string[] {
  try {
    const entries = fs.readdirSync(dir);
    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!ALLOWLIST_PATHS.some((p) => fullPath.includes(p))) {
          findFiles(fullPath, ext, found);
        }
      } else if (ext.some((e) => fullPath.endsWith(e))) {
        if (!ALLOWLIST_PATHS.some((p) => fullPath.includes(p))) {
          found.push(fullPath);
        }
      }
    });
  } catch (e) {
    // Skip inaccessible dirs
  }
  return found;
}

// Patterns to detect (non-brand hard-coded colors)
const PATTERNS = [
  {
    name: "Hex color literal",
    pattern: /#[0-9a-fA-F]{6}(?![0-9a-fA-F])/g,
    test: (match: string) => {
      const brandHexes = [
        "#f0faf4", "#dcf3e5", "#b9e6cb", "#8bd3ab", "#55b884", "#2f9e68",
        "#1f8454", "#176a44", "#14533a", "#0f3d2b", "#0a2a1e",
        "#f7fcf9", "#eaf6ef", "#ffffff", "#f7fbf9", "#e1ece5", "#cfe0d6",
        "#10231a", "#5a6b62", "#7b8b83", "#dc2626", "#fef2f2",
      ];
      return !brandHexes.includes(match.toLowerCase());
    },
  },
  {
    name: "Dark mode variant",
    pattern: /dark:/g,
    test: () => true,
  },
];

// Scan files
const srcFiles = findFiles("src", [".ts", ".tsx", ".css"]);

console.log(`\n🔎 Scanning ${srcFiles.length} files for hard-coded colors...\n`);

srcFiles.forEach((file) => {
  try {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, lineIndex) => {
      PATTERNS.forEach(({ name, pattern, test }) => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          if (test(match[0])) {
            violations.push({
              file,
              line: lineIndex + 1,
              match: match[0],
              type: name,
            });
          }
        }
      });
    });
  } catch (e) {
    // Skip unreadable files
  }
});

// Report results
if (violations.length === 0) {
  console.log("✅ All colors use tokens! No violations found.\n");
  process.exit(0);
} else {
  console.error(`❌ Found ${violations.length} hard-coded color violation(s):\n`);
  violations.slice(0, 20).forEach(({ file, line, match, type }) => {
    console.error(`${file}:${line} [${type}] ${match}`);
  });
  if (violations.length > 20) {
    console.error(`... and ${violations.length - 20} more`);
  }
  console.error(`\nFix by replacing with brand tokens or CSS variables.\n`);
  process.exit(1);
}
