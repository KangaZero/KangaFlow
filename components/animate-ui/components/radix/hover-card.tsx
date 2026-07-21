import {
  HoverCardContent as HoverCardContentPrimitive,
  type HoverCardContentProps as HoverCardContentPrimitiveProps,
  HoverCardPortal as HoverCardPortalPrimitive,
  HoverCard as HoverCardPrimitive,
  type HoverCardProps as HoverCardPrimitiveProps,
  HoverCardTrigger as HoverCardTriggerPrimitive,
  type HoverCardTriggerProps as HoverCardTriggerPrimitiveProps,
} from "@/components/animate-ui/primitives/radix/hover-card"
import { cn } from "@/lib/utils"

type HoverCardProps = HoverCardPrimitiveProps

function HoverCard(props: HoverCardProps) {
  return <HoverCardPrimitive {...props} />
}

type HoverCardTriggerProps = HoverCardTriggerPrimitiveProps

function HoverCardTrigger(props: HoverCardTriggerProps) {
  return <HoverCardTriggerPrimitive {...props} />
}

type HoverCardContentProps = HoverCardContentPrimitiveProps

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: HoverCardContentProps) {
  return (
    <HoverCardPortalPrimitive>
      <HoverCardContentPrimitive
        align={align}
        className={cn(
          "z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden",
          className
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </HoverCardPortalPrimitive>
  )
}

export {
  HoverCard,
  HoverCardContent,
  type HoverCardContentProps,
  type HoverCardProps,
  HoverCardTrigger,
  type HoverCardTriggerProps,
}
