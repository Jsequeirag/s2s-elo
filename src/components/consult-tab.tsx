"use client";

import { useState, useCallback } from "react";
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
  HelpCircle,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

const EXAMPLE_QUESTIONS = [
  "Si el audio se corto al final de un turno, afecta naturalness o dynamics?",
  "Cuando debo marcar Tech Issues?",
  "Cuando es correcto usar Tie en audio quality?",
  "Que hago si el modelo sono falso pero completo la tarea?",
  "Cual es la diferencia entre Task Success fail y Naturalness?",
  "Como manejo los clics menores en la justificacion?",
];

const QA_MODEL_PROFILES = [
  { label: "QA económico", value: "openai/gpt-4o-mini" },
  { label: "Más fuerte", value: "openai/gpt-4o" },
];

export default function ConsultTab({
  qaModel,
  onQaModelChange,
}: {
  qaModel: string;
  onQaModelChange: (value: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastCallMeta, setLastCallMeta] = useState<{
    model: string;
    requestedAt: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost: number;
    };
  } | null>(null);

  const handleAsk = useCallback(
    async (q?: string) => {
      const query = (q ?? question).trim();
      if (query.length < 5) {
        setError("La pregunta debe tener al menos 5 caracteres.");
        return;
      }
      setError("");
      setLoading(true);
      setAnswer("");

      try {
        const res = await fetch("/api/qa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query, model: qaModel }),
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

        setAnswer(data.answer || "");
        setLastCallMeta({
          model: data.model || qaModel,
          requestedAt: data.requestedAt || new Date().toISOString(),
          usage: data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
        });
      } catch {
        setError("Error de conexion. Verifica tu red e intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [question, qaModel]
  );


  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="size-5 text-primary" />
            Consulta sobre la Guia
          </CardTitle>
          <CardDescription>
            Pregunta cualquier duda sobre como evaluar, que dimension usar o
            como aplicar las reglas. La respuesta se basa en la Instruction y
            Guia oficiales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Modelo de consulta
              </p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Consulta</span>
                <select
                  value={qaModel}
                  onChange={(e) => onQaModelChange(e.target.value)}
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                >
                  {QA_MODEL_PROFILES.map((profile) => (
                    <option key={profile.value} value={profile.value}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <Textarea
            placeholder="Ej: Si el modelo se reinicio en el turno 3, debo marcar Tech Issues? Afecta la naturalidad?"
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
              disabled={loading || question.trim().length < 5}
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

          {/* Example questions */}
          {!answer && !loading && !error && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="size-3.5" />
                Preguntas frecuentes
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setQuestion(ex);
                      handleAsk(ex);
                    }}
                    className="text-xs text-left px-3 py-1.5 rounded-lg border bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

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
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      )}

      {/* Answer */}
      {answer && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="size-5 text-emerald-500" />
              Respuesta
            </CardTitle>
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
