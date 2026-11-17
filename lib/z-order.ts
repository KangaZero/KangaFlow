// Single source of truth for cross-surface stacking order in the niri
// environment. Every floating / overlay surface reads its z-index from here, so
// the layering is defined in exactly one place instead of scattered `z-50`s.
//
// Bands, low → high:
//   bar               desktop chrome; content and windows sit above it
//   window..windowMax  floating widgets — click-to-front counts up in this band
//   keyboard          the on-screen keyboard: above every window it types into
//   panel             full-screen modal panels (launcher, desktop settings)
//   dialog            radix dialogs (wallpaper, help, settings, terminal, command)
//   popover           bar dropdowns (notifications) — always on top
//   hint              link-hint ("f") overlay — above everything hintable
//   unlockDim         achievement-unlock screen dim, just below the toast
//   unlockFx          achievement-unlock particles + flash, just above the toast
//   transition        route-transition bubble swarm — covers the whole app
//
// The bands are spaced (not adjacent) so the click-to-front counter, clamped at
// `windowMax`, can never push a widget up into the panel/dialog band.
export const Z_LAYERS = {
  bar: 30,
  dialog: 1000,
  hint: 1200,
  keyboard: 850,
  panel: 900,
  popover: 1100,
  toast: 1150,
  transition: 1300,
  unlockDim: 1140,
  unlockFx: 1160,
  window: 100,
  windowMax: 800,
} as const
