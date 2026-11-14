/**
 * Dashboard sidebar nav theme (light surface).
 *
 * Single source of truth for the nav item colors and class strings. It is
 * used by `DashboardSidebar` AND by `scripts/test-contrast.ts`, so the WCAG
 * assertions always test exactly what renders. The hex values mirror the
 * sidebar theme tokens in `src/app/globals.css` (`--color-sidebar-*`),
 * which the shared `SidebarMenuButton` primitives resolve for the
 * hover/active/pressed states (`bg-sidebar-accent`,
 * `text-sidebar-accent-foreground`, `ring-sidebar-ring`).
 */
export const SIDEBAR_NAV_THEME = {
  colors: {
    /** Sidebar surface. */
    surface: "#ffffff",
    /** Inactive text and icon: slate-600 (7.5:1 on white). */
    inactiveText: "#475569",
    /** Hover background: emerald-100 (brand green ≈12% tint on white). */
    hoverBg: "#d1fae5",
    /** Active and pressed background (same token as hover). */
    activeBg: "#d1fae5",
    /** Active and pressed text/icon: emerald-800 (dark brand green). */
    activeText: "#065f46",
    /** Focus-visible ring: emerald-600. */
    focusRing: "#059669",
  },
  classes: {
    /** Applied to every nav `SidebarMenuButton` (shape + inactive text + focus ring offset). */
    itemButton:
      "h-11 rounded-xl px-4 text-slate-600 focus-visible:ring-offset-2",
    /** Added on top when the item is active (semibold label). */
    itemButtonActive: "data-active:font-semibold",
    /** Applied to the nav link inside the button; label/icon inherit `currentColor`. */
    itemLink: "flex items-center gap-3",
  },
} as const;
