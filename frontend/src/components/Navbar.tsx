"use client";

import React from "react";
import { ShieldCheck, Activity, Terminal, History, Settings, FolderCode } from "lucide-react";
import { HealthConfig } from "@/lib/types";

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  health: HealthConfig | null;
  activeRunCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  health,
  activeRunCount,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur sticky top-0 z-50 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-zinc-100">
                ShadowBuilder
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-800 text-blue-400 border border-zinc-700 rounded">
                AI MVP
              </span>
            </div>
            <p className="text-xs text-zinc-400">Competitor Intelligence & Tested Patch Agent</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => onTabChange("dashboard")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center space-x-1.5 ${
              currentTab === "dashboard"
                ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Dashboard</span>
            {activeRunCount > 0 && (
              <span className="ml-1.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => onTabChange("history")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center space-x-1.5 ${
              currentTab === "history"
                ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Run History</span>
          </button>

          <button
            onClick={() => onTabChange("target")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center space-x-1.5 ${
              currentTab === "target"
                ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FolderCode className="h-3.5 w-3.5" />
            <span>Target Repo</span>
          </button>

          <button
            onClick={() => onTabChange("settings")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center space-x-1.5 ${
              currentTab === "settings"
                ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Health status & Sandbox Badge */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-800">
            <span
              className={`h-2 w-2 rounded-full ${
                health ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
              }`}
            />
            <span className="text-zinc-300 font-mono">
              {health ? "Backend Connected" : "Backend Disconnected"}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300 font-mono">
            Mode:{" "}
            <span className="text-amber-400 font-semibold">
              {health?.config.sandbox_mode === "template" ? "Constrained Sandbox" : "Docker"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
