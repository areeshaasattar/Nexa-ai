/**
 * Dashboard sidebar nav theme (light surface).
 *
 * Single source of truth for the nav item colors and class strings. It is
 * used by `DashboardSidebar` AND by `scripts/test-contrast.ts`, so the WCAG
 * assertions always test exactly what renders. The hex values mirror the
 * brand tokens in `src/app/globals.css`:
 * - Surface: brand-50 (white)
 * - Inactive text: text-muted (5a6b62, 5.8:1 on white)
 * - Hover background: brand-100 (soft tint)
 * - Active background: brand-100
 * - Active text: brand-800 (dark forest green, 8:1 on white)
 * - Focus ring: brand-500
 */
export const SIDEBAR_NAV_THEME = {
  colors: {
    /** Sidebar surface. */
    surface: "#ffffff",
    /** Inactive text and icon: text-muted (5a6b62, 5.8:1 on white). */
    inactiveText: "#5a6b62",
    /** Hover background: brand-100 (soft green tint). */
    hoverBg: "#bbd7c4",
    /** Active and pressed background (same token as hover). */
    activeBg: "#bbd7c4",
    /** Active and pressed text/icon: brand-800 (dark forest green). */
    activeText: "#14533a",
    /** Focus-visible ring: brand-500. */
    focusRing: "#2f9e68",
  },
  classes: {
    /** Applied to every nav `SidebarMenuButton` (h-10, rounded-10, px-3, focus ring). */
    itemButton:
      "h-10 rounded-[10px] px-3 text-text-muted focus-visible:ring-offset-2",
    /** Added on top when the item is active (semibold label + text color). */
    itemButtonActive: "data-active:font-semibold data-active:text-brand-800",
    /** Applied to the nav link inside the button; label/icon inherit `currentColor`. */
    itemLink: "flex items-center gap-3",
  },
} as const;
