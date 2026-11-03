// src/hooks/useDashboard.ts
import { trpc } from "@/trpc/client";
import { useMemo } from "react";

/**
 * Centralised dashboard data fetching.
 *
 * - helloQuery: user greeting/name
 * - dashboardQuery: all KPI metrics, upcoming meetings, recent activities, chart data
 * - healthQuery: system health checks
 *
 * All queries use TanStack Query defaults for real‑time updates:
 *   refetchInterval: 10 000 ms, staleTime: 5 000 ms for dashboard data
 *   refetchInterval: 30 000 ms for system health
 */
export const useDashboard = () => {
  const helloQuery = trpc.hello.useQuery(
    { text: "Nexa User" },
    { staleTime: 30_000 }
  );

  const dashboardQuery = trpc.getDashboardData.useQuery(undefined, {
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const healthQuery = trpc.getSystemHealth.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Memoise combined data for consumer components – avoids re‑render loops
  const data = useMemo(() => {
    if (!dashboardQuery.data) return null;
    const {
      metrics,
      upcomingMeetings,
      recentActivities,
      chartData,
      durationChart,
    } = dashboardQuery.data;
    return {
      metrics,
      upcomingMeetings,
      recentActivities,
      chartData,
      durationChart,
    };
  }, [dashboardQuery.data]);

  return {
    hello: helloQuery,
    dashboard: dashboardQuery,
    health: healthQuery,
    data,
  };
};
