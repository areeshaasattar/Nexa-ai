"use client";

import { ColumnDef } from "@tanstack/react-table";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { Button } from "@/components/ui/button";
import { VideoIcon } from "lucide-react";

import Link from "next/link";

export type Agent = {
  id: string;
  name: string;
  instruction: string;
  createdAt: Date;
  meetingCount: number;
};

export const columns: ColumnDef<Agent>[] = [
  {
    accessorKey: "name",
    header: "Agent",
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      const id = row.original.id;
      return (
        <Link href={`/agents/${id}`} className="flex items-center gap-3 group/link">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-[#e2ede2] border border-[#c4d8c4] flex items-center justify-center overflow-hidden group-hover/link:border-[#3B6D11] transition-colors">
            <GeneratedAvatar seed={name} style="bottts" size="sm" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 leading-none group-hover/link:text-[#3B6D11] transition-colors">
              {name}
            </span>
            <span className="text-[10px] font-mono text-gray-400 mt-1 tracking-tight">
              {id.slice(0, 8)}
            </span>
          </div>
        </Link>
      );
    },
  },
  {
    accessorKey: "instruction",
    header: "Instructions",
    cell: ({ row }) => {
      return (
        <span className="text-sm text-gray-400 line-clamp-1 max-w-[280px]">
          {row.getValue("instruction")}
        </span>
      );
    },
  },
  {
    accessorKey: "meetingCount",
    header: "Meetings",
    cell: ({ row }) => {
      const count = row.getValue("meetingCount") as number;
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-700">{count}</span>
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
            Sessions
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return (
        <div className="flex flex-col">
          <span className="text-sm text-gray-600">
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5">
            {date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const count = row.original.meetingCount;
      const inUse = count > 0;
      return (
        <div className="flex items-center gap-2">
          <div
            className={`size-1.5 rounded-full ${
              inUse ? "bg-[#3B6D11]" : "bg-gray-300"
            }`}
          />
          <span
            className={`text-xs font-medium ${
              inUse ? "text-[#3B6D11]" : "text-gray-400"
            }`}
          >
            {inUse ? "In use" : "Unused"}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const agentId = row.original.id;
      return (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            asChild
            className="h-8 px-3 text-xs font-medium rounded-lg border-[#a8c8a8] text-[#3B6D11] hover:bg-[#e2ede2] hover:border-[#3B6D11] transition-colors gap-1.5"
          >
            <Link href={`/meetings?agentId=${agentId}`}>
              <VideoIcon className="size-3" />
              Meet
            </Link>
          </Button>
        </div>
      );
    },
  },
];
