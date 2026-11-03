import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ResetPasswordView from "@/modules/auth/ui/views/reset-password-view";

const Page = () => {
  return (
    <div>
      <Suspense
        fallback={
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4">
            <Loader2 className="size-8 animate-spin text-gray-400" />
          </div>
        }
      >
        <ResetPasswordView />
      </Suspense>
    </div>
  );
};

export default Page;
