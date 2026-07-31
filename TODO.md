# KangaFlow — Open Tasks

## Accessibility (a11y)

### Reduced motion audit — done
`MotionConfig` in `global-state-provider.tsx` covers declarative `motion.*`
transform/layout animations globally. CSS animations/transitions are suppressed
via the `prefers-reduced-motion` media query **and** the `[data-animations="off"]`
kill-switch in `globals.css`. Two things escape both and needed explicit
`useReducedMotion()` checks: raw JS scroll animations, and `useSpring`
MotionValues (which `MotionConfig.reducedMotion` does **not** govern).

- [x] `components/media-player.tsx` — scrolling tab-title interval: guarded by `shouldReduceMotion`
- [x] `components/niri/environment-view.tsx` — `AutoHideBar` slide covered (MotionConfig transform + explicit `shouldReduceMotion` guard); overview `scrollTo` now uses `behavior: auto` under reduced motion
- [x] `components/niri/noctalia-settings.tsx` — sidebar width/opacity animation: explicit `shouldReduceMotion` guard on the transition
- [x] `components/niri/noctalia-bar.tsx` — no raw-JS animation; tooltips are `motion.*`, hovers are CSS (covered by the media-query reset); clock `Counter` fixed (below)
- [x] `components/niri/noctalia-launcher.tsx` — highlighted-row `scrollIntoView` now uses `behavior: auto` under reduced motion
- [x] `components/Counter.tsx` — rolling-digit `useSpring` now feeds an instant `MotionValue` under reduced motion (used by the bar clock + alarm widget)

### ARIA / keyboard / focus
- [ ] Audit all `role="option"` buttons for required listbox parent (`role="listbox"`)
- [ ] Ensure all dialogs/overlays trap focus (`noctalia-settings`, `noctalia-launcher`, `media-player`)
- [ ] Confirm drag handle in `media-player.tsx` is keyboard-accessible or hidden from assistive tech
- [ ] Add `aria-live="polite"` region for track changes in media player (screen reader "now playing" announcements)
- [ ] Verify colour contrast ratios for all theme variants (light / dark / terminal)
