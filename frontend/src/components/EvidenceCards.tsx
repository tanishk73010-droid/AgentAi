"use client";

import React from "react";
import { ExternalLink, ShieldAlert, CheckCircle, Quote, AlertTriangle } from "lucide-react";
import { ScoutOutput } from "@/lib/types";

interface EvidenceCardsProps {
  scout: ScoutOutput | undefined;
}

export const EvidenceCards: React.FC<EvidenceCardsProps> = ({ scout }) => {
  if (!scout) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
        <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
        <p className="text-sm">No competitor evidence extracted yet.</p>
        <p className="text-xs text-zinc-600 mt-1">Start an analysis to view verified public product findings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Target Overview Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-950/40 border border-blue-900 px-2 py-0.5 rounded">
              Extracted Target
            </span>
            <h3 className="text-base font-semibold text-zinc-100 mt-1">{scout.page_title}</h3>
          </div>

          <a
            href={scout.target_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 text-xs text-blue-400 hover:text-blue-300 font-mono bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-lg transition"
          >
            <span>{scout.target_url}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
          {scout.product_summary}
        </p>

        <div className="mt-3 flex items-center space-x-2 text-[11px] text-zinc-400">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
          <span>{scout.confidence_notes}</span>
        </div>
      </div>

      {/* Observed Features Grid */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
          Verified Observed Features ({scout.observed_features.length})
        </h4>

        {scout.observed_features.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-500">
            No clear product features extracted from page text.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scout.observed_features.map((feat, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h5 className="text-xs font-semibold text-zinc-100">{feat.name}</h5>
                    <a
                      href={feat.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-300"
                      title="View source link"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">{feat.description}</p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800/90 rounded-lg p-2.5 text-[11px]">
                  <div className="flex items-center space-x-1 text-zinc-500 font-mono text-[10px] mb-1">
                    <Quote className="h-3 w-3 text-blue-400" />
                    <span>Evidence Excerpt:</span>
                  </div>
                  <p className="text-zinc-300 italic font-mono text-[11px] leading-relaxed">
                    &ldquo;{feat.evidence_excerpt}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Limitations / Caveats */}
      <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4">
        <div className="flex items-center space-x-2 text-amber-400 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <h4 className="text-xs font-semibold uppercase tracking-wider">
            Extraction Limitations & Caveats
          </h4>
        </div>
        <ul className="space-y-1.5 text-xs text-zinc-400 list-disc list-inside">
          {scout.limitations.map((lim, i) => (
            <li key={i}>{lim}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
