export interface Subdimension {
  id: string;
  label: string;
  question: string;
  hasInfo?: boolean;
  A: boolean;
  B: boolean;
}

export interface AnalysisResult {
  strengthenedJustification: string;
  diagnosis: string;
  charCount: number;
  dimensions: {
    overall: string;
    naturalness: string;
    dynamics: string;
    instructionFollowing: string;
    utility: string;
    audioQuality: string;
  };
  taskSuccess: {
    A: string;
    B: string;
  };
  techIssues: {
    A: boolean;
    B: boolean;
  };
  subdimensions: Subdimension[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  model?: string;
  requestedAt?: string;
}

export const DIMENSION_LABELS: Record<string, string> = {
  overall: "Overall Preference",
  naturalness: "Naturalness / Engagement",
  dynamics: "Conversational Dynamics",
  instructionFollowing: "Instruction Following",
  utility: "Utility",
  audioQuality: "Audio Quality",
};

export const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  overall: "Experiencia general combinando todos los criterios.",
  naturalness:
    "Si la respuesta suena humana, fluida y atractiva vs. robotica o repetitiva.",
  dynamics:
    "Manejo de turnos, pausas, interrupciones, backchannels, cambio de tono.",
  instructionFollowing:
    "Si el modelo entendio y ejecuto la intencion del usuario.",
  utility: "La respuesta debe ser correcta y usable para ser competitiva.",
  audioQuality:
    "Solo penaliza si hay artefactos evidentes (cortes, distorsion).",
};
