"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Upload,
  ImageIcon,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  GitCompareArrows,
} from "lucide-react";

interface ImageErrorItem {
  original: string;
  corrected: string;
  reason: string;
  position: number;
}

interface ComparisonDifference {
  rationale: string;
  justification: string;
  impact: string;
}

interface ComparisonResult {
  coherence: string;
  summary: string;
  differences?: ComparisonDifference[];
}

interface ImageResult {
  answer: string;
  detectedText?: string;
  correctedText?: string;
  errors?: ImageErrorItem[];
  comparison?: ComparisonResult;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  model: string;
  requestedAt: string;
}

export default function ImageTab({
  imageModel,
  onImageModelChange,
}: {
  imageModel: string;
  onImageModelChange: (value: string) => void;
}) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved image analysis on mount
  useEffect(() => {
    if (loaded) return;
    (async () => {
      try {
        const res = await fetch("/api/justification");
        const json = await res.json();
        if (res.ok && json.data?.imageAnalysis) {
          setResult(json.data.imageAnalysis as ImageResult);
        }
      } catch {
        // Silently fail — if there's no saved data, start fresh
      } finally {
        setLoaded(true);
      }
    })();
  }, [loaded]);

  // Persist image analysis to MongoDB
  const persist = useCallback(async (analysis: ImageResult) => {
    try {
      await fetch("/api/justification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageAnalysis: analysis }),
      });
    } catch {
      // Best-effort persistence
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("Selecciona un archivo de imagen valido (PNG, JPG, etc.).");
        return;
      }

      setError("");
      setResult(null);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImageDataUrl(dataUrl);
        setImagePreview(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleAnalyze = useCallback(async () => {
    if (!imageDataUrl) {
      setError("Primero selecciona una imagen.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          question: question.trim() || undefined,
          model: imageModel,
        }),
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

      setResult(data);
      // Persist after successful analysis
      persist(data);
    } catch {
      setError("Error de conexion. Verifica tu red e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [imageDataUrl, question, imageModel, persist]);

  const handleReset = useCallback(async () => {
    setImagePreview(null);
    setImageDataUrl(null);
    setQuestion("");
    setResult(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Clear persisted image analysis
    try {
      await fetch("/api/justification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearImage: true }),
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
            <ImageIcon className="size-5 text-primary" />
            Analizar Imagen de Rationale
          </CardTitle>
          <CardDescription>
            Sube una captura de pantalla con una seccion "Rationale". El sistema
            extraera el texto, corregira errores ortograficos y listara los
            errores encontrados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model selector */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Modelo de imagen
              </p>
              <input
                value={imageModel}
                onChange={(e) => onImageModelChange(e.target.value)}
                className="rounded-md border bg-background px-2 py-1 text-xs w-full md:w-auto md:min-w-[220px]"
                placeholder="openai/gpt-4o-mini"
              />
            </div>
          </div>

          {/* Image upload area */}
          <div
            className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer ${imagePreview ? "border-primary/50" : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Captura de pantalla"
                  className="max-h-64 w-full object-contain rounded-lg"
                />
                <p className="absolute bottom-2 right-2 text-xs bg-background/80 rounded px-2 py-1 text-muted-foreground">
                  Click para cambiar
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Upload className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Toma una foto o selecciona una imagen
                </p>
                <p className="text-xs text-muted-foreground/60">
                  PNG, JPG, WebP — captura de pantalla con seccion Rationale
                </p>
              </div>
            )}
          </div>

          {/* Optional question */}
          <Textarea
            placeholder="Pregunta opcional (por defecto: extraer y corregir el Rationale)"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[80px] text-sm"
            disabled={loading}
          />

          <div className="flex items-center justify-end gap-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="size-4" />
              Limpiar
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={loading || !imageDataUrl}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  Analizar Imagen
                  <ImageIcon className="size-4" />
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
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Main summary card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  Analisis Completado
                </CardTitle>
                {result.comparison && (
                  <Badge
                    variant={
                      result.comparison.coherence === "alta"
                        ? "default"
                        : result.comparison.coherence === "media"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    Coherencia {result.comparison.coherence}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comparison summary (natural text) */}
              {result.comparison?.summary ? (
                <p className="text-sm leading-relaxed text-foreground">
                  {result.comparison.summary}
                </p>
              ) : result.correctedText ? (
                <p className="text-sm leading-relaxed text-foreground">
                  Se detectaron {result.errors?.length || 0} error
                  {(result.errors?.length || 0) !== 1 ? "es" : ""} ortografico
                  {(result.errors?.length || 0) !== 1 ? "s" : ""} en el texto del
                  Rationale.
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-foreground">
                  {result.answer}
                </p>
              )}

              {/* Key differences (always visible, not collapsed) */}
              {result.comparison?.differences &&
                result.comparison.differences.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Diferencias con la justificacion guardada
                    </p>
                    {result.comparison.differences.map((diff, i) => (
                      <div
                        key={i}
                        className="rounded-lg border p-3 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            Impacto{" "}
                            <Badge
                              variant={
                                diff.impact === "alto"
                                  ? "destructive"
                                  : diff.impact === "medio"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="ml-1 text-[10px]"
                            >
                              {diff.impact}
                            </Badge>
                          </span>
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-2 text-sm">
                          <div>
                            <span className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-semibold">
                              Rationale
                            </span>
                            <p className="text-amber-700 dark:text-amber-400">
                              {diff.rationale}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-blue-600 dark:text-blue-400 font-semibold">
                              Justificacion
                            </span>
                            <p className="text-blue-700 dark:text-blue-400">
                              {diff.justification}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* Collapsible: corrected text */}
              {result.correctedText && (
                <details className="group rounded-lg border">
                  <summary className="flex items-center justify-between cursor-pointer px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors select-none">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      Texto corregido
                      {result.errors && result.errors.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {result.errors.length} correcciones
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-1">
                    <div className="rounded-md bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {result.correctedText}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() =>
                          navigator.clipboard?.writeText(
                            result.correctedText || ""
                          )
                        }
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                </details>
              )}

              {/* Collapsible: spelling errors table */}
              {result.errors && result.errors.length > 0 && (
                <details className="group rounded-lg border">
                  <summary className="flex items-center justify-between cursor-pointer px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors select-none">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="size-4 text-amber-500" />
                      Detalle de errores ortograficos
                    </span>
                    <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-1">
                    <div className="space-y-1.5">
                      {result.errors.map((err, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm py-1"
                        >
                          <Badge
                            variant="outline"
                            className="w-5 h-5 justify-center text-[10px] p-0"
                          >
                            {err.position}
                          </Badge>
                          <span className="text-destructive line-through">
                            {err.original}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            →
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {err.corrected}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              {/* Collapsible: original detected text */}
              {result.detectedText && (
                <details className="group rounded-lg border">
                  <summary className="flex items-center justify-between cursor-pointer px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors select-none">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="size-4 text-muted-foreground" />
                      Texto original detectado
                    </span>
                    <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-1">
                    <div className="rounded-md bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {result.detectedText}
                    </div>
                  </div>
                </details>
              )}

              {/* Collapsible: usage */}
              {result.model && result.requestedAt && result.usage && (
                <details className="group rounded-lg border">
                  <summary className="flex items-center justify-between cursor-pointer px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors select-none">
                    <span>Consumo de llamada</span>
                    <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-1">
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>
                        <strong>Modelo:</strong> {result.model}
                      </span>
                      <span>
                        <strong>Tokens:</strong> {result.usage.totalTokens}
                      </span>
                      <span>
                        <strong>Prompt:</strong> {result.usage.promptTokens}
                      </span>
                      <span>
                        <strong>Completion:</strong>{" "}
                        {result.usage.completionTokens}
                      </span>
                      <span>
                        <strong>Costo:</strong> ${result.usage.cost.toFixed(4)}
                      </span>
                      <span>
                        <strong>Hora:</strong>{" "}
                        {new Date(result.requestedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>

          {/* Reset Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="size-4" />
              Analizar Otra Imagen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
