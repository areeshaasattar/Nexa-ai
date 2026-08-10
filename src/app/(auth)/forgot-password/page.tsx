import React from "react";
import ForgotPasswordView from "@/modules/auth/ui/views/forgot-password-view";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const Page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!!session) {
    return redirect("/");
  }

  return (
    <div>
      <ForgotPasswordView />
    </div>
  );
};

export default Page;
