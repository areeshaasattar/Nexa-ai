import React from "react";
import { MeetingsView } from "@/modules/meetings/ui/views/meetings-view";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/constants";

interface PageProps {
  searchParams: Promise<{ page?: string; pageSize?: string; search?: string; status?: string; agentId?: string }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const queryClient = getQueryClient();
  const params = await searchParams;

  const page = Number(params.page ?? DEFAULT_PAGE);
  const pageSize = Number(params.pageSize ?? DEFAULT_PAGE_SIZE);
  const search = params.search ?? "";
  const status = params.status ?? "";
  const agentId = params.agentId ?? "";

  await queryClient.prefetchQuery(
    trpc.meetings.getMany.queryOptions({
      search,
      status,
      agentId,
      page,
      pageSize,
    })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MeetingsView />
    </HydrationBoundary>
  );
};

export default Page;