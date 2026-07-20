"use client";

import React from "react";
import { PlusIcon, VideoIcon, SparklesIcon, SearchIcon, FilterIcon, BotIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useMeetingsFilter } from "@/app/(dashboard)/meetings/hooks/use-meetings-filter";
import { trpc } from "@/trpc/client";
import { meetingStatus } from "@/db/schema";

interface MeetingsListHeaderProps {
  onOpenDialog: () => void;
}

const MeetingsListHeader = ({ onOpenDialog }: MeetingsListHeaderProps) => {
  const [{ search, status, agentId }, setFilter] = useMeetingsFilter();
  const agentsQuery = trpc.agents.getMany.useQuery({ pageSize: 100 });

  return (
    <div className="flex flex-col gap-8 pb-8 border-b border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#3B6D11] to-[#6a9a6a] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative size-14 rounded-2xl bg-white flex items-center justify-center border border-green-100 shadow-sm transition-transform group-hover:scale-105">
              <VideoIcon className="size-7 text-[#3B6D11]" />
              <div className="absolute -top-1 -right-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                Meetings
              </h1>
              <div className="px-2 py-0.5 rounded-md bg-green-50 border border-green-100 flex items-center gap-1">
                <SparklesIcon className="size-3 text-[#3B6D11]" />
                <span className="text-[10px] font-bold text-[#3B6D11] uppercase tracking-wider">
                  Active
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              Schedule and manage your AI-powered meeting sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">

          <Button
            onClick={onOpenDialog}
            className="rounded-xl h-11 px-6 bg-[#3B6D11] hover:bg-[#2f5a0d] text-white font-bold shadow-lg shadow-green-600/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <PlusIcon className="size-5" />
            <span>New Meeting</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search sessions by name..."
            value={search}
            onChange={(e) => setFilter({ search: e.target.value, page: 1 })}
            className="pl-10 h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all text-sm"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Select 
            value={status || "all"} 
            onValueChange={(val: string | null) => setFilter({ status: val === "all" || val === null ? "" : val, page: 1 })}
          >
            <SelectTrigger className="w-[160px] h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white text-xs font-semibold text-gray-600">
              <div className="flex items-center gap-2">
                <FilterIcon className="size-3.5 text-gray-400" />
                <SelectValue placeholder="All Statuses" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-100 shadow-xl bg-white">
              <SelectItem value="all" className="text-xs font-semibold rounded-lg cursor-pointer">All Statuses</SelectItem>
              {meetingStatus.map((s) => (
                <SelectItem key={s} value={s} className="text-xs font-semibold rounded-lg cursor-pointer capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={agentId || "all"} 
            onValueChange={(val: string | null) => setFilter({ agentId: val === "all" || val === null ? "" : val, page: 1 })}
          >
            <SelectTrigger className="w-[180px] h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white text-xs font-semibold text-gray-600">
              <div className="flex items-center gap-2">
                <BotIcon className="size-3.5 text-gray-400" />
                <SelectValue placeholder="All Agents" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-100 shadow-xl bg-white">
              <SelectItem value="all" className="text-xs font-semibold rounded-lg cursor-pointer">All Agents</SelectItem>
              {agentsQuery.data?.data.map((agent) => (
                <SelectItem key={agent.id} value={agent.id} className="text-xs font-semibold rounded-lg cursor-pointer">
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default MeetingsListHeader;
