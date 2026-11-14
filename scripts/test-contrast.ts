/**
 * WCAG 2.1 contrast ratio validator.
 * Parses brand tokens from globals.css and asserts minimum 4.5:1 for text on surfaces.
 * Run: npm run test:contrast
 */

import * as fs from "fs";
import * as path from "path";

// Calculate relative luminance per WCAG 2.1
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Contrast ratio between two colors
function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Parse hex to RGB
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

// Extract CSS variables from globals.css
function parseTokens(cssContent: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const varRegex = /--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi;
  let match;
  while ((match = varRegex.exec(cssContent)) !== null) {
    tokens[match[1].toLowerCase()] = match[2];
  }
  return tokens;
}

const cssPath = path.join(__dirname, "../src/app/globals.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");
const tokens = parseTokens(cssContent);

const tests: { name: string; color1: [number, number, number]; color2: [number, number, number]; minRatio: number }[] = [];

// Helper to add test
function addTest(name: string, tokenA: string, tokenB: string, minRatio: number = 4.5) {
  const colorA = hexToRgb(tokens[tokenA]);
  const colorB = hexToRgb(tokens[tokenB]);
  if (colorA && colorB) {
    tests.push({ name, color1: colorA, color2: colorB, minRatio });
  } else {
    console.warn(`⚠️  Skipping ${name}: missing token ${!colorA ? tokenA : tokenB}`);
  }
}

// Text on surface pairs
addTest("text on surface", "text", "surface", 4.5);
addTest("text on page-bg", "text", "page-bg-start", 4.5);
addTest("text-muted on surface", "text-muted", "surface", 4.5);
addTest("text-muted on page-bg", "text-muted", "page-bg-start", 4.5);
addTest("white on brand-600", "surface", "brand-600", 4.5);
addTest("brand-700 on white", "brand-700", "surface", 4.5);

// Sidebar nav states
addTest("sidebar inactive text on white", "text-muted", "surface", 4.5);
addTest("sidebar active text on brand-100", "brand-800", "brand-100", 4.5);
addTest("sidebar active pill differs from white", "brand-100", "surface", 1.5); // Just needs to be visually distinct

// Badge variants
addTest("brand badge (white on brand-600)", "surface", "brand-600", 4.5);
addTest("success badge (brand-800 on brand-100)", "brand-800", "brand-100", 4.5);
addTest("danger text on white", "danger", "surface", 4.5);

// Status colors
addTest("brand-900 (donut dark)", "brand-900", "surface", 4.5);

// Run all tests
let passed = 0;
let failed = 0;

console.log("\n🔍 Testing WCAG 2.1 contrast ratios...\n");

tests.forEach(({ name, color1, color2, minRatio }) => {
  const ratio = getContrastRatio(color1, color2);
  const status = ratio >= minRatio ? "✓" : "✗";
  const result = ratio >= minRatio ? "PASS" : "FAIL";

  if (ratio >= minRatio) {
    passed++;
    console.log(`${status} ${name}: ${ratio.toFixed(2)}:1 (required ${minRatio}:1)`);
  } else {
    failed++;
    console.error(`${status} ${name}: ${ratio.toFixed(2)}:1 (required ${minRatio}:1) ${result}`);
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
