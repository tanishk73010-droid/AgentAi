"use client";

import React, { useState } from "react";
import { Lightbulb, FileText, CheckCircle2, ChevronRight, Calculator, HelpCircle } from "lucide-react";
import { StrategistOutput, OpportunityCandidate } from "@/lib/types";

interface OpportunitiesPRDProps {
  strategist: StrategistOutput | undefined;
}

export const OpportunitiesPRD: React.FC<OpportunitiesPRDProps> = ({ strategist }) => {
  const [selectedTab, setSelectedTab] = useState<"opportunities" | "prd">("opportunities");

  if (!strategist) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
        <Lightbulb className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
        <p className="text-sm">No strategy recommendations generated yet.</p>
        <p className="text-xs text-zinc-600 mt-1">Awaiting Strategist agent synthesis.</p>
      </div>
    );
  }

  const selectedOpp = strategist.selected_opportunity;
  const prd = strategist.prd;

  return (
    <div className="space-y-5">
      {/* Formula & Navigation Banner */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 mb-1">
            <Calculator className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Transparent Prioritization Formula
            </span>
          </div>
          <p className="text-xs font-mono text-zinc-300">
            Score = 0.30 &times; Impact + 0.30 &times; Evidence + 0.25 &times; Confidence + 0.15 &times; (6 &minus; Effort)
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Range: 1.0 (lowest) to 5.0 (highest priority). Effort scale: 1=low effort, 5=high effort.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 self-start md:self-auto">
          <button
            onClick={() => setSelectedTab("opportunities")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              selectedTab === "opportunities"
                ? "bg-purple-900/40 text-purple-200 border border-purple-700/50"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Opportunities ({strategist.opportunities.length})
          </button>
          <button
            onClick={() => setSelectedTab("prd")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              selectedTab === "prd"
                ? "bg-purple-900/40 text-purple-200 border border-purple-700/50"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Generated PRD
          </button>
        </div>
      </div>

      {selectedTab === "opportunities" ? (
        <div className="space-y-3">
          {strategist.opportunities.map((opp) => {
            const isSelected = selectedOpp?.id === opp.id;

            return (
              <div
                key={opp.id}
                className={`bg-zinc-900/50 border rounded-xl p-4 transition ${
                  isSelected
                    ? "border-purple-600 bg-purple-950/10 shadow-sm"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-2.5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-zinc-400">{opp.id}</span>
                      <h4 className="text-sm font-semibold text-zinc-100">{opp.title}</h4>
                      {isSelected && (
                        <span className="text-[10px] uppercase font-bold bg-purple-900/60 text-purple-300 border border-purple-700 px-2 py-0.5 rounded">
                          Selected for Implementation
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{opp.description}</p>
                  </div>

                  {/* Score badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xl font-bold font-mono text-purple-400">
                      {opp.score.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase">Priority Score</span>
                  </div>
                </div>

                {/* Score breakdown metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-xs">
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Impact (30%)</span>
                    <span className="font-mono text-zinc-200 font-semibold">{opp.impact} / 5</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Evidence (30%)</span>
                    <span className="font-mono text-zinc-200 font-semibold">{opp.evidence_strength} / 5</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Confidence (25%)</span>
                    <span className="font-mono text-zinc-200 font-semibold">{opp.confidence} / 5</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Effort (15%)</span>
                    <span className="font-mono text-zinc-200 font-semibold">{opp.effort} / 5</span>
                  </div>
                </div>

                {/* Facts vs Hypotheses */}
                <div className="text-xs space-y-1.5 pt-1">
                  <div className="text-zinc-300 font-medium text-[11px] flex items-center space-x-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-blue-400" />
                    <span>Evidence vs Assumptions:</span>
                  </div>
                  <p className="text-zinc-400 text-xs bg-zinc-950/80 p-2 rounded border border-zinc-800/80">
                    {opp.facts_vs_hypotheses}
                  </p>
                </div>

                <div className="mt-2 text-[11px] text-zinc-500 font-mono">
                  {opp.scoring_explanation}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* PRD Viewer */
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-5">
          {prd ? (
            <>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/40 border border-purple-900 px-2 py-0.5 rounded">
                  Product Requirement Document
                </span>
                <h3 className="text-base font-semibold text-zinc-100 mt-2">{prd.title}</h3>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  {prd.overview}
                </p>
              </div>

              {/* Goals & Non-goals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                    Goals
                  </h4>
                  <ul className="text-xs space-y-1 text-zinc-300 list-disc list-inside">
                    {prd.goals.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg">
                  <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
                    Non-Goals (Scope Boundary)
                  </h4>
                  <ul className="text-xs space-y-1 text-zinc-400 list-disc list-inside">
                    {prd.non_goals.map((ng, i) => (
                      <li key={i}>{ng}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* User Stories */}
              <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  User Stories
                </h4>
                <ul className="text-xs space-y-1.5 text-zinc-300">
                  {prd.user_stories.map((us, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <ChevronRight className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span>{us}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Acceptance Criteria */}
              <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Acceptance Criteria
                </h4>
                <ul className="text-xs space-y-1.5 text-zinc-300">
                  {prd.acceptance_criteria.map((ac, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{ac}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Edge Cases & Test Plan */}
              <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Test Plan & Edge Cases
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono bg-zinc-900/60 p-2.5 rounded border border-zinc-800/80">
                  {prd.test_plan}
                </p>
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-500">PRD is not available for this run.</p>
          )}
        </div>
      )}
    </div>
  );
};
