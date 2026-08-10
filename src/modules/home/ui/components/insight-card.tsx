"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface InsightCardProps {
  type: "recommendation" | "warning" | "opportunity" | "tip";
  message: string;
  className?: string;
}

// Semantic hue per insight type — emerald stays brand, others are semantic-only.
const config = {
  recommendation: { icon: Sparkles, color: "#3b82f6" },
  warning: { icon: AlertTriangle, color: "#f59e0b" },
  opportunity: { icon: TrendingUp, color: "#10b981" },
  tip: { icon: Lightbulb, color: "#8b5cf6" },
};

export const InsightCard = ({ type, message, className }: InsightCardProps) => {
  const { icon: Icon, color } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("h-full", className)}
    >
      <Card className="h-full rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 ring-0">
        <CardContent className="p-4 flex gap-3.5 h-full">
          <div
            className="shrink-0 size-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}1A`, color }}
          >
            <Icon className="size-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {type}
            </p>
            <p className="text-sm font-medium text-slate-700 leading-snug">
              {message}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};