// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Shared class strings for the environment top bar, in their own module so the
// bar and the components it embeds (notification bell, media control) can all
// use them without a circular import through noctalia-bar.

// Every 28px bar icon button: quiet hover, pressed scale, visible focus ring.
export const BAR_ICON_BUTTON =
  "text-foreground/80 hover:bg-foreground/8 hover:text-foreground active:bg-foreground/12 focus-visible:ring-primary focus-visible:ring-offset-card relative inline-grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg transition-[background-color,color,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.94] [&_svg]:size-3.5"
