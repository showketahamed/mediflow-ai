import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/app/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
  style?: CSSProperties;
}

export function GlassCard({ children, className, glowColor, onClick, style }: GlassCardProps) {
  const shared = {
    "data-surface": "glass",
    className: cn(
      "rounded-3xl border border-white/8 bg-[rgba(10,20,45,0.78)] text-left backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-300 hover:border-white/14",
      onClick && "w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
      className,
    ),
    style: {
      boxShadow: glowColor
        ? `0 0 0 1px rgba(255,255,255,0.03) inset, 0 6px 48px ${glowColor}`
        : "0 0 0 1px rgba(255,255,255,0.02) inset",
      ...style,
    },
  };
  if (onClick) {
    return <motion.button type="button" {...shared} onClick={onClick} whileHover={{ y: -2 }} whileTap={{ scale: 0.995 }}>{children}</motion.button>;
  }
  return <div {...shared}>{children}</div>;
}
