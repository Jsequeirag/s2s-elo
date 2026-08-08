"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardList,
  PenLine,
  MessageCircleQuestion,
  Settings2,
  ImageIcon,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import EvaluatorTab from "@/components/evaluator-tab";
import ConsultTab from "@/components/consult-tab";
import ImageTab from "@/components/image-tab";
import ModelConfigTab from "@/components/model-config-tab";
import DocumentsTab from "@/components/documents-tab";
import DialogTab from "@/components/dialog-tab";
import GeneralQaTab from "@/components/general-qa-tab";

type TabId = "transcribir" | "consultar" | "imagen" | "dialogo" | "generales" | "modelos" | "documentos";

const DEFAULT_MODEL = "openai/gpt-4o-mini";
// Justification/analysis uses a stronger reasoning model by default: the task
// demands strict JSON + 4-part structure + evidence anchors, where mini models
// struggle. GLM-4.6 (text-only) gives better adherence at a comparable price.
const DEFAULT_ANALYZE_MODEL = "z-ai/glm-4.6";

// Debounced persist to MongoDB — avoids saving on every keystroke
function useModelPersist(key: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      }).catch(() => { /* best-effort */ });
    }, 500);
  }, [key]);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dialogo");
  const [qaModel, setQaModel] = useState(DEFAULT_MODEL);
  const [imageModel, setImageModel] = useState(DEFAULT_MODEL);
  const [analyzeModel, setAnalyzeModel] = useState(DEFAULT_ANALYZE_MODEL);
  const [dialogModel, setDialogModel] = useState(DEFAULT_MODEL);
  const [generalModel, setGeneralModel] = useState(DEFAULT_MODEL);
  const [configLoaded, setConfigLoaded] = useState(false);

  const persistQa = useModelPersist("qaModel");
  const persistImage = useModelPersist("imageModel");
  const persistAnalyze = useModelPersist("analyzeModel");
  const persistDialog = useModelPersist("dialogModel");
  const persistGeneral = useModelPersist("generalModel");

  // Load saved model config from MongoDB on mount
  useEffect(() => {
    if (configLoaded) return;
    (async () => {
      try {
        const res = await fetch("/api/config");
        const json = await res.json();
        if (res.ok && json.data) {
          if (json.data.qaModel) setQaModel(json.data.qaModel);
          if (json.data.imageModel) setImageModel(json.data.imageModel);
          if (json.data.analyzeModel) setAnalyzeModel(json.data.analyzeModel);
          if (json.data.dialogModel) setDialogModel(json.data.dialogModel);
          if (json.data.generalModel) setGeneralModel(json.data.generalModel);
        }
      } catch {
        // Silently fail — use defaults
      } finally {
        setConfigLoaded(true);
      }
    })();
  }, [configLoaded]);

  const handleQaModelChange = useCallback((value: string) => {
    setQaModel(value);
    persistQa(value);
  }, [persistQa]);

  const handleImageModelChange = useCallback((value: string) => {
    setImageModel(value);
    persistImage(value);
  }, [persistImage]);

  const handleAnalyzeModelChange = useCallback((value: string) => {
    setAnalyzeModel(value);
    persistAnalyze(value);
  }, [persistAnalyze]);

  const handleDialogModelChange = useCallback((value: string) => {
    setDialogModel(value);
    persistDialog(value);
  }, [persistDialog]);

  const handleGeneralModelChange = useCallback((value: string) => {
    setGeneralModel(value);
    persistGeneral(value);
  }, [persistGeneral]);

  const tabs: { id: TabId; label: string; icon: typeof PenLine }[] = [
    { id: "dialogo", label: "Dialogo", icon: MessageSquare },
    { id: "transcribir", label: "Transcribir", icon: PenLine },
    { id: "imagen", label: "Imagen", icon: ImageIcon },
    { id: "consultar", label: "Consultar", icon: MessageCircleQuestion },
    { id: "generales", label: "General", icon: Sparkles },
    { id: "modelos", label: "Modelos", icon: Settings2 },
    { id: "documentos", label: "Documentos", icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <ClipboardList className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Live S2S ELO — Evaluacion de Votos
              </h1>
              <p className="text-sm text-muted-foreground">
                Analiza justificaciones y consulta la guia de evaluacion
              </p>
            </div>
          </div>
        </header>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/60 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content — all always mounted, hidden via CSS to preserve state */}
        <div className={activeTab === "transcribir" ? "" : "hidden"}>
          <EvaluatorTab analyzeModel={analyzeModel} onAnalyzeModelChange={handleAnalyzeModelChange} />
        </div>
        <div className={activeTab === "consultar" ? "" : "hidden"}>
          <ConsultTab
            qaModel={qaModel}
            onQaModelChange={handleQaModelChange}
          />
        </div>
        <div className={activeTab === "imagen" ? "" : "hidden"}>
          <ImageTab
            imageModel={imageModel}
            onImageModelChange={handleImageModelChange}
          />
        </div>
        <div className={activeTab === "dialogo" ? "" : "hidden"}>
          <DialogTab
            dialogModel={dialogModel}
            onDialogModelChange={handleDialogModelChange}
          />
        </div>
        <div className={activeTab === "generales" ? "" : "hidden"}>
          <GeneralQaTab
            generalModel={generalModel}
            onGeneralModelChange={handleGeneralModelChange}
          />
        </div>
        <div className={activeTab === "modelos" ? "" : "hidden"}>
          <ModelConfigTab
            qaModel={qaModel}
            imageModel={imageModel}
            analyzeModel={analyzeModel}
            dialogModel={dialogModel}
            generalModel={generalModel}
            onQaModelChange={handleQaModelChange}
            onImageModelChange={handleImageModelChange}
            onAnalyzeModelChange={handleAnalyzeModelChange}
            onDialogModelChange={handleDialogModelChange}
            onGeneralModelChange={handleGeneralModelChange}
          />
        </div>
        <div className={activeTab === "documentos" ? "" : "hidden"}>
          <DocumentsTab />
        </div>
      </main>
    </div>
  );
}
