"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  RotateCw,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileCode,
  Activity,
  Layers,
  Terminal,
  Clock,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AgentGraph } from "@/components/AgentGraph";
import { EventLog } from "@/components/EventLog";
import { EvidenceCards } from "@/components/EvidenceCards";
import { OpportunitiesPRD } from "@/components/OpportunitiesPRD";
import { DiffViewer } from "@/components/DiffViewer";
import { TestTerminal } from "@/components/TestTerminal";
import { HistoryView } from "@/components/HistoryView";
import { SettingsView } from "@/components/SettingsView";
import { TargetView } from "@/components/TargetView";
import { fetchHealth, createNewRun, fetchRunResult, getEventsStreamUrl } from "@/lib/api";
import { RunResult, WorkflowEvent, HealthConfig } from "@/lib/types";

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [health, setHealth] = useState<HealthConfig | null>(null);

  // Form State
  const [competitorUrl, setCompetitorUrl] = useState<string>("https://posthog.com");
  const [demoTarget, setDemoTarget] = useState<string>("demo-target");
  const [forceFixture, setForceFixture] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Current Run State
  const [currentRun, setCurrentRun] = useState<RunResult | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [activeExplorerTab, setActiveExplorerTab] = useState<
    "events" | "evidence" | "strategy" | "diff" | "tests"
  >("events");

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // SSE event source
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    const data = await fetchHealth();
    setHealth(data);
  };

  // Timer effect when run is active
  useEffect(() => {
    if (currentRun?.status === "running" || currentRun?.status === "queued") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentRun?.status]);

  // Handle URL validation
  const handleUrlChange = (val: string) => {
    setCompetitorUrl(val);
    setUrlError("");
    if (!val.trim()) {
      setUrlError("Target URL is required.");
      return;
    }
    try {
      const u = new URL(val);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        setUrlError("Only http:// or https:// URLs are permitted.");
      }
    } catch {
      setUrlError("Please enter a valid URL (e.g. https://example.com)");
    }
  };

  const handleStartAnalysis = async (overrideFixture?: boolean) => {
    if (!competitorUrl.trim()) {
      setUrlError("Please enter a competitor URL.");
      return;
    }

    const useFixture = overrideFixture !== undefined ? overrideFixture : forceFixture;

    setIsSubmitting(true);
    setElapsedSeconds(0);
    setEvents([]);

    // Close previous SSE if open
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const runRecord = await createNewRun({
        competitor_url: competitorUrl,
        demo_target: demoTarget,
        force_fixture: useFixture,
      });

      setCurrentRun(runRecord);
      setCurrentTab("dashboard");
      setActiveExplorerTab("events");

      // Connect SSE
      connectEventStream(runRecord.run_id);
    } catch (err: any) {
      setUrlError(err.message || "Failed to start analysis run.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const connectEventStream = (runId: string) => {
    const sseUrl = getEventsStreamUrl(runId);
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onmessage = async (e) => {
      if (!e.data || e.data.startsWith(":")) return;
      try {
        const evt: WorkflowEvent = JSON.parse(e.data);
        setEvents((prev) => [...prev, evt]);

        // Auto-switch tabs based on workflow stages to guide the user visually
        if (evt.agent === "scout" && evt.status === "succeeded") {
          // Scout finished, evidence is ready
          setActiveExplorerTab("evidence");
        } else if (evt.agent === "strategist" && evt.status === "succeeded") {
          setActiveExplorerTab("strategy");
        } else if (evt.agent === "engineer" && evt.status === "succeeded") {
          setActiveExplorerTab("diff");
        } else if (evt.agent === "tester") {
          setActiveExplorerTab("tests");
        }

        // Check if run finished
        if (evt.agent === "system" && (evt.status === "succeeded" || evt.status === "failed")) {
          es.close();
          // Fetch final structured result
          const fullResult = await fetchRunResult(runId);
          setCurrentRun(fullResult);
        }
      } catch (parseErr) {
        console.error("SSE parse error:", parseErr);
      }
    };

    es.onerror = async () => {
      es.close();
      // On connection drop or finish, poll final result
      try {
        const fullResult = await fetchRunResult(runId);
        setCurrentRun(fullResult);
      } catch {}
    };
  };

  const handleInspectRunFromHistory = async (runId: string) => {
    setIsSubmitting(true);
    try {
      const runResult = await fetchRunResult(runId);
      setCurrentRun(runResult);
      setCurrentTab("dashboard");
      setActiveExplorerTab("evidence");
    } catch (err: any) {
      alert("Failed to inspect run: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPreset = (url: string, fixture: boolean) => {
    setCompetitorUrl(url);
    setForceFixture(fixture);
    setUrlError("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        health={health}
        activeRunCount={currentRun?.status === "running" ? 1 : 0}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {currentTab === "history" && (
          <HistoryView onSelectRun={handleInspectRunFromHistory} />
        )}

        {currentTab === "settings" && (
          <SettingsView health={health} onRefreshHealth={loadHealth} />
        )}

        {currentTab === "target" && <TargetView />}

        {currentTab === "dashboard" && (
          <div className="space-y-6">
            {/* Top Analysis Control Card */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-base font-bold text-zinc-100 tracking-tight flex items-center space-x-2">
                    <span>Autonomous Product Intelligence &amp; Engineering Pipeline</span>
                  </h1>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Extracts public competitor features &rarr; Scores opportunity &rarr; Generates PRD &rarr; Synthesizes verified code patch &rarr; Executes sandbox tests.
                  </p>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-zinc-500 font-medium">Demo Presets:</span>
                  <button
                    onClick={() => setPreset("https://posthog.com", false)}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700 transition"
                  >
                    PostHog (Live)
                  </button>
                  <button
                    onClick={() => setPreset("https://grafana.com", false)}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700 transition"
                  >
                    Grafana (Live)
                  </button>
                  <button
                    onClick={() => setPreset("https://example.com", false)}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700 transition"
                  >
                    Example Domain
                  </button>
                  <button
                    onClick={() => setPreset("https://acme-analytics.demo", true)}
                    className="px-2.5 py-1 rounded bg-purple-950/60 text-purple-300 border border-purple-800 hover:bg-purple-900/60 text-[11px] font-semibold transition"
                  >
                    Labeled Fixture Demo
                  </button>
                </div>
              </div>

              {/* Input Form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                {/* URL Input */}
                <div className="lg:col-span-6">
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Public Competitor URL (Untrusted Input Boundary)
                  </label>
                  <div className="relative">
                    <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={competitorUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://competitor.com/product"
                      className={`w-full bg-zinc-950 text-xs font-mono text-zinc-100 pl-9 pr-3 py-2.5 rounded-lg border focus:outline-none focus:ring-1 ${
                        urlError
                          ? "border-rose-500 focus:ring-rose-500"
                          : "border-zinc-800 focus:border-blue-500 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  {urlError && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{urlError}</span>
                    </p>
                  )}
                </div>

                {/* Target Demo Application */}
                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Controlled Target Workspace
                  </label>
                  <select
                    value={demoTarget}
                    onChange={(e) => setDemoTarget(e.target.value)}
                    className="w-full bg-zinc-950 text-xs font-mono text-zinc-200 px-3 py-2.5 rounded-lg border border-zinc-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="demo-target">Acme Metrics Service (demo-target)</option>
                  </select>
                </div>

                {/* Action Button & Fixture Checkbox */}
                <div className="lg:col-span-3 flex flex-col justify-end">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <input
                      type="checkbox"
                      id="fixtureCheck"
                      checked={forceFixture}
                      onChange={(e) => setForceFixture(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0 h-3.5 w-3.5"
                    />
                    <label htmlFor="fixtureCheck" className="text-[11px] text-zinc-400 cursor-pointer select-none">
                      Force Labeled Fixture Mode
                    </label>
                  </div>

                  <button
                    onClick={() => handleStartAnalysis()}
                    disabled={isSubmitting || Boolean(urlError)}
                    className={`w-full text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition shadow-sm ${
                      isSubmitting || Boolean(urlError)
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Starting Run...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start Agent Analysis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Run Status Header & Elapsed Timer */}
            {currentRun && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <span className="text-zinc-400">Current Status:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[11px] flex items-center space-x-1.5 ${
                      currentRun.status === "succeeded"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : currentRun.status === "failed"
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : "bg-blue-950 text-blue-400 border border-blue-800"
                    }`}
                  >
                    {currentRun.status === "running" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping mr-1" />
                    )}
                    <span>{currentRun.status}</span>
                  </span>

                  {currentRun.final_verdict && (
                    <span className="text-zinc-400">
                      Final Verdict:{" "}
                      <strong className="text-zinc-100 font-mono">
                        {currentRun.final_verdict}
                      </strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4 text-zinc-400 font-mono text-[11px]">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Elapsed: {elapsedSeconds}s</span>
                  </div>

                  <div>
                    <span>Repairs: </span>
                    <span className="text-amber-400 font-bold">{currentRun.repair_attempts} / 2</span>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Pipeline Graph */}
            <AgentGraph currentRun={currentRun} events={events} />

            {/* Explorer Tabs */}
            <div className="border-b border-zinc-800 flex items-center space-x-1 text-xs">
              <button
                onClick={() => setActiveExplorerTab("events")}
                className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center space-x-1.5 ${
                  activeExplorerTab === "events"
                    ? "border-blue-500 text-blue-400 bg-zinc-900/40"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Live Event Stream ({events.length})</span>
              </button>

              <button
                onClick={() => setActiveExplorerTab("evidence")}
                className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center space-x-1.5 ${
                  activeExplorerTab === "evidence"
                    ? "border-blue-500 text-blue-400 bg-zinc-900/40"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Extracted Evidence ({currentRun?.scout?.observed_features?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveExplorerTab("strategy")}
                className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center space-x-1.5 ${
                  activeExplorerTab === "strategy"
                    ? "border-blue-500 text-blue-400 bg-zinc-900/40"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ranked Opportunities &amp; PRD</span>
              </button>

              <button
                onClick={() => setActiveExplorerTab("diff")}
                className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center space-x-1.5 ${
                  activeExplorerTab === "diff"
                    ? "border-blue-500 text-blue-400 bg-zinc-900/40"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Code Patch &amp; Diff</span>
              </button>

              <button
                onClick={() => setActiveExplorerTab("tests")}
                className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center space-x-1.5 ${
                  activeExplorerTab === "tests"
                    ? "border-blue-500 text-blue-400 bg-zinc-900/40"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Sandbox Test Terminal ({currentRun?.test_results?.length || 0})</span>
              </button>
            </div>

            {/* Tab Body */}
            <div>
              {activeExplorerTab === "events" && <EventLog events={events} />}

              {activeExplorerTab === "evidence" && (
                <EvidenceCards scout={currentRun?.scout} />
              )}

              {activeExplorerTab === "strategy" && (
                <OpportunitiesPRD strategist={currentRun?.strategist} />
              )}

              {activeExplorerTab === "diff" && (
                <DiffViewer
                  runId={currentRun?.run_id || "pending"}
                  engineer={currentRun?.engineer}
                  patchContent={currentRun?.patch_content}
                />
              )}

              {activeExplorerTab === "tests" && (
                <TestTerminal
                  testResults={currentRun?.test_results || []}
                  repairAttempts={currentRun?.repair_attempts || 0}
                  finalVerdict={currentRun?.final_verdict || "UNKNOWN"}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-6 py-4 mt-12 text-center text-xs text-zinc-600">
        <p>ShadowBuilder AI &bull; Built with LangGraph, FastAPI, and Next.js &bull; Strictly safe code isolation</p>
      </footer>
    </div>
  );
}
