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

export default function ConsultTab() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          body: JSON.stringify({ question: query }),
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
      } catch {
        setError("Error de conexion. Verifica tu red e intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [question]
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
          <CardContent>
            <div className="rounded-lg border bg-background overflow-hidden">
              <p className="px-5 py-5 text-base md:text-lg leading-relaxed md:leading-loose whitespace-pre-wrap">
                {answer}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
