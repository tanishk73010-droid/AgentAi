"use client";

import React from "react";
import {
  Globe,
  Lightbulb,
  Cpu,
  FlaskConical,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ArrowRight,
} from "lucide-react";
import { WorkflowEvent, RunResult } from "@/lib/types";

interface AgentGraphProps {
  currentRun: RunResult | null;
  events: WorkflowEvent[];
}

export const AgentGraph: React.FC<AgentGraphProps> = ({ currentRun, events }) => {
  // Derive status of each agent from latest events and run data
  const getAgentStatus = (agentName: string) => {
    if (!currentRun) return "idle";

    // Find latest event for this agent
    const agentEvents = events.filter((e) => e.agent === agentName);
    if (agentEvents.length === 0) {
      if (currentRun.status === "queued") return "queued";
      return "pending";
    }

    const latest = agentEvents[agentEvents.length - 1];
    return latest.status; // "running" | "succeeded" | "failed" | "retrying"
  };

  const scoutStatus = getAgentStatus("scout");
  const stratStatus = getAgentStatus("strategist");
  const engStatus = getAgentStatus("engineer");
  const testStatus = getAgentStatus("tester");
  const systemStatus = getAgentStatus("system");

  const nodes = [
    {
      id: "scout",
      name: "Scout Agent",
      role: "Public Evidence Extraction",
      icon: Globe,
      status: scoutStatus,
      detail: currentRun?.scout
        ? `${currentRun.scout.observed_features.length} features found`
        : "Extracts public HTML & links",
    },
    {
      id: "strategist",
      name: "Strategist Agent",
      role: "Opportunity Scoring & PRD",
      icon: Lightbulb,
      status: stratStatus,
      detail: currentRun?.strategist?.selected_opportunity
        ? `Score: ${currentRun.strategist.selected_opportunity.score}`
        : "Formulates transparent scores",
    },
    {
      id: "engineer",
      name: "Engineer Agent",
      role: "Constrained Patch Synthesis",
      icon: Cpu,
      status: engStatus,
      detail: currentRun?.engineer
        ? `${currentRun.engineer.files_proposed.length} files modified`
        : "Generates scoped Python patch",
    },
    {
      id: "tester",
      name: "Test Runner",
      role: "Isolated Sandbox Execution",
      icon: FlaskConical,
      status: testStatus,
      detail: currentRun?.test_results?.length
        ? `${currentRun.test_results.length} attempt(s) run`
        : "Executes fixed pytest suite",
    },
    {
      id: "system",
      name: "Verdict & Patch",
      role: "Outcome & Artifact Delivery",
      icon: currentRun?.final_verdict === "SUCCESS" ? CheckCircle2 : CheckCircle2,
      status: systemStatus,
      detail: currentRun?.final_verdict
        ? `Result: ${currentRun.final_verdict}`
        : "Awaits validation",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "border-blue-500 bg-blue-950/30 text-blue-400";
      case "retrying":
        return "border-amber-500 bg-amber-950/30 text-amber-400";
      case "succeeded":
        return "border-emerald-500 bg-emerald-950/30 text-emerald-400";
      case "failed":
        return "border-rose-500 bg-rose-950/30 text-rose-400";
      default:
        return "border-zinc-800 bg-zinc-900/60 text-zinc-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return (
          <span className="flex items-center text-[10px] font-semibold text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping mr-1" />
            RUNNING
          </span>
        );
      case "retrying":
        return (
          <span className="flex items-center text-[10px] font-semibold text-amber-400">
            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            REPAIRING
          </span>
        );
      case "succeeded":
        return (
          <span className="flex items-center text-[10px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            PASSED
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center text-[10px] font-semibold text-rose-400">
            <XCircle className="h-3 w-3 mr-1" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="flex items-center text-[10px] text-zinc-500">
            <Clock className="h-3 w-3 mr-1" />
            WAITING
          </span>
        );
    }
  };

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">LangGraph Agent Pipeline</h2>
          <p className="text-xs text-zinc-400">Real-time state machine transitions and repair loop</p>
        </div>

        {currentRun && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-zinc-400">Run ID:</span>
            <span className="font-mono text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              {currentRun.run_id}
            </span>
            <span className="text-zinc-400">Target:</span>
            <span className="font-mono text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900">
              {currentRun.demo_target}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {nodes.map((node, idx) => {
          const Icon = node.icon;
          const colorClass = getStatusColor(node.status);

          return (
            <div key={node.id} className="relative group">
              <div
                className={`p-3.5 rounded-lg border transition-all h-full flex flex-col justify-between ${colorClass}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-7 w-7 rounded bg-zinc-800/80 flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    {getStatusBadge(node.status)}
                  </div>

                  <h3 className="font-medium text-xs text-zinc-100">{node.name}</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{node.role}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-400 truncate">
                  {node.detail}
                </div>
              </div>

              {/* Arrow connector between nodes */}
              {idx < nodes.length - 1 && (
                <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-zinc-600">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
