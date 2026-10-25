"use client";

import React, { useEffect, useState } from "react";
import { History, ExternalLink, ArrowRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { RunResult } from "@/lib/types";
import { fetchRunsList } from "@/lib/api";

interface HistoryViewProps {
  onSelectRun: (runId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onSelectRun }) => {
  const [runs, setRuns] = useState<RunResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    setLoading(true);
    const data = await fetchRunsList();
    setRuns(data);
    setLoading(false);
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center space-x-2">
            <History className="h-5 w-5 text-blue-400" />
            <span>Analysis Run History</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Past agent runs persisted in local SQLite database
          </p>
        </div>

        <button
          onClick={loadRuns}
          className="text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-700 transition"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-500">Loading run records...</div>
      ) : runs.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-500">
          No runs recorded in database yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] text-zinc-400 uppercase tracking-wider bg-zinc-950/60">
                <th className="py-2.5 px-3">Run ID</th>
                <th className="py-2.5 px-3">Competitor URL</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Verdict</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {runs.map((r) => {
                const dateStr = r.created_at ? r.created_at.slice(0, 16).replace("T", " ") : "";
                return (
                  <tr key={r.run_id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-3 font-bold text-zinc-200">{r.run_id}</td>
                    <td className="py-3 px-3 text-zinc-300 max-w-xs truncate" title={r.competitor_url}>
                      {r.competitor_url}
                    </td>
                    <td className="py-3 px-3 text-zinc-400">{r.demo_target}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          r.status === "succeeded"
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                            : r.status === "failed"
                            ? "bg-rose-950/80 text-rose-400 border border-rose-800"
                            : "bg-blue-950/80 text-blue-400 border border-blue-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-zinc-300">
                      {r.final_verdict}
                    </td>
                    <td className="py-3 px-3 text-zinc-500 text-[11px]">{dateStr}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectRun(r.run_id)}
                        className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-950/50 hover:bg-blue-900/50 border border-blue-800/60 px-2.5 py-1 rounded transition"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
