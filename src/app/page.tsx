"use client";

import { useState } from "react";
import {
  ClipboardList,
  PenLine,
  MessageCircleQuestion,
  Settings2,
  ImageIcon,
  FileText,
} from "lucide-react";
import EvaluatorTab from "@/components/evaluator-tab";
import ConsultTab from "@/components/consult-tab";
import ImageTab from "@/components/image-tab";
import ModelConfigTab from "@/components/model-config-tab";
import DocumentsTab from "@/components/documents-tab";

type TabId = "transcribir" | "consultar" | "imagen" | "modelos" | "documentos";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("transcribir");
  const [qaModel, setQaModel] = useState("openai/gpt-4o-mini");
  const [imageModel, setImageModel] = useState("openai/gpt-4o-mini");
  const [analyzeModel, setAnalyzeModel] = useState("openai/gpt-4o-mini");

  const tabs: { id: TabId; label: string; icon: typeof PenLine }[] = [
    { id: "transcribir", label: "Transcribir", icon: PenLine },
    { id: "consultar", label: "Consultar", icon: MessageCircleQuestion },
    { id: "imagen", label: "Imagen", icon: ImageIcon },
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
          <EvaluatorTab analyzeModel={analyzeModel} onAnalyzeModelChange={setAnalyzeModel} />
        </div>
        <div className={activeTab === "consultar" ? "" : "hidden"}>
          <ConsultTab
            qaModel={qaModel}
            onQaModelChange={setQaModel}
          />
        </div>
        <div className={activeTab === "imagen" ? "" : "hidden"}>
          <ImageTab
            imageModel={imageModel}
            onImageModelChange={setImageModel}
          />
        </div>
        <div className={activeTab === "modelos" ? "" : "hidden"}>
          <ModelConfigTab
            qaModel={qaModel}
            imageModel={imageModel}
            analyzeModel={analyzeModel}
            onQaModelChange={setQaModel}
            onImageModelChange={setImageModel}
            onAnalyzeModelChange={setAnalyzeModel}
          />
        </div>
        <div className={activeTab === "documentos" ? "" : "hidden"}>
          <DocumentsTab />
        </div>
      </main>
    </div>
  );
}
