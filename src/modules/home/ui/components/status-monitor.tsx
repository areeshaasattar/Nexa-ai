"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Activity, Globe, Zap, Database, Server } from "lucide-react";

interface StatusItem {
  name: string;
  status: "online" | "degraded" | "offline";
  latency?: string;
}

const statusMap = {
  online: { color: "bg-emerald-500", text: "text-emerald-600", label: "Operational" },
  degraded: { color: "bg-amber-500", text: "text-amber-600", label: "Degraded" },
  offline: { color: "bg-rose-500", text: "text-rose-600", label: "Outage" },
};

function statusIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("api")) return <Zap className="size-4" />;
  if (n.includes("database") || n.includes("db")) return <Database className="size-4" />;
  if (n.includes("video") || n.includes("stream")) return <Globe className="size-4" />;
  return <Server className="size-4" />;
}

export const StatusMonitor = ({ items }: { items: StatusItem[] }) => {
  return (
    <Card className="h-full flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm ring-0 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
            <Activity className="size-4 text-emerald-500" />
            System Status
          </CardTitle>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
              All Systems Go
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 px-4 pb-4">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400">No services reported yet.</p>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.06, duration: 0.3 }}
              className="flex flex-1 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                {statusIcon(item.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {item.name}
                </p>
                <p className="text-[10px] font-medium tabular-nums text-slate-400">
                  {item.latency || "45ms"}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-tight",
                    statusMap[item.status].text,
                  )}
                >
                  {statusMap[item.status].label}
                </span>
                <div
                  className={cn("size-1.5 rounded-full", statusMap[item.status].color)}
                />
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
};