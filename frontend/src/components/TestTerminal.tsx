"use client";

import React from "react";
import { Terminal, CheckCircle2, XCircle, Clock, RotateCcw } from "lucide-react";
import { TestAttemptResult } from "@/lib/types";

interface TestTerminalProps {
  testResults: TestAttemptResult[];
  repairAttempts: number;
  finalVerdict: string;
}

export const TestTerminal: React.FC<TestTerminalProps> = ({
  testResults,
  repairAttempts,
  finalVerdict,
}) => {
  if (!testResults || testResults.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
        <Terminal className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
        <p className="text-sm">No sandbox tests executed yet.</p>
        <p className="text-xs text-zinc-600 mt-1">
          Awaiting patch generation and isolated sandbox test execution.
        </p>
      </div>
    );
  }

  const latestTest = testResults[testResults.length - 1];

  return (
    <div className="space-y-4">
      {/* Verdict & Repair Stats */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div
            className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              latestTest.passed
                ? "bg-emerald-950/60 border border-emerald-700/60 text-emerald-400"
                : "bg-rose-950/60 border border-rose-700/60 text-rose-400"
            }`}
          >
            {latestTest.passed ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <XCircle className="h-6 w-6" />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-zinc-400">Sandbox Test Verdict:</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                  latestTest.passed
                    ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800"
                    : "bg-rose-900/40 text-rose-300 border border-rose-800"
                }`}
              >
                {latestTest.passed ? "ALL TESTS PASSED" : "TEST FAILURE"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Command: <span className="font-mono text-zinc-200">pytest tests/</span> &bull; Duration:{" "}
              <span className="font-mono text-zinc-200">{latestTest.duration_ms}ms</span>
            </p>
          </div>
        </div>

        {/* Repair Counter */}
        <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
          <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs text-zinc-400">Repairs Used:</span>
          <span className="text-xs font-mono font-bold text-amber-400">
            {repairAttempts} / 2
          </span>
        </div>
      </div>

      {/* Attempt History */}
      <div className="space-y-3">
        {testResults.map((test, idx) => (
          <div
            key={idx}
            className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs"
          >
            <div className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    test.passed ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                <span className="font-semibold text-zinc-200">
                  Attempt #{test.attempt} &mdash; {test.command}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-zinc-400">
                <span>Exit Code: {test.exit_code}</span>
                <span>Duration: {test.duration_ms}ms</span>
              </div>
            </div>

            <div className="p-4 text-xs leading-relaxed max-h-[350px] overflow-y-auto">
              {test.stdout && (
                <div className="text-zinc-300 whitespace-pre-wrap">{test.stdout}</div>
              )}
              {test.stderr && (
                <div className="text-rose-400 whitespace-pre-wrap mt-2">{test.stderr}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
