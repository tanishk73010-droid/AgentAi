"use client";

import React from "react";
import { Settings, ShieldCheck, Key, Server, Cpu, RefreshCw, ExternalLink } from "lucide-react";
import { HealthConfig } from "@/lib/types";

interface SettingsViewProps {
  health: HealthConfig | null;
  onRefreshHealth: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ health, onRefreshHealth }) => {
  const config = health?.config;

  return (
    <div className="space-y-6">
      {/* Current Configuration Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <Settings className="h-5 w-5 text-blue-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              System Configuration & Health
            </h2>
          </div>

          <button
            onClick={onRefreshHealth}
            className="flex items-center space-x-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-700 transition"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Recheck Health</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* LLM Provider */}
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-zinc-400 mb-1">
              <Cpu className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-semibold uppercase">LLM Provider</span>
            </div>
            <div className="text-base font-bold text-zinc-100 font-mono">
              {config?.llm_provider || "gemini"}
            </div>
            <div className="text-xs text-zinc-500 font-mono mt-0.5">
              Model: {config?.llm_model || "gemini-2.5-flash"}
            </div>
          </div>

          {/* API Key Status */}
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-zinc-400 mb-1">
              <Key className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase">API Key Presence</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  config?.has_llm_api_key ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span className="text-sm font-semibold text-zinc-200">
                {config?.has_llm_api_key ? "Configured in local .env" : "Labeled Fixture Mode"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {config?.has_llm_api_key
                ? "Real model integration active."
                : "Deterministic fixture analysis active."}
            </p>
          </div>

          {/* Sandbox Execution Mode */}
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-zinc-400 mb-1">
              <Server className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase">Execution Sandbox</span>
            </div>
            <div className="text-base font-bold text-amber-400 font-mono">
              Constrained Sandbox
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Docker not detected; using safe template copy with fixed pytest command.
            </div>
          </div>
        </div>
      </div>

      {/* Secret Configuration Guide */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-blue-400 mb-2">
          <ShieldCheck className="h-5 w-5" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            How to Connect a Live LLM Key (Gemini Free Tier)
          </h3>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          To switch from labeled fixture mode to live AI inference, obtain a free API key and store
          it in your local <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200 font-mono">.env</code> file.
          <strong className="text-zinc-200 ml-1">Never paste your API key in chat.</strong>
        </p>

        <ol className="space-y-3 text-xs text-zinc-300 list-decimal list-inside bg-zinc-950 p-4 rounded-xl border border-zinc-800">
          <li>
            Open Google AI Studio:{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center space-x-1"
            >
              <span>aistudio.google.com/app/apikey</span>
              <ExternalLink className="h-3 w-3 inline" />
            </a>
          </li>
          <li>Click &ldquo;Create API Key&rdquo; (Gemini free tier requires no credit card).</li>
          <li>
            In your project directory, open your local <code className="text-blue-300 font-mono">.env</code> file:
            <pre className="mt-1 bg-zinc-900 p-2 rounded border border-zinc-800 text-[11px] font-mono text-zinc-300">
              LLM_PROVIDER=gemini{"\n"}
              LLM_API_KEY=YOUR_GEMINI_KEY_HERE{"\n"}
              LLM_MODEL=gemini-2.5-flash
            </pre>
          </li>
          <li>Save the file and restart the backend server. Recheck health above!</li>
        </ol>
      </div>
    </div>
  );
};
