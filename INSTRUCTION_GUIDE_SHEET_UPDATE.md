# Instruction Guide Sheet Restructure

## Summary
Fixed the layout and styling issues in the "Writing good agent instructions" side sheet on `/agents` by implementing a fixed header/footer with scrollable body structure.

## Files Changed

### `src/modules/agents/ui/components/agents-list-header.tsx`

**Major Changes:**

1. **Restructured Sheet into Three Fixed Zones**
   - **Header (fixed)**: `shrink-0 px-6 py-5 border-b border-border/60`
     - Flex row layout with title/subtitle on left, close button on right
     - Title: `text-lg font-semibold text-text`
     - Subtitle: `text-sm text-muted mt-1`
     - Close button: `size-9 rounded-lg hover:bg-brand-100` with focus ring
   
   - **Body (scrollable only)**: `flex-1 overflow-y-auto px-6 py-6`
     - Added `scrollbarGutter: 'stable'` to prevent content jump
     - Custom 6px rounded scrollbar with border-colored thumb
     - Content uses `space-y-6` rhythm
   
   - **Footer (fixed)**: `shrink-0 border-t border-border/60 bg-white px-6 py-4`
     - Added `pb-[env(safe-area-inset-bottom)]` for mobile safe area
     - Button now fixed at bottom, never scrolls

2. **Fixed the Last Button**
   - Changed to standard Button component spec: `h-11 w-full rounded-xl px-5 text-sm font-semibold`
   - Uses primary variant consistent with other CTAs
   - Removed custom sizing overrides

3. **Updated Content Spacing**
   - Consistent `space-y-6` between all sections
   - Section headings: `text-sm font-semibold text-brand-900`
   - Section descriptions: `mt-1 text-sm leading-relaxed text-muted`
   - Example cards spacing: `space-y-4 pt-2`

4. **Improved Example Cards**
   - Border: `border-border/60` (more subtle)
   - Background: `bg-brand-50` (consistent with brand)
   - Padding: `p-5` (more spacious)
   - Header label: `text-xs font-semibold uppercase tracking-wide text-brand-700`
   - Copy button: `h-8 rounded-lg px-2.5 text-xs font-medium` with focus ring
   - Body text: Parsed into separate paragraphs with `space-y-1.5 text-sm leading-relaxed text-text`

5. **Sheet Container Polish**
   - Added: `border-l border-border/60 shadow-2xl`
   - Set: `p-0 gap-0` to remove default padding (zones manage their own)
   - Set: `flex h-full flex-col` for proper layout
   - Disabled default close button: `showCloseButton={false}` (using custom one)
   - Width: `w-full sm:max-w-md max-w-full`

6. **Removed Unused Imports**
   - Removed `SheetHeader`, `SheetTitle`, `SheetDescription` (not using the built-in header anymore)

## Layout Structure

```
┌─────────────────────────────────────┐
│ HEADER (fixed)                      │
│ • Title + Subtitle                  │
│ • Close Button (right-aligned)      │
├─────────────────────────────────────┤
│ BODY (scrollable)                   │
│ • Role section                      │
│ • Tone section                      │
│ • Rules section                     │
│ • Voice tips section                │
│ • Example cards                     │
│   - Coding mentor                   │
│   - Meeting note-taker              │
│                                     │
│ [scroll area]                       │
│                                     │
├─────────────────────────────────────┤
│ FOOTER (fixed)                      │
│ • "Create agent with an example"    │
└─────────────────────────────────────┘
```

## Spacing Values

- **Header**: `px-6 py-5`
- **Body**: `px-6 py-6` with `space-y-6` for content
- **Footer**: `px-6 py-4`
- **Section spacing**: `mt-1` for descriptions
- **Example cards**: `p-5` with `mb-3` for header, `space-y-1.5` for content
- **Cards gap**: `space-y-4`

## Benefits

1. **No More Header Scroll**: Title and close button stay visible at all times
2. **Fixed CTA**: "Create agent" button always accessible, never hidden by scroll
3. **Consistent Button Style**: Matches other CTAs (Create Agent, New Meeting)
4. **Better Alignment**: Close button properly aligned with title
5. **No Scrollbar Overlap**: Button in footer, content doesn't run under scrollbar
6. **Mobile Safe**: Added safe area inset for iOS devices
7. **Stable Scrollbar**: Content doesn't jump when scrollbar appears/disappears

## Verification Checklist

✅ Header stays fixed when scrolling
✅ Footer stays fixed when scrolling
✅ Only body content scrolls
✅ Button matches other CTAs (h-11, rounded-xl, proper font)
✅ Close button aligned with title
✅ Consistent padding (px-6) across all zones
✅ Custom scrollbar (6px, rounded, subtle)
✅ Spacing rhythm maintained (space-y-6)
✅ Focus rings on interactive elements
✅ ESC key closes the sheet (handled by Sheet component)
✅ Mobile safe area inset added

## Notes

- The "N" badge visible in the screenshots is Next.js dev-mode indicator and won't appear in production
- The Sheet primitive's default close button has been disabled in favor of a custom one that aligns better with the header
- Scrollbar gutter is set to 'stable' to prevent layout shift when scrollbar appears
- All semantic color tokens (text-text, text-muted, border-border) are used for theme consistency
