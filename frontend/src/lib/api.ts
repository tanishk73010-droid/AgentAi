import { HealthConfig, RunResult, CreateRunRequest } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchHealth(): Promise<HealthConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createNewRun(data: {
  competitor_url: string;
  demo_target?: string;
  force_fixture?: boolean;
}): Promise<RunResult> {
  const res = await fetch(`${API_BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      competitor_url: data.competitor_url,
      demo_target: data.demo_target || "demo-target",
      force_fixture: data.force_fixture ?? false,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create run." }));
    throw new Error(err.detail || "Server error while creating run.");
  }
  return await res.json();
}

export async function fetchRun(runId: string): Promise<RunResult> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Run ${runId} not found.`);
  return await res.json();
}

export async function fetchRunResult(runId: string): Promise<RunResult> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/result`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not fetch result for run ${runId}`);
  return await res.json();
}

export async function fetchRunsList(): Promise<RunResult[]> {
  try {
    const res = await fetch(`${API_BASE}/api/runs`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export function getPatchDownloadUrl(runId: string): string {
  return `${API_BASE}/api/runs/${runId}/patch`;
}

export function getEventsStreamUrl(runId: string): string {
  return `${API_BASE}/api/runs/${runId}/events`;
}
