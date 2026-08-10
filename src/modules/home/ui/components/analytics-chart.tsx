"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Maximize2, MoreHorizontal } from "lucide-react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AnalyticsChartProps {
  title: string;
  description?: string;
  type: "line" | "area" | "bar" | "donut" | "radialBar";
  series: any[];
  categories?: string[];
  colors?: string[];
  height?: number | string;
  className?: string;
  hideHeader?: boolean;
}

export const AnalyticsChart = ({
  title,
  description,
  type,
  series,
  categories,
  colors = ["#10b981", "#3b82f6", "#f59e0b"],
  height = 350,
  className,
  hideHeader = false,
}: AnalyticsChartProps) => {
  const options: ApexCharts.ApexOptions = {
    chart: {
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
      animations: { enabled: true, speed: 500 },
    },
    colors,
    stroke: {
      curve: "smooth",
      width: type === "line" || type === "area" ? 3 : 0,
    },
    fill: {
      type: type === "area" ? "gradient" : "solid",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#64748b", fontSize: "12px" },
      },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      tickAmount: 4,
      labels: {
        style: { colors: "#64748b", fontSize: "12px" },
      },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
      padding: { left: 0, right: 0, top: 0, bottom: 0 },
    },
    dataLabels: { enabled: false },
    tooltip: {
      theme: "light",
      x: { show: true },
      y: { formatter: (val) => `${val}` },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "13px",
      fontWeight: 500,
      labels: { colors: "#64748b" },
    },
    plotOptions: {
      bar: { borderRadius: 6, columnWidth: "35%" },
      // A donut is a pie variant in ApexCharts — size lives under pie.donut.
      pie: { donut: { size: "75%" } },
      radialBar: {
        hollow: { size: "65%" },
        dataLabels: {
          name: { show: true, fontSize: "14px", fontWeight: 600, color: "#64748b" },
          value: { show: true, fontSize: "24px", fontWeight: 700, color: "#0f172a" },
        },
      },
    },
  };

  const chartEl = (
    <Chart
      options={options}
      series={series}
      type={type}
      height={height}
      width="100%"
    />
  );

  if (hideHeader) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn("w-full", className)}
      >
        {chartEl}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("w-full", className)}
    >
      <Card className="border-slate-100 bg-white shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-semibold tracking-tight">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs font-medium">{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled
              className="size-8 cursor-not-allowed text-slate-300"
              aria-label="Download chart (coming soon)"
              title="Coming soon"
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled
              className="size-8 cursor-not-allowed text-slate-300"
              aria-label="Expand chart (coming soon)"
              title="Coming soon"
            >
              <Maximize2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled
              className="size-8 cursor-not-allowed text-slate-300"
              aria-label="More chart options (coming soon)"
              title="Coming soon"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-full w-full">
            {chartEl}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};