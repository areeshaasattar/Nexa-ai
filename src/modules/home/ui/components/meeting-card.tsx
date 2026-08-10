"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  MoreVertical,
  Bot,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MeetingCardProps {
  title: string;
  agentName: string;
  time: string;
  date: string;
  participants: number;
  status: "scheduled" | "ongoing" | "completed";
  /** Meeting id — enables navigation links to the detail / call pages */
  id?: string;
  /** Override the detail link (defaults to `/meetings/{id}`) */
  href?: string;
  className?: string;
}

export const MeetingCard = ({
  title,
  agentName,
  time,
  date,
  participants,
  status,
  id,
  href,
  className,
}: MeetingCardProps) => {
  const statusColors = {
    scheduled: "bg-blue-50 text-blue-600 border-blue-200",
    ongoing: "bg-emerald-50 text-emerald-600 border-emerald-200",
    completed: "bg-slate-50 text-slate-500 border-slate-200",
  };

  // Both links are only rendered when we know the meeting id, so the card stays
  // purely presentational wherever it's used without one.
  const detailsHref = href ?? (id ? `/meetings/${id}` : undefined);
  const callHref = id ? `/call/${id}` : undefined;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card className="h-full rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 ring-0">
        <CardContent className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 line-clamp-1">
                  {detailsHref ? (
                    <Link
                      href={detailsHref}
                      className="transition-colors hover:text-emerald-700"
                    >
                      {title}
                    </Link>
                  ) : (
                    title
                  )}
                </h4>
                <Badge variant="outline" className={statusColors[status]}>
                  {status === "ongoing" && <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />}
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <CalendarIcon className="size-3" />
                {date} at {time}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 -mr-2"
                    aria-label="Meeting actions"
                  >
                    <MoreVertical className="size-4 text-slate-400" />
                  </Button>
                }
              />
              <DropdownMenuContent
                align="end"
                className="rounded-xl border-slate-200 shadow-lg p-1 min-w-[160px]"
              >
                {detailsHref && (
                  <DropdownMenuItem
                    render={
                      <Link href={detailsHref} className="text-xs font-bold text-gray-600 hover:text-gray-900 rounded-lg">
                        View details
                      </Link>
                    }
                    className="text-xs font-bold text-gray-600 rounded-lg cursor-pointer"
                  />
                )}
                {callHref && (
                  <DropdownMenuItem
                    render={
                      <Link href={callHref} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 rounded-lg">
                        Open live call
                      </Link>
                    }
                    className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 focus:bg-emerald-50 focus:text-emerald-700 rounded-lg cursor-pointer"
                  />
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-1 items-center justify-between py-4 border-y border-slate-100">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Bot className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">AI Agent</p>
                <p className="text-xs font-black text-slate-900">{agentName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <Avatar key={i} className="size-7 border-2 border-white">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 20}`} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  ))}
               </div>
               <span className="text-[10px] font-bold text-slate-500">+{participants - 3}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detailsHref ? (
              <Button
                asChild
                className="flex-1 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 h-10"
              >
                <Link
                  href={
                    status === "ongoing" && callHref
                      ? callHref
                      : detailsHref
                  }
                >
                  {status === "ongoing" ? "Join Now" : "Details"}
                </Link>
              </Button>
            ) : (
              <Button className="flex-1 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 h-10">
                {status === "ongoing" ? "Join Now" : "Details"}
              </Button>
            )}
            {detailsHref ? (
              <Button
                asChild
                variant="outline"
                size="icon"
                className="rounded-xl border-slate-200 size-10"
                aria-label="View meeting details"
              >
                <Link href={detailsHref}>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl border-slate-200 size-10"
                aria-label="View meeting details"
              >
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};