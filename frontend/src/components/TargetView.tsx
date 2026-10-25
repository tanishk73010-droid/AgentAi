"use client";

import React from "react";
import { FolderCode, FileText, CheckCircle2, ShieldCheck, Terminal } from "lucide-react";

export const TargetView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center space-x-2.5 mb-2">
          <FolderCode className="h-5 w-5 text-blue-400" />
          <h2 className="text-base font-semibold text-zinc-100">
            Controlled Demo Target: Acme Metrics Service
          </h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          ShadowBuilder AI is strictly constrained to patching allowlisted files inside this
          dedicated repository. The target application features a modular Python architecture and a
          predefined <code className="text-zinc-200 font-mono">pytest tests/</code> verification suite.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <FileText className="h-4 w-4 text-purple-400" />
              <span>Allowlisted Target Files</span>
            </h3>
            <ul className="text-xs font-mono space-y-1.5 text-zinc-400">
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400">&bull;</span>
                <span>src/metrics.py (Aggregation & anomalies)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400">&bull;</span>
                <span>src/exporter.py (Export engine feature target)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400">&bull;</span>
                <span>tests/test_metrics.py (Baseline unit suite)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400">&bull;</span>
                <span>tests/test_exporter.py (Automated feature validation)</span>
              </li>
            </ul>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Safety & Isolation Guarantees</span>
            </h3>
            <ul className="text-xs space-y-1.5 text-zinc-400">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Disposable workspace cloned per run (zero side effects on host)</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Strict path traversal blocking &amp; extension allowlist (.py, .json)</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Fixed execution command: only approved &ldquo;pytest tests/&rdquo;</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Bounded repair loop: hard limit of maximum 2 retries</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
