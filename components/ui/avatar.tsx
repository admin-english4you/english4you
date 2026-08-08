import Image from "next/image";
import { cn } from "@/lib/utils";

/** Iniciais a partir do nome — lógica antes duplicada em AppHeader e ProfileEditor. */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

const SIZE_STYLES = {
  xs: { box: "w-7 h-7 text-[10px]", px: 28 },
  sm: { box: "w-9 h-9 text-xs", px: 36 },
  md: { box: "w-12 h-12 text-sm", px: 48 },
  lg: { box: "w-16 h-16 text-lg", px: 64 },
  xl: { box: "w-28 h-28 text-3xl", px: 112 },
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZE_STYLES;
  className?: string;
}

export function Avatar({ name, src, size = "sm", className }: AvatarProps) {
  const { box, px } = SIZE_STYLES[size];

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-indigo-100 font-bold text-indigo-700",
        "flex items-center justify-center select-none",
        box,
        className
      )}
    >
      {src ? (
        <Image src={src} alt={name} fill sizes={`${px}px`} className="object-cover" />
      ) : (
        <span aria-hidden>{getInitials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}
