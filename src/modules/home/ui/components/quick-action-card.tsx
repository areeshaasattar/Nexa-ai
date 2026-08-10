"use client";

import { motion } from "framer-motion";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  color: string;
}

export const QuickActionCard = ({
  title,
  description,
  icon: Icon,
  onClick,
  color,
}: QuickActionCardProps) => {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="group relative flex flex-col items-start rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md w-full"
    >
      <div className="mb-3 flex items-center justify-between w-full">
        <div className={cn("flex size-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105", color)}>
          <Icon className="size-5" />
        </div>
        <ArrowUpRight className="size-4 text-slate-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:text-emerald-600" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900 mb-0.5">{title}</h4>
      <p className="text-xs font-medium text-slate-500 leading-relaxed">
        {description}
      </p>
    </motion.button>
  );
};