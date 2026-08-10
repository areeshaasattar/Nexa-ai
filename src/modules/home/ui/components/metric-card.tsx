"use client";

// Redesigned MetricCard – minimal SaaS style, tinted accent tile, proportional
// sparkline (no more tiny-seeds-then-absolute-total cliffs from the caller).
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface MetricCardProps {
  /** Title of the KPI, e.g. "Total Meetings" */
  title: string;
  /** Primary value to display – number or formatted string */
  value: string | number;
  /** Icon displayed in the accent tile */
  icon: LucideIcon;
  /** Optional brief description under the value */
  description?: string;
  /** Trend with percent change */
  trend?: {
    value: number; // percent value
    isPositive: boolean;
  };
  /** Small sparkline data (optional) */
  chartData?: number[];
  /** Accent colour for the chart and icon tile – defaults to brand emerald */
  chartColor?: string;
  /** Additional Tailwind classes */
  className?: string;
}

export const MetricCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  chartData = [],
  chartColor = "#10b981",
  className,
}: MetricCardProps) => {
  // ApexCharts options – sparkline, no toolbar, subtle fill
  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "area",
      sparkline: { enabled: true },
      toolbar: { show: false },
      animations: { enabled: true, speed: 400 },
    },
    colors: [chartColor],
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.28,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
    tooltip: { enabled: false },
    yaxis: { min: 0 },
    grid: { padding: { top: 8, bottom: 0, left: 0, right: 0 } },
  };

  const chartSeries = [{ name: title, data: chartData }];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className="group h-full"
    >
      <Card
        className={cn(
          "flex flex-col h-full rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md ring-0 transition-all duration-200",
          className
        )}
      >
        {/* Header – label & accented icon tile */}
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </h3>
          <div
            className="flex size-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${chartColor}1A`, color: chartColor }}
          >
            <Icon className="size-4" />
          </div>
        </div>

        {/* Body – value, trend, optional description */}
        <div className="flex-1 px-4 py-3 min-h-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold tracking-tight tabular-nums text-slate-900">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  trend.isPositive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                )}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p
              className="mt-1 text-xs text-slate-500 line-clamp-1"
              title={description}
            >
              {description}
            </p>
          )}
        </div>

        {/* Footer – optional sparkline */}
        {chartData.length > 0 && (
          <div className="px-4 pb-4">
            <Chart
              options={chartOptions}
              series={chartSeries}
              type="area"
              height={48}
              width="100%"
            />
          </div>
        )}
      </Card>
    </motion.div>
  );
};