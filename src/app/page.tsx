"use client";

import { useState } from "react";
import { ClipboardList, PenLine, MessageCircleQuestion } from "lucide-react";
import EvaluatorTab from "@/components/evaluator-tab";
import ConsultTab from "@/components/consult-tab";

type TabId = "transcribir" | "consultar";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("transcribir");

  const tabs: { id: TabId; label: string; icon: typeof PenLine }[] = [
    { id: "transcribir", label: "Transcribir", icon: PenLine },
    { id: "consultar", label: "Consultar", icon: MessageCircleQuestion },
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
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  isActive
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

        {/* Tab content — both always mounted, hidden via CSS to preserve state */}
        <div className={activeTab === "transcribir" ? "" : "hidden"}>
          <EvaluatorTab />
        </div>
        <div className={activeTab === "consultar" ? "" : "hidden"}>
          <ConsultTab />
        </div>
      </main>
    </div>
  );
}
