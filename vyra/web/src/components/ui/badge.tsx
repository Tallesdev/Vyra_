import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&>svg]:size-3 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",

        // Tonais — fundo suave, texto saturado. Legíveis nos dois temas.
        success:
          "border-success/25 bg-success/12 text-success dark:bg-success/15",
        warning:
          "border-warning/30 bg-warning/15 text-warning dark:bg-warning/15",
        destructive:
          "border-destructive/25 bg-destructive/12 text-destructive dark:bg-destructive/15",
        info: "border-info/25 bg-info/12 text-info dark:bg-info/15",
        brand:
          "border-primary/25 bg-primary/12 text-primary dark:bg-primary/15",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
