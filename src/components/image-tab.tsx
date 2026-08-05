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
  Scissors,
  Type,
  ArrowLeftRight,
  Plus,
  Minus,
} from "lucide-react";

type DeviationType =
  | "ortografia"
  | "palabra_cortada"
  | "texto_faltante"
  | "texto_extra"
  | "orden";

interface Deviation {
  type: DeviationType;
  rationale: string;
  justification: string;
  reason: string;
}

interface ImageResult {
  detectedText: string;
  finalText: string;
  isIdentical: boolean;
  deviations: Deviation[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  model: string;
  requestedAt: string;
}

const DEVIATION_META: Record<
  DeviationType,
  { label: string; icon: typeof Type; color: string }
> = {
  ortografia: {
    label: "Ortografia",
    icon: Type,
    color: "text-amber-600 dark:text-amber-400",
  },
  palabra_cortada: {
    label: "Palabra cortada",
    icon: Scissors,
    color: "text-orange-600 dark:text-orange-400",
  },
  texto_faltante: {
    label: "Texto faltante",
    icon: Minus,
    color: "text-red-600 dark:text-red-400",
  },
  texto_extra: {
    label: "Texto extra",
    icon: Plus,
    color: "text-blue-600 dark:text-blue-400",
  },
  orden: {
    label: "Orden diferente",
    icon: ArrowLeftRight,
    color: "text-purple-600 dark:text-purple-400",
  },
};

/**
 * Renders a string with **bold** or *italic* markdown segments as <strong> elements.
 * Handles both **double asterisk** and *single asterisk* markers since the model
 * is inconsistent about which it returns.
 */
function renderMarkdownBold(text: string) {
  // Match **bold** or *bold* (non-greedy, no nesting)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    // **double asterisk**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-emerald-700 dark:text-emerald-300">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // *single asterisk*
    if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      part.length > 2 &&
      !part.startsWith("**")
    ) {
      return (
        <strong key={i} className="font-semibold text-emerald-700 dark:text-emerald-300">
          {part.slice(1, -1)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
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
          const saved = json.data.imageAnalysis;
          // Only load if it matches the current schema (has deviations + finalText).
          // Old saved analyses (answer/errors/comparison) are incompatible and ignored.
          if (
            typeof saved.finalText === "string" &&
            Array.isArray(saved.deviations)
          ) {
            setResult(saved as ImageResult);
          }
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
        const originalDataUrl = reader.result as string;

        // Resize/compress large images (especially phone photos) to avoid
        // Vercel body limits and OpenRouter size rejections.
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 2560; // max width/height in pixels
          const QUALITY = 0.85; // JPEG quality

          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setImageDataUrl(originalDataUrl);
            setImagePreview(originalDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL("image/jpeg", QUALITY);

          if (compressed.length < originalDataUrl.length) {
            setImageDataUrl(compressed);
            setImagePreview(compressed);
          } else {
            setImageDataUrl(originalDataUrl);
            setImagePreview(originalDataUrl);
          }
        };
        img.onerror = () => {
          setImageDataUrl(originalDataUrl);
          setImagePreview(originalDataUrl);
        };
        img.src = originalDataUrl;
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
    } catch (fetchError) {
      // Distinguish timeout (AbortController) from network errors
      const isTimeout = fetchError instanceof DOMException && fetchError.name === "TimeoutError";
      setError(
        isTimeout
          ? "La peticion tardo demasiado. La imagen puede ser muy grande o el modelo esta lento. Intenta de nuevo."
          : "Error de conexion. Verifica tu red e intenta de nuevo."
      );
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
            Sube una captura del campo "Rationale". Se compara contra la
            justificacion guardada (fuente de verdad) y se detectan
            desviaciones: errores de ortografia, palabras cortadas o texto
            faltante.
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
        (() => {
          const deviations = result.deviations || [];
          const isIdentical = result.isIdentical ?? deviations.length === 0;
          return (
        <div className="space-y-4">
          {/* Main summary card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {isIdentical ? (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="size-5 text-amber-500" />
                  )}
                  {isIdentical
                    ? "Rationale coincide con la justificacion"
                    : "Se encontraron desviaciones"}
                </CardTitle>
                <Badge
                  variant={
                    isIdentical
                      ? "default"
                      : deviations.length > 3
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {deviations.length} desviacion
                  {deviations.length !== 1 ? "es" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary text */}
              <p className="text-sm leading-relaxed text-foreground">
                {isIdentical
                  ? "El texto del Rationale extraido de la imagen es identico a la justificacion guardada. No se detectaron problemas."
                  : `El Rationale de la imagen tiene ${deviations.length} desviacion${deviations.length !== 1 ? "es" : ""} respecto a la justificacion (fuente de verdad). Revisa los detalles abajo.`}
              </p>

              {/* Deviations (always visible) */}
              {deviations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Desviaciones detectadas
                  </p>
                  {deviations.map((dev, i) => {
                    const meta = DEVIATION_META[dev.type];
                    const Icon = meta?.icon || AlertCircle;
                    return (
                      <div
                        key={i}
                        className="rounded-lg border p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`size-4 ${meta?.color || "text-muted-foreground"}`}
                          />
                          <Badge variant="outline" className="text-[10px]">
                            {meta?.label || dev.type}
                          </Badge>
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-2 text-sm">
                          <div>
                            <span className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-semibold">
                              En el Rationale
                            </span>
                            <p className="text-amber-700 dark:text-amber-400 line-through">
                              {dev.rationale}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-semibold">
                              Deberia ser
                            </span>
                            <p className="text-emerald-700 dark:text-emerald-400">
                              {dev.justification}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          {dev.reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Final text (= justification, the truth) */}
              <details className="group rounded-lg border" open={!result.isIdentical}>
                <summary className="flex items-center justify-between cursor-pointer px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors select-none">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    Texto correcto (justificacion)
                  </span>
                  <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-1">
                  <div className="rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {renderMarkdownBold(result.finalText)}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          result.finalText.replace(/\*\*/g, "").replace(/\*/g, "") || ""
                        )
                      }
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </details>

              {/* Collapsible: original detected text */}
              {result.detectedText && (
                <details className="group rounded-lg border">
                  <summary className="flex items-center justify-between cursor-pointer px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors select-none">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="size-4 text-muted-foreground" />
                      Rationale extraido de la imagen
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
          );
        })()
      )}
    </div>
  );
}
