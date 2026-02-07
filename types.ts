
export type PDCAMode = 'A' | 'B';

export interface PDCAStep {
  p: Record<string, any>;
  d: Record<string, any>;
  c: Record<string, any>;
  a: Record<string, any>;
}

export interface PDCAData {
  modeA: PDCAStep;
  modeB: PDCAStep;
}

export type ViewState = 'home' | 'editor';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export const INITIAL_STEP_A: PDCAStep = {
  p: { goal: '', krs: '', milestones: '', risks: '' },
  d: { schedule: '', dod: '', resources: '' },
  c: { progress: '', deviations: '', analysis: '' },
  a: { optimization: '', correction: '', standardization: '' }
};

export const INITIAL_STEP_B: PDCAStep = {
  p: { problem: '', background: '', rootCauses: '', hypothesis: '' },
  d: { solutions: '', validationPlan: '', owner: '' },
  c: { results: '', comparison: '', unexpected: '' },
  a: { standardization: '', legacyIssues: '', horizontalSharing: '' }
};
