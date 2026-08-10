"use client";

import React from "react";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GeneratedAvatar } from "@/components/generated-avatar";
import {
  LogOutIcon,
  SettingsIcon,
  UserIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface DashboardUserButtonProps {
  variant?: "header" | "sidebar";
}

const DashboardUserButton = ({
  variant = "header",
}: DashboardUserButtonProps) => {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-1",
          variant === "sidebar" &&
            "w-full p-3 bg-white/5 rounded-2xl border border-white/10",
        )}
      >
        <div
          className={cn(
            "size-9 rounded-full animate-pulse",
            variant === "header" ? "bg-green-100/50" : "bg-white/10",
          )}
        />
        <div className="flex flex-col gap-1">
          <div
            className={cn(
              "h-3 w-20 rounded animate-pulse",
              variant === "header" ? "bg-green-100/50" : "bg-white/10",
            )}
          />
          <div
            className={cn(
              "h-2 w-24 rounded animate-pulse",
              variant === "header" ? "bg-green-50/50" : "bg-white/5",
            )}
          />
        </div>
      </div>
    );
  }

  if (!data?.user) return null;

  const handleLogout = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/sign-in");
            toast.success("Signed out successfully");
          },
        },
      });
    } catch (error) {
      toast.error("Logout failed", {
        description: "Please try again later.",
      });
    }
  };

  const isHeader = variant === "header";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className={cn(
              "flex items-center gap-3 transition-all outline-none cursor-pointer group",
              isHeader
                ? "p-1.5 rounded-xl hover:bg-green-50/50 border border-transparent hover:border-green-100"
                : "w-full p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20",
            )}
          >
            <GeneratedAvatar
              seed={data.user.email || data.user.id}
              src={data.user.image}
              size="default"
              style="bottts"
              className={cn(
                "ring-2 ring-transparent transition-all shadow-sm",
                isHeader
                  ? "group-hover:ring-green-500/20 group-data-[state=open]:ring-green-500/30"
                  : "group-hover:ring-white/20 group-data-[state=open]:ring-white/30",
              )}
            />
            <div className="flex flex-col items-start text-sm overflow-hidden">
              <span
                className={cn(
                  "font-semibold leading-tight transition-colors truncate w-full text-left",
                  isHeader
                    ? "text-gray-900 group-hover:text-green-900"
                    : "text-white group-hover:text-green-100",
                )}
              >
                {data.user.name}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wider",
                  isHeader ? "text-green-600/70" : "text-green-400",
                )}
              >
                { "Pro User"}
              </span>
            </div>
            <div className="ml-auto">
              {isHeader ? (
                <ChevronDownIcon className="size-4 text-gray-400 group-hover:text-green-600 transition-colors" />
              ) : (
                <ChevronUpIcon className="size-4 text-white/40 group-hover:text-white transition-colors" />
              )}
            </div>
          </button>
        }
      />

      <DropdownMenuContent
        align={isHeader ? "end" : "start"}
        side={isHeader ? "bottom" : "right"}
        sideOffset={12}
        alignOffset={-10}
        className="w-64 ml-3.5 p-2 rounded-2xl shadow-xl border border-gray-100 shadow-green-900/5 bg-white"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-3">
            <div className="flex items-center gap-3">
              <GeneratedAvatar
                seed={data.user.email || data.user.id}
                src={data.user.image}
                size="lg"
                style="bottts"
              />
              <div className="flex flex-col">
                <p className="text-sm font-bold text-gray-900 leading-none">
                  {data.user.name}
                </p>
                <p className="text-xs text-gray-500 mt-1 truncate max-w-[160px]">
                  {data.user.email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gray-100" />

        <DropdownMenuGroup className="py-1">
          <DropdownMenuItem
            onClick={() => router.push("/settings?tab=profile")}
            className="p-2.5 rounded-xl cursor-pointer focus:bg-green-50 focus:text-green-900 transition-colors group"
          >
            <UserIcon className="mr-3 h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium">My Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/settings?tab=billing")}
            className="p-2.5 rounded-xl cursor-pointer focus:bg-green-50 focus:text-green-900 transition-colors group"
          >
            <CreditCardIcon className="mr-3 h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Billing & Plan</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/settings?tab=security")}
            className="p-2.5 rounded-xl cursor-pointer focus:bg-green-50 focus:text-green-900 transition-colors group"
          >
            <ShieldCheckIcon className="mr-3 h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Security</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/settings")}
            className="p-2.5 rounded-xl cursor-pointer focus:bg-green-50 focus:text-green-900 transition-colors group"
          >
            <SettingsIcon className="mr-3 h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Account Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gray-100" />

        <DropdownMenuItem
          className="p-2.5 mt-1 rounded-xl text-red-600 cursor-pointer focus:text-red-700 focus:bg-red-50 transition-colors font-semibold group"
          onClick={handleLogout}
        >
          <LogOutIcon className="mr-3 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DashboardUserButton;