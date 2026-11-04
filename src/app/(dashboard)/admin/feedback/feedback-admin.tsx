"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

type Row = {
  id: string;
  type: string;
  message: string;
  rating: number | null;
  pageUrl: string | null;
  status: string;
  createdAt: Date;
  userName: string | null;
  userEmail: string | null;
};

export function FeedbackAdmin({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const updateMutation = trpc.feedback.updateStatus.useMutation({
    onSuccess: (_d, vars) => {
      setRows((prev) =>
        prev.map((r) => (r.id === vars.id ? { ...r, status: vars.status } : r)),
      );
      toast.success("Status updated");
    },
    onError: (e) => toast.error(e.message || "Failed to update status"),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Feedback</h1>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString("en-US")}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.userName ?? "Unknown"}</div>
                  <div className="text-xs text-gray-400">{r.userEmail}</div>
                </td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3 max-w-md">
                  <div className="whitespace-pre-wrap break-words">{r.message}</div>
                  {r.pageUrl && (
                    <div className="text-xs text-gray-400 mt-1">{r.pageUrl}</div>
                  )}
                </td>
                <td className="px-4 py-3">{r.rating ?? "-"}</td>
                <td className="px-4 py-3">
                  <select
                    value={r.status}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: r.id,
                        status: e.target.value as "new" | "reviewed" | "resolved",
                      })
                    }
                    className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                  >
                    <option value="new">new</option>
                    <option value="reviewed">reviewed</option>
                    <option value="resolved">resolved</option>
                  </select>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No feedback yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}