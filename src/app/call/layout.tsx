import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

interface CallLayoutProps {
  children: React.ReactNode;
}

export default async function CallLayout({ children }: CallLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden">
      {children}
    </div>
  );
}
