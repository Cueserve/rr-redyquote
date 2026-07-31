import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Toast as ToastPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// The design system's Toast (§7.14): tint/ink/border triad matching the
// status tokens, shadow-md, 120-160ms ease-out fade (no bounce/spring --
// DESIGN-SYSTEM.md §9 motion rule).
const ToastProvider = ToastPrimitive.Provider;
const ToastViewport = ToastPrimitive.Viewport;
const ToastAction = ToastPrimitive.Action;
const ToastTitle = ToastPrimitive.Title;
const ToastDescription = ToastPrimitive.Description;

const toastVariants = cva(
  "pointer-events-auto flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-semibold shadow-md transition-all data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150",
  {
    variants: {
      tone: {
        default: "border-border bg-card text-foreground",
        success: "border-success-border bg-success-muted text-success",
        warning: "border-warning-border bg-warning-muted text-warning",
        destructive:
          "border-destructive-border bg-destructive-muted text-destructive",
        info: "border-info-border bg-info-muted text-info",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

function Toast({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root> &
  VariantProps<typeof toastVariants>) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-tone={tone}
      className={cn(toastVariants({ tone, className }))}
      {...props}
    />
  );
}

function ToastClose({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      className={cn(
        "shrink-0 text-current opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      <X className="size-4" />
    </ToastPrimitive.Close>
  );
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription,
};
