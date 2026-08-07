"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Send,
  Sparkles,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

const GENERAL_MODEL_PROFILES = [
  { label: "Economico", value: "openai/gpt-4o-mini" },
  { label: "Mas fuerte", value: "openai/gpt-4o" },
];

type CallMeta = {
  model: string;
  requestedAt: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
} | null;

export default function GeneralQaTab({
  generalModel,
  onGeneralModelChange,
}: {
  generalModel: string;
  onGeneralModelChange: (value: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [lastCallMeta, setLastCallMeta] = useState<CallMeta>(null);

  // Load saved general QA state on mount
  useEffect(() => {
    if (loaded) return;
    (async () => {
      try {
        const res = await fetch("/api/justification");
        const json = await res.json();
        if (res.ok && json.data?.generalQaState) {
          const saved = json.data.generalQaState as {
            question: string;
            answer: string;
            lastCallMeta: CallMeta;
          };
          if (typeof saved.question === "string") setQuestion(saved.question);
          if (typeof saved.answer === "string") setAnswer(saved.answer);
          if (saved.lastCallMeta) setLastCallMeta(saved.lastCallMeta);
        }
      } catch {
        // Silently fail — start fresh
      } finally {
        setLoaded(true);
      }
    })();
  }, [loaded]);

  // Persist general QA state to MongoDB
  const persistState = useCallback(
    async (q: string, a: string, meta: CallMeta) => {
      try {
        await fetch("/api/justification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generalQaState: { question: q, answer: a, lastCallMeta: meta },
          }),
        });
      } catch {
        // Best-effort persistence
      }
    },
    []
  );

  const handleAsk = useCallback(
    async (q?: string) => {
      const query = (q ?? question).trim();
      if (query.length < 2) {
        setError("La pregunta debe tener al menos 2 caracteres.");
        return;
      }
      setError("");
      setLoading(true);
      setAnswer("");

      try {
        const res = await fetch("/api/general-qa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query, model: generalModel }),
        });
        const data = await res.json();

        if (!res.ok) {
          const errorDetail = data.details
            ? typeof data.details === "string"
              ? data.details
              : JSON.stringify(data.details, null, 2)
            : null;
          setError(
            `${data.error || "Error desconocido."}${errorDetail ? `\n\nDetalles: ${errorDetail}` : ""}`
          );
          return;
        }

        const nextAnswer = data.answer || "";
        const nextMeta: CallMeta = {
          model: data.model || generalModel,
          requestedAt: data.requestedAt || new Date().toISOString(),
          usage: data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
        };
        setAnswer(nextAnswer);
        setLastCallMeta(nextMeta);
        persistState(query, nextAnswer, nextMeta);
      } catch {
        setError("Error de conexion. Verifica tu red e intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [question, generalModel, persistState]
  );

  const handleReset = useCallback(async () => {
    setQuestion("");
    setAnswer("");
    setError("");
    setLastCallMeta(null);
    try {
      await fetch("/api/justification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearGeneralQa: true }),
      });
    } catch {
      // Best-effort
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Consulta General
          </CardTitle>
          <CardDescription>
            Pregunta lo que necesites sobre cualquier tema. Las respuestas son
            claras y breves por defecto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model selector */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Modelo
              </p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Consulta</span>
                <select
                  value={generalModel}
                  onChange={(e) => onGeneralModelChange(e.target.value)}
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                >
                  {GENERAL_MODEL_PROFILES.map((profile) => (
                    <option key={profile.value} value={profile.value}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <Textarea
            placeholder="Ej: Cual es la capital de Australia? · Resume que es la pileta de hilos en 2 frases."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[100px] text-sm leading-relaxed"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAsk();
              }
            }}
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {question.length} caracteres · Ctrl+Enter para enviar
            </p>
            <Button
              onClick={() => handleAsk()}
              disabled={loading || question.trim().length < 2}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  Consultar
                  <Send className="size-4" />
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm whitespace-pre-wrap break-words">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      {loading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      )}

      {/* Answer */}
      {answer && !loading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-500" />
                Respuesta
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <RotateCcw className="size-3.5" />
                Limpiar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-background overflow-hidden">
              <p className="px-5 py-5 text-base md:text-lg leading-relaxed md:leading-loose whitespace-pre-wrap">
                {answer}
              </p>
            </div>
            {lastCallMeta && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-3">
                  <span><strong>Modelo:</strong> {lastCallMeta.model}</span>
                  <span><strong>Tokens:</strong> {lastCallMeta.usage.totalTokens}</span>
                  <span><strong>Prompt:</strong> {lastCallMeta.usage.promptTokens}</span>
                  <span><strong>Completion:</strong> {lastCallMeta.usage.completionTokens}</span>
                  <span><strong>Costo:</strong> ${lastCallMeta.usage.cost.toFixed(4)}</span>
                  <span><strong>Hora:</strong> {new Date(lastCallMeta.requestedAt).toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
