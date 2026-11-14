/**
 * WCAG contrast assertions for the dashboard sidebar nav states.
 * Colors are imported from the SAME module the sidebar component uses
 * (`src/components/layout/sidebar-theme.ts`), so this test always asserts
 * exactly what renders. Pure computation — no network, no DB.
 */
import assert from "node:assert/strict";
import { SIDEBAR_NAV_THEME } from "../src/components/layout/sidebar-theme";

/** sRGB hex (#rrggbb) → relative luminance per WCAG 2.1. */
function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  assert.ok(match, `Expected #rrggbb hex color, got: ${hex}`);
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(hex.slice(offset + 1, offset + 3), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return (
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  );
}

/** WCAG 2.1 contrast ratio between two hex colors. */
function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function main() {
  const { colors } = SIDEBAR_NAV_THEME;

  // Nav text pairs must meet WCAG AA for normal text (≥ 4.5:1).
  const pairs: Array<[string, string, string]> = [
    ["inactive text on sidebar surface", colors.inactiveText, colors.surface],
    ["hover text on hover background", colors.activeText, colors.hoverBg],
    ["active text on active background", colors.activeText, colors.activeBg],
    // Pressed uses the same classes as active (active: resolves to the
    // sidebar-accent token), asserted as the same pair on purpose.
    ["pressed text on pressed background", colors.activeText, colors.activeBg],
  ];
  for (const [label, fg, bg] of pairs) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(
      ratio >= 4.5,
      `${label} (${fg} on ${bg}) is ${ratio.toFixed(2)}:1 — needs ≥ 4.5:1`,
    );
  }

  // The active pill must be visibly different from the white sidebar
  // surface (≥ 1.05:1) so the selected state reads at a glance.
  const pillRatio = contrastRatio(colors.activeBg, colors.surface);
  assert.ok(
    pillRatio >= 1.05,
    `active pill vs white surface is ${pillRatio.toFixed(2)}:1 — needs ≥ 1.05:1`,
  );

  // Focus-visible ring (non-text) must meet WCAG 1.4.11 (≥ 3:1).
  const ringRatio = contrastRatio(colors.focusRing, colors.surface);
  assert.ok(
    ringRatio >= 3,
    `focus ring vs white surface is ${ringRatio.toFixed(2)}:1 — needs ≥ 3:1`,
  );

  console.log(
    `test:contrast passed — inactive ${contrastRatio(colors.inactiveText, colors.surface).toFixed(2)}:1, ` +
      `active ${contrastRatio(colors.activeText, colors.activeBg).toFixed(2)}:1, ` +
      `pill-vs-white ${pillRatio.toFixed(2)}:1, ring ${ringRatio.toFixed(2)}:1`,
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
