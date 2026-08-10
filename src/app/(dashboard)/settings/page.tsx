import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SettingsView } from "@/modules/settings/ui/views/settings-view";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

const SettingsPage = async ({ searchParams }: PageProps) => {
  const [session, params] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    searchParams,
  ]);

  if (!session) {
    redirect("/sign-in");
  }

  return <SettingsView defaultTab={params.tab} />;
};

export default SettingsPage;