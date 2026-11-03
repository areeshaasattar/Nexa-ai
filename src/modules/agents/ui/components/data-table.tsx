"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onNewAgent?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

function EmptyState({ onNewAgent }: { onNewAgent?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 select-none">
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-36 h-36 rounded-full border border-dashed border-[#c8dcc8] opacity-50 animate-[spin_18s_linear_infinite]" />
        <div className="absolute w-24 h-24 rounded-full border border-[#b8d0b8] opacity-60 animate-[spin_12s_linear_infinite_reverse]" />
        <div className="absolute w-14 h-14 rounded-full bg-[#e8f0e8] border border-[#a8c8a8]" />
        <div className="relative z-10 w-14 h-14 rounded-full bg-[#e8f0e8] border border-[#a8c8a8] flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3B6D11"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z" />
            <path d="M2 20c0-4 4-7 10-7s10 3 10 7" />
            <path d="M19 8h2M3 8h2M12 17v4M10 21h4" />
          </svg>
        </div>

        <div className="absolute w-1.5 h-1.5 rounded-full bg-[#3B6D11]/30 top-1 right-6" />
        <div className="absolute w-1 h-1 rounded-full bg-[#3B6D11]/20 bottom-2 left-4" />
        <div className="absolute w-1 h-1 rounded-full bg-[#6a9a6a]/40 top-4 left-8" />
      </div>

      <p className="text-sm font-semibold text-[#1a2e1a] mb-1 tracking-tight">
        No agents deployed
      </p>
      <p className="text-xs text-gray-400 text-center max-w-[220px] leading-relaxed mb-6">
        Deploy your first agent to start automating tasks and managing meetings.
      </p>

      {onNewAgent && (
        <button
          onClick={onNewAgent}
          className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-[#3B6D11] hover:bg-[#2f5a0d] text-white text-xs font-medium transition-colors duration-150"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Deploy agent
        </button>
      )}
    </div>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onNewAgent,
  searchValue,
  onSearchChange,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const [inputValue, setInputValue] = useState(searchValue ?? "");
  const debouncedValue = useDebouncedValue(inputValue, 350);

  useEffect(() => {
    setInputValue(searchValue ?? "");
  }, [searchValue]);

  useEffect(() => {
    const trimmed = debouncedValue.trim();
    const current = (searchValue ?? "").trim();
    if (trimmed !== current) {
      onSearchChange?.(trimmed);
    }
  }, [debouncedValue, searchValue, onSearchChange]);

  const hasRows = table.getRowModel().rows?.length > 0;

  return (
    <div className="w-full">
      <div className="px-4 py-4 flex items-center justify-between border-b border-gray-50">
        <div className="relative w-full max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents by name or instructions..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#3B6D11]/20 focus:border-[#3B6D11]/30 transition-all"
          />
        </div>
      </div>

      {hasRows && (
        <div className="grid w-full px-4 pb-2 border-b border-gray-100 mt-2">
          {table.getHeaderGroups().map((headerGroup) => (
            <div
              key={headerGroup.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2.5fr 1fr 1.2fr 0.8fr 1fr",
              }}
            >
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  className="py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {hasRows ? (
        <div className="divide-y divide-transparent">
          {table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="group px-4 rounded-xl hover:bg-[#f4f8f4] transition-colors duration-150 cursor-pointer"
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2.5fr 1fr 1.2fr 0.8fr 1fr",
                alignItems: "center",
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <div key={cell.id} className="py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState onNewAgent={onNewAgent} />
      )}
    </div>
  );
}

