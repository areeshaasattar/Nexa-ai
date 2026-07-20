"use client";

import { motion } from "framer-motion";
import { 
  Video, 
  Bot, 
  CheckCircle2, 
  MessageSquare, 
  FileText,
  Clock,
  Mic
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Activity {
  id: string;
  type: "meeting_created" | "meeting_completed" | "agent_created" | "recording_ready" | "transcription_done" | "voice_call";
  title: string;
  user: {
    name: string;
    image?: string;
  };
  time: string;
  description?: string;
}

const activityConfig = {
  meeting_created: { icon: Video, color: "text-blue-500", bg: "bg-blue-500/10" },
  meeting_completed: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  agent_created: { icon: Bot, color: "text-purple-500", bg: "bg-purple-500/10" },
  recording_ready: { icon: MessageSquare, color: "text-amber-500", bg: "bg-amber-500/10" },
  transcription_done: { icon: FileText, color: "text-rose-500", bg: "bg-rose-500/10" },
  voice_call: { icon: Mic, color: "text-cyan-500", bg: "bg-cyan-500/10" },
};

export const ActivityTimeline = ({ activities }: { activities: Activity[] }) => {
  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
      {activities.map((activity, index) => {
        const Config = activityConfig[activity.type] ?? { icon: Clock, color: "text-slate-500", bg: "bg-slate-500/10" };
        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
          >
            {/* Dot */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform group-hover:scale-110 duration-300">
               <Config.icon className={cn("size-4", Config.color)} />
            </div>

            {/* Content */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white/50 backdrop-blur-xl border border-slate-100/50 shadow-sm transition-all hover:shadow-md hover:bg-white duration-300">
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div className="flex items-center gap-2">
                   <Avatar className="size-6 border border-slate-100">
                      <AvatarImage src={activity.user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${activity.user.name}`} />
                      <AvatarFallback>{activity.user.name[0]}</AvatarFallback>
                   </Avatar>
                   <span className="font-bold text-slate-900 text-sm">{activity.title}</span>
                </div>
                <time className="font-medium text-xs text-slate-400 italic flex items-center gap-1">
                   <Clock className="size-3" />
                   {activity.time}
                </time>
              </div>
              <div className="text-slate-500 text-xs leading-relaxed font-medium">
                {activity.description || "System automatically updated the status of this event."}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
