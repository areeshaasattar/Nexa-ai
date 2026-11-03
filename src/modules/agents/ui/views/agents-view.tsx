"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { ErrorState } from "@/components/error-state";
import { keepPreviousData } from "@tanstack/react-query";
import AgentsListHeader from "../components/agents-list-header";
import { NewAgentDialog } from "../components/new-agent-dialog";

import { DataTable } from "../components/data-table";
import { columns, Agent } from "../components/columns";

import { GeneratedAvatar } from "@/components/generated-avatar";

import { useAgentsFilter } from "@/app/(dashboard)/agents/hooks/use-agents-filter";

import { DataPagination } from "../components/data-pagination";

export const AgentsView = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [{ search, page, pageSize }, setFilter] = useAgentsFilter();

  const agentsQuery = trpc.agents.getMany.useQuery(
    {
      search,
      page,
      pageSize,
    },
    { placeholderData: keepPreviousData },
  );

  const tableData = (agentsQuery.data?.data ?? []) as unknown as Agent[];
  const total = agentsQuery.data?.total ?? 0;
  const totalPages = agentsQuery.data?.totalPages ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <AgentsListHeader onOpenDialog={() => setIsDialogOpen(true)} />

      <NewAgentDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Fleet Analytics
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Real-time status of your deployed operatives
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              {agentsQuery.isLoading ? "..." : total} Active
            </span>
          </div>
        </div>

        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity ${agentsQuery.isFetching ? "opacity-60" : "opacity-100"}`}>
          {agentsQuery.isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="size-8 rounded-full border-2 border-[#3B6D11]/20 border-t-[#3B6D11] animate-spin" />
              <p className="text-xs text-gray-500 font-medium tracking-tight">
                Synchronizing with Nexa network...
              </p>
            </div>
          ) : agentsQuery.isError ? (
            <div className="py-20">
              <ErrorState
                title="Communication Failure"
                description={agentsQuery.error.message}
                onRetry={() => agentsQuery.refetch()}
              />
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={tableData}
                onNewAgent={() => setIsDialogOpen(true)}
                searchValue={search}
                onSearchChange={(value) => setFilter({ search: value, page: 1 })}
              />
              <div className="border-t border-gray-50 px-4">
                <DataPagination total={total} totalPages={totalPages} />
              </div>
            </>
          )}
        </div>
      </section>

      {!agentsQuery.isLoading && !agentsQuery.isError && tableData.length > 0 && (
        <section>
          <div className="flex flex-col mb-6 px-1">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Operative Briefings</h2>
            <p className="text-xs text-gray-500 font-medium">Detailed view of agent mission protocols</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tableData.map((agent) => (
              <div
                key={agent.id}
                className="group relative border border-gray-100 p-6 rounded-2xl bg-white shadow-sm hover:shadow-xl hover:border-green-100 transition-all duration-300 cursor-default flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <GeneratedAvatar seed={agent.name} style="bottts" size="lg" className="relative bg-white border-2 border-white ring-1 ring-gray-100" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                      {agent.id.slice(0, 10)}
                    </span>
                    <span className="text-[9px] font-bold text-green-600 mt-2 uppercase tracking-widest">
                      Live
                    </span>
                  </div>
                </div>

                <div className="flex-grow">
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-green-700 transition-colors mb-2">
                    {agent.name}
                  </h3>
                  <div className="relative">
                    <span className="absolute -left-3 top-0 text-2xl text-green-100 font-serif leading-none italic">&quot;</span>
                    <p className="text-sm text-gray-600 leading-relaxed italic line-clamp-4 pl-1">
                      {agent.instruction}
                    </p>
                    <span className="absolute -right-1 bottom-0 text-2xl text-green-100 font-serif leading-none italic">&quot;</span>
                  </div>
                </div>

                <div className="mt-8 pt-5 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Deployment</span>
                    <span className="text-[11px] font-medium text-gray-600">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50/50 rounded-lg group-hover:bg-green-50 transition-colors">
                    <div className="size-1.5 rounded-full bg-green-500"></div>
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                      Operational
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AgentsView;
