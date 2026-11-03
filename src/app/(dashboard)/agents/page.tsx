import React from "react";
import AgentsView from "@/modules/agents/ui/views/agents-view";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/constants";

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const queryClient = getQueryClient();
  const params = await searchParams;

  const search = params.search ?? "";
  const page = Number(params.page ?? DEFAULT_PAGE);
  const pageSize = Number(params.pageSize ?? DEFAULT_PAGE_SIZE);

  await queryClient.prefetchQuery(
    trpc.agents.getMany.queryOptions({
      search,
      page,
      pageSize,
    })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AgentsView />
    </HydrationBoundary>
  );
};

export default Page;