export interface CreateRunRequest {
  competitor_url: string;
  demo_target?: string;
  force_fixture?: boolean;
}

export interface ObservedFeature {
  name: string;
  description: string;
  source_url: string;
  evidence_excerpt: string;
}

export interface FeedbackItem {
  excerpt: string;
  source_url: string;
  sentiment?: string;
  date?: string;
}

export interface ScoutOutput {
  run_id: string;
  page_title: string;
  target_url: string;
  product_summary: string;
  observed_features: ObservedFeature[];
  feedback_items: FeedbackItem[];
  limitations: string[];
  confidence_notes: string;
}

export interface OpportunityCandidate {
  id: string;
  title: string;
  description: string;
  user_problem: string;
  evidence_references: string[];
  facts_vs_hypotheses: string;
  impact: number;
  evidence_strength: number;
  confidence: number;
  effort: number;
  score: number;
  scoring_explanation: string;
}

export interface PRD {
  title: string;
  overview: string;
  goals: string[];
  non_goals: string[];
  user_stories: string[];
  acceptance_criteria: string[];
  edge_cases: string[];
  test_plan: string;
}

export interface StrategistOutput {
  run_id: string;
  opportunities: OpportunityCandidate[];
  selected_opportunity?: OpportunityCandidate;
  prd?: PRD;
  limitations: string[];
}

export interface PatchFile {
  path: string;
  action: string;
  diff: string;
  content?: string;
}

export interface EngineerOutput {
  run_id: string;
  selected_feature: string;
  rationale: string;
  files_proposed: string[];
  patch: string;
  patches: PatchFile[];
  requested_test_commands: string[];
  expected_acceptance_criteria: string[];
  assumptions_and_limitations: string[];
}

export interface TestAttemptResult {
  attempt: number;
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  passed: boolean;
}

export interface WorkflowEvent {
  run_id: string;
  event_id: string;
  timestamp: string;
  agent: string;
  status: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface RunResult {
  run_id: string;
  competitor_url: string;
  demo_target: string;
  status: string;
  created_at: string;
  updated_at: string;
  scout?: ScoutOutput;
  strategist?: StrategistOutput;
  engineer?: EngineerOutput;
  test_results: TestAttemptResult[];
  patch_artifact_path?: string;
  patch_content?: string;
  repair_attempts: number;
  final_verdict: string;
  error_summary?: string;
}

export interface HealthConfig {
  status: string;
  service: string;
  config: {
    llm_provider: string;
    llm_model: string;
    has_llm_api_key: boolean;
    fixture_mode: boolean;
    has_firecrawl_key: boolean;
    sandbox_mode: string;
    frontend_origin: string;
  };
}
