"use client";

import React, { useRef, useEffect } from "react";
import { Terminal, Copy, Check } from "lucide-react";
import { WorkflowEvent } from "@/lib/types";

interface EventLogProps {
  events: WorkflowEvent[];
}

export const EventLog: React.FC<EventLogProps> = ({ events }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const handleCopy = () => {
    const text = events
      .map(
        (e) =>
          `[${e.timestamp.slice(11, 19)}] [${e.agent.toUpperCase()}] [${e.status.toUpperCase()}] ${e.message}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAgentBadgeColor = (agent: string) => {
    switch (agent) {
      case "scout":
        return "bg-cyan-950/60 text-cyan-400 border-cyan-800";
      case "strategist":
        return "bg-purple-950/60 text-purple-400 border-purple-800";
      case "engineer":
        return "bg-amber-950/60 text-amber-400 border-amber-800";
      case "tester":
        return "bg-emerald-950/60 text-emerald-400 border-emerald-800";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-400 animate-pulse";
      case "retrying":
        return "bg-amber-400 animate-spin";
      case "succeeded":
        return "bg-emerald-400";
      case "failed":
        return "bg-rose-400";
      default:
        return "bg-zinc-500";
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col h-[520px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-200">Live Agent Event Stream (SSE)</span>
          <span className="text-[11px] font-mono text-zinc-500">({events.length} events)</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded transition border border-zinc-700"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? "Copied" : "Copy Logs"}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
            <Terminal className="h-8 w-8 text-zinc-600" />
            <p>Awaiting run events...</p>
            <p className="text-[11px] text-zinc-600">Start an analysis above to watch live backend transitions</p>
          </div>
        ) : (
          events.map((evt, index) => {
            const timeStr = evt.timestamp ? evt.timestamp.slice(11, 19) : "--:--:--";
            return (
              <div
                key={evt.event_id || index}
                className="flex items-start space-x-2.5 py-1 px-1.5 rounded hover:bg-zinc-900/40 transition"
              >
                <span className="text-zinc-500 select-none text-[11px] pt-0.5">{timeStr}</span>

                <div className="flex items-center space-x-1.5 pt-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(evt.status)}`} />
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${getAgentBadgeColor(
                      evt.agent
                    )}`}
                  >
                    {evt.agent}
                  </span>
                </div>

                <div className="flex-1 text-zinc-300 break-words leading-relaxed">
                  {evt.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
