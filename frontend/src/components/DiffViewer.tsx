"use client";

import React, { useState } from "react";
import { Download, FileCode, Check, Copy } from "lucide-react";
import { EngineerOutput } from "@/lib/types";
import { getPatchDownloadUrl } from "@/lib/api";

interface DiffViewerProps {
  runId: string;
  engineer: EngineerOutput | undefined;
  patchContent: string | undefined;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ runId, engineer, patchContent }) => {
  const [copied, setCopied] = useState(false);

  const diffText = patchContent || engineer?.patch || "";

  if (!diffText && !engineer) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
        <FileCode className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
        <p className="text-sm">No code patch generated yet.</p>
        <p className="text-xs text-zinc-600 mt-1">Awaiting Engineer agent patch generation.</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = diffText.split("\n");

  return (
    <div className="space-y-4">
      {/* Header with proposed files and download */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-900 px-2 py-0.5 rounded">
              Feature Patch
            </span>
            <span className="text-xs text-zinc-400">Target Files:</span>
            {engineer?.files_proposed?.map((f, i) => (
              <span
                key={i}
                className="text-xs font-mono text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700"
              >
                {f}
              </span>
            ))}
          </div>
          <p className="text-xs text-zinc-400 mt-1">{engineer?.rationale}</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-700 transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy Diff"}</span>
          </button>

          <a
            href={getPatchDownloadUrl(runId)}
            download={`${runId}.patch`}
            className="flex items-center space-x-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download .patch</span>
          </a>
        </div>
      </div>

      {/* Unified Diff Box */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs">
        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>Unified Diff Preview</span>
          <span>{lines.length} lines</span>
        </div>

        <div className="overflow-x-auto p-3 max-h-[500px] overflow-y-auto leading-relaxed">
          {lines.map((line, idx) => {
            let lineClass = "text-zinc-400";
            let bgClass = "";

            if (line.startsWith("+") && !line.startsWith("+++")) {
              lineClass = "text-emerald-400";
              bgClass = "bg-emerald-950/25";
            } else if (line.startsWith("-") && !line.startsWith("---")) {
              lineClass = "text-rose-400";
              bgClass = "bg-rose-950/25";
            } else if (line.startsWith("@@")) {
              lineClass = "text-cyan-400 font-bold";
              bgClass = "bg-cyan-950/20";
            } else if (line.startsWith("---") || line.startsWith("+++")) {
              lineClass = "text-zinc-200 font-semibold";
            }

            return (
              <div key={idx} className={`flex px-2 py-0.5 rounded-sm ${bgClass}`}>
                <span className="w-10 select-none text-zinc-600 text-right pr-3 shrink-0">
                  {idx + 1}
                </span>
                <span className={`flex-1 whitespace-pre ${lineClass}`}>{line}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
