"use client";

import { motion } from "framer-motion";
import {
  Video,
  Bot,
  CheckCircle2,
  MessageSquare,
  FileText,
  Clock,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Activity {
  id: string;
  type:
    | "meeting_created"
    | "meeting_completed"
    | "agent_created"
    | "recording_ready"
    | "transcription_done"
    | "voice_call";
  title: string;
  user: {
    name: string;
    image?: string;
  };
  time: string;
  description?: string;
}

// Semantic hue per activity type (emerald = positive ops signal).
const activityConfig = {
  meeting_created: { icon: Video, color: "#3b82f6" },
  meeting_completed: { icon: CheckCircle2, color: "#10b981" },
  agent_created: { icon: Bot, color: "#8b5cf6" },
  recording_ready: { icon: MessageSquare, color: "#f59e0b" },
  transcription_done: { icon: FileText, color: "#0ea5e9" },
  voice_call: { icon: Mic, color: "#06b6d4" },
};

export const ActivityTimeline = ({ activities }: { activities: Activity[] }) => {
  return (
    <div className="relative space-y-3 pl-1">
      {activities.map((activity, index) => {
        const Config =
          activityConfig[activity.type] ??
          { icon: Clock, color: "#64748b" };
        const isLast = index === activities.length - 1;

        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="relative flex gap-3"
          >
            {/* Rail + dot column */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 group-hover:scale-110",
                  "border-white bg-slate-50 shadow-sm",
                )}
                style={{
                  background: `${Config.color}14`,
                  color: Config.color,
                }}
              >
                <Config.icon className="size-4" />
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-gradient-to-b from-slate-200 to-transparent" />
              )}
            </div>

            {/* Content card */}
            <div className="group mb-1 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="size-6 shrink-0 border border-slate-100">
                    <AvatarImage
                      src={
                        activity.user.image ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${activity.user.name}`
                      }
                    />
                    <AvatarFallback>{activity.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {activity.title}
                  </span>
                </div>
                <time className="flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-slate-400">
                  <Clock className="size-3" />
                  {activity.time}
                </time>
              </div>
              <p className="text-xs leading-relaxed font-medium text-slate-500">
                {activity.description ||
                  "System automatically updated the status of this event."}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};