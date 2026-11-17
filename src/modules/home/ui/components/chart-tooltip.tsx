/**
 * Shared custom tooltip component for all ApexCharts in the dashboard.
 * Used by: Meeting Status (donut), Overall Sentiment (if ApexCharts), and Meeting Activity (line).
 * 
 * Features:
 * - White background with thin gray border and soft shadow
 * - Color dot matching the series/segment color
 * - Label, value, and optional percentage
 * - Clean, professional appearance with proper contrast
 */

interface ChartTooltipProps {
  series: (string | number)[];
  seriesIndex: number;
  dataPointIndex?: number;
  w: {
    globals: {
      categoryLabels?: string[];
      seriesNames?: string[];
      colors?: string[];
    };
  };
}

export const ChartTooltip = (props: ChartTooltipProps) => {
  const { series, seriesIndex, dataPointIndex, w } = props;
  const value = series[seriesIndex];
  const label = w.globals.seriesNames?.[seriesIndex] || `Series ${seriesIndex}`;
  const color = w.globals.colors?.[seriesIndex] || "#000000";

  // For line charts, also show the category label
  const categoryLabel = dataPointIndex !== undefined ? w.globals.categoryLabels?.[dataPointIndex] : undefined;

  return (
    <div className="bg-white rounded-[10px] border border-gray-300 shadow-[0_4px_12px_rgba(16,24,40,0.1)] px-3 py-2 pointer-events-none z-50 whitespace-nowrap">
      {/* Category label (for line charts) */}
      {categoryLabel && (
        <div className="text-[11px] text-gray-500 mb-1.5">
          {categoryLabel}
        </div>
      )}
      
      {/* Series row: color dot + label + value */}
      <div className="flex items-center gap-2">
        {/* Color dot */}
        <div
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        
        {/* Label */}
        <span className="text-xs font-medium text-gray-600">
          {label}
        </span>
        
        {/* Value (pushed right) */}
        <span className="text-xs font-semibold text-gray-900 ml-auto">
          {value}
        </span>
      </div>
    </div>
  );
};

export default ChartTooltip;
