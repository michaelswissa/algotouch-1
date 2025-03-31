
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  showValue?: boolean
  showTooltips?: boolean
  tooltipLabels?: Record<number, string>
}

const SliderTrack = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Track>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Track>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Track
    ref={ref}
    className={cn(
      "relative h-2 w-full grow overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  />
))
SliderTrack.displayName = SliderPrimitive.Track.displayName

const SliderRange = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Range>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Range>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Range
    ref={ref}
    className={cn("absolute h-full bg-primary", className)}
    {...props}
  />
))
SliderRange.displayName = SliderPrimitive.Range.displayName

const SliderThumb = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Thumb>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Thumb>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Thumb
    ref={ref}
    className={cn(
      "block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
SliderThumb.displayName = SliderPrimitive.Thumb.displayName

const SliderValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { tooltip?: string }
>(({ className, tooltip, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "absolute -top-8 left-1/2 -translate-x-1/2 rounded-sm bg-primary px-2 py-1 text-xs text-primary-foreground shadow-md",
      className
    )}
    {...props}
  >
    {props.children}
    {tooltip && (
      <span className="block text-[10px] opacity-90 mt-0.5 max-w-[120px] text-center whitespace-normal">
        {tooltip}
      </span>
    )}
  </span>
))
SliderValue.displayName = "SliderValue"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, showValue = false, showTooltips = false, tooltipLabels = {}, ...props }, ref) => {
  const value = props.value && Array.isArray(props.value) ? props.value[0] : props.value;
  const tooltipLabel = tooltipLabels && value !== undefined ? tooltipLabels[value as number] : undefined;
  
  return (
    <div className="relative pt-8">
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <SliderTrack>
          <SliderRange />
        </SliderTrack>
        {props.value && showValue && (
          <SliderValue tooltip={tooltipLabel}>
            {Array.isArray(props.value) ? props.value[0] : props.value}
          </SliderValue>
        )}
        <SliderThumb />
      </SliderPrimitive.Root>
      
      {/* Show fixed labels at the bottom if tooltips are enabled */}
      {showTooltips && tooltipLabels && Object.keys(tooltipLabels).length > 0 && (
        <div className="flex justify-between px-1 mt-2 text-xs text-muted-foreground">
          {Object.entries(tooltipLabels).map(([value, label]) => (
            <span key={value} className="text-center">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider, SliderTrack, SliderRange, SliderThumb, SliderValue }
