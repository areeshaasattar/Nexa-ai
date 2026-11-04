import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";
import { FeedbackAdmin } from "./feedback-admin";

function isAdmin(email: string | null | undefined): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}

export default async function AdminFeedbackPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session.user.email)) {
    notFound();
  }
  const caller = appRouter.createCaller(await createTRPCContext());
  const data = await caller.feedback.list();
  return <FeedbackAdmin initial={data} />;
}