import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "./utils";
const variants = cva("button", {
  variants: {
    variant: {
      default: "primary",
      outline: "button-outline",
      ghost: "ghost",
      danger: "danger",
    },
  },
  defaultVariants: { variant: "outline" },
});
export function Button({
  asChild,
  variant,
  className,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant }), className)} {...props} />;
}
