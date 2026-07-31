import {
  PopoverClose as PopoverClosePrimitive,
  type PopoverCloseProps as PopoverClosePrimitiveProps,
  PopoverContent as PopoverContentPrimitive,
  type PopoverContentProps as PopoverContentPrimitiveProps,
  PopoverPortal as PopoverPortalPrimitive,
  Popover as PopoverPrimitive,
  type PopoverProps as PopoverPrimitiveProps,
  PopoverTrigger as PopoverTriggerPrimitive,
  type PopoverTriggerProps as PopoverTriggerPrimitiveProps,
} from "@/components/animate-ui/primitives/radix/popover"
import { cn } from "@/lib/utils"
import { Z_LAYERS } from "@/lib/z-order"

type PopoverProps = PopoverPrimitiveProps

function Popover(props: PopoverProps) {
  return <PopoverPrimitive {...props} />
}

type PopoverTriggerProps = PopoverTriggerPrimitiveProps

function PopoverTrigger(props: PopoverTriggerProps) {
  return <PopoverTriggerPrimitive {...props} />
}

type PopoverContentProps = PopoverContentPrimitiveProps

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  style,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPortalPrimitive>
      <PopoverContentPrimitive
        align={align}
        className={cn(
          "w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden",
          className
        )}
        sideOffset={sideOffset}
        style={{ zIndex: Z_LAYERS.popover, ...style }}
        {...props}
      />
    </PopoverPortalPrimitive>
  )
}

type PopoverCloseProps = PopoverClosePrimitiveProps

function PopoverClose(props: PopoverCloseProps) {
  return <PopoverClosePrimitive {...props} />
}

export {
  Popover,
  PopoverClose,
  type PopoverCloseProps,
  PopoverContent,
  type PopoverContentProps,
  type PopoverProps,
  PopoverTrigger,
  type PopoverTriggerProps,
}
