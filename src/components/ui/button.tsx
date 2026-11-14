import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:transform-none [&_svg]:transition-transform [&_svg]:duration-150 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:-translate-y-px hover:bg-primary/90 hover:shadow-[var(--shadow-hover)] active:translate-y-0 active:shadow-none",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-px hover:bg-destructive/90 active:translate-y-0",
        outline:
          "border border-input bg-background shadow-sm hover:border-primary/60 hover:bg-primary/10 hover:text-primary active:bg-primary/15",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/70 hover:text-primary active:translate-y-px",
        ghost: "hover:bg-primary/10 hover:text-primary active:bg-primary/15 [&:hover_svg]:scale-110",
        link: "text-primary underline decoration-transparent decoration-1 underline-offset-4 hover:decoration-current [&:hover_svg]:translate-x-0.5",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        "icon-sm": "size-8 p-0",
        "icon-xs": "size-6 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
