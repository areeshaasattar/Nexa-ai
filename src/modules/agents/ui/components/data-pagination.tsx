"use client";

import { useAgentsFilter } from "@/app/(dashboard)/agents/hooks/use-agents-filter";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataPaginationProps {
  total: number;
  totalPages: number;
  noun?: string;
}

export const DataPagination = ({ total, totalPages, noun = "agent" }: DataPaginationProps) => {
  const [{ page }, setFilter] = useAgentsFilter();

  return (
    <div className="flex items-center justify-between py-4 select-none">
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
        Page <span className="text-[#3B6D11]">{page}</span> of{" "}
        <span className="text-gray-900">{totalPages || 1}</span>
        <span className="ml-2 text-gray-400 normal-case font-medium">({total} total {noun}{total === 1 ? "" : "s"})</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setFilter({ page: page - 1 })}
          disabled={page <= 1}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d4e0d4] bg-white text-[11px] font-bold text-gray-600 transition-all hover:bg-[#f0f4f0] hover:text-[#3B6D11] hover:border-[#3B6D11]/30 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Previous
        </button>

        <button
          onClick={() => setFilter({ page: page + 1 })}
          disabled={page >= totalPages}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d4e0d4] bg-white text-[11px] font-bold text-gray-600 transition-all hover:bg-[#f0f4f0] hover:text-[#3B6D11] hover:border-[#3B6D11]/30 disabled:pointer-events-none disabled:opacity-30"
        >
          Next
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
