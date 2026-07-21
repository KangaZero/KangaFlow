import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        // Base sits on a `bg-background` surface (e.g. the settings dialog);
        // inside a tooltip it sits on `bg-card`, so it recolours to card tokens.
        // Uses only per-theme semantic tokens (no `dark:`) so it fits light,
        // dark, AND the terminal/Mocha theme, which applies its own class.
        "pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-xs bg-muted in-data-[slot=tooltip-content]:bg-card-foreground/10 px-1 font-medium font-sans in-data-[slot=tooltip-content]:text-card-foreground text-[0.625rem] text-muted-foreground [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      data-slot="kbd"
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      className={cn("inline-flex items-center gap-1", className)}
      data-slot="kbd-group"
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
