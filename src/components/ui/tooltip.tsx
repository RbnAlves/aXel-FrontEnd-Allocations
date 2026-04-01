import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva } from "class-variance-authority";

type TooltipColor = "yellow" | "green" | "red" | "blue" | "gray" | "ghost";

const tooltipContentVariants = cva(
  "rounded-md text-xs px-2 py-1.5 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
  {
    variants: {
      color: {
        yellow: "bg-yellow-100 text-yellow-800",
        green: "bg-green-100 text-green-800",
        red: "bg-red-100 text-red-800",
        blue: "bg-blue-100 text-blue-800",
        gray: "bg-gray-700 text-white",
        ghost: "bg-gray-500 text-white",
      },
    },
    defaultVariants: {
      color: "gray",
    },
  }
);

const tooltipArrowVariants = cva("", {
  variants: {
    color: {
      yellow: "fill-yellow-100",
      green: "fill-green-100",
      red: "fill-red-100",
      blue: "fill-blue-100",
      gray: "fill-gray-700",
      ghost: "fill-gray-500",
    },
  },
  defaultVariants: {
    color: "gray",
  },
});

const tooltipTriggerVariants = cva(
  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
  {
    variants: {
      color: {
        yellow: "bg-yellow-100 text-yellow-800 hover:text-yellow-900",
        green: "bg-green-100 text-green-800 hover:text-green-900",
        red: "bg-red-100 text-red-800 hover:text-red-900",
        blue: "bg-blue-100 text-blue-800 hover:text-blue-900",
        gray: "bg-gray-100 text-gray-700 hover:text-gray-900",
        ghost: "bg-gray-100 text-gray-500",
      },
    },
    defaultVariants: {
      color: "gray",
    },
  }
);

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  color,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger> & {
  color?: TooltipColor;
}) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      className={tooltipTriggerVariants({ color })}
      {...props}
    >
      {children}
    </TooltipPrimitive.Trigger>
  );
}

function TooltipContent({
  color,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  color?: TooltipColor;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={tooltipContentVariants({ color })}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className={tooltipArrowVariants({ color })} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

function TooltipWrapper({
  tooltipTrigger,
  tooltipContent,
  color,
}: {
  tooltipTrigger: React.ReactNode;
  tooltipContent: string;
  color?: TooltipColor;
}) {
  return (
    <Tooltip>
      <TooltipTrigger color={color}>{tooltipTrigger}</TooltipTrigger>
      <TooltipContent color={color}>{tooltipContent}</TooltipContent>
    </Tooltip>
  );
}

export {
  TooltipWrapper,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
};
