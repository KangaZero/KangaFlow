# KangaFlow — Open Tasks

## Accessibility (a11y)

### Reduced motion audit
`MotionConfig` in `global-state-provider.tsx` covers all `motion.*` animations globally.
CSS animations are suppressed via `[data-animations="off"]` in `globals.css`.
JS-side effects that animate outside framer-motion need individual `useReducedMotion()` checks.

- [ ] `components/media-player.tsx` — scrolling tab-title interval: **done** (guarded by `shouldReduceMotion`)
- [ ] `components/niri/environment-view.tsx` — `AutoHideBar` spring slide: verify `MotionConfig` covers it
- [ ] `components/niri/noctalia-settings.tsx` — sidebar width animation: verify `MotionConfig` covers it
- [ ] `components/niri/noctalia-bar.tsx` — any JS-driven animation outside framer
- [ ] `components/niri/noctalia-launcher.tsx` — any JS-driven animation outside framer

### ARIA / keyboard / focus
- [ ] Audit all `role="option"` buttons for required listbox parent (`role="listbox"`)
- [ ] Ensure all dialogs/overlays trap focus (`noctalia-settings`, `noctalia-launcher`, `media-player`)
- [ ] Confirm drag handle in `media-player.tsx` is keyboard-accessible or hidden from assistive tech
- [ ] Add `aria-live="polite"` region for track changes in media player (screen reader "now playing" announcements)
- [ ] Verify colour contrast ratios for all theme variants (light / dark / terminal)
