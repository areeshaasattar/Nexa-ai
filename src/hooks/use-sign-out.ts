"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export function useSignOut() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const res = await authClient.signOut();
      if (res?.error) {
        toast.error("Could not sign out. Please try again.");
        return;
      }
      window.location.assign("/");
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return { signOut, isSigningOut };
}