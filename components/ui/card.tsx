import React from "react";
import { cn } from "@/lib/utils";

/**
 * Codifica o idioma de card já usado por toda a plataforma
 * ("bg-white rounded-xl border border-slate-200 shadow-sm"), que hoje vive
 * duplicado como string literal em dezenas de telas.
 */

interface CardProps extends React.ComponentProps<"div"> {
  /** `flat` remove a sombra — útil para cards aninhados dentro de outro card. */
  variant?: "default" | "flat";
  /** `false` remove o padding interno, para quem controla o espaçamento por seção. */
  padded?: boolean;
}

export function Card({ className, variant = "default", padded = true, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-white rounded-xl border border-slate-200",
        variant === "default" && "shadow-sm",
        padded && "p-6",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-start justify-between gap-4 mb-4", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("text-base font-semibold text-slate-900 tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-slate-500 mt-0.5", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("text-sm text-slate-600", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 mt-5 pt-4 border-t border-slate-100", className)}
      {...props}
    />
  );
}
