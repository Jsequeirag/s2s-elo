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

const MAX_PREVIEW_WIDTH = 1200;
const MODEL_PROFILES = [
  { label: "QA económico", value: "openai/gpt-4o-mini" },
  { label: "Visión / imagen", value: "openai/gpt-4o-mini" },
  { label: "Más fuerte", value: "openai/gpt-4o" },
];

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo convertir la imagen a data URL."));
    reader.readAsDataURL(blob);
  });
}

async function resizeImageForUpload(file: File, maxWidth = MAX_PREVIEW_WIDTH) {
  const sourceDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = sourceDataUrl;
  });

  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar el canvas para redimensionar la imagen.");
  }

  context.drawImage(image, 0, 0, width, height);

  const resizedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  if (!resizedBlob) {
    throw new Error("No se pudo exportar la imagen redimensionada.");
  }

  const resizedDataUrl = await blobToDataUrl(resizedBlob);
  return { blob: resizedBlob, dataUrl: resizedDataUrl };
}

export default function ConsultTab() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageProcessing, setImageProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODEL_PROFILES[0].value);

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
          body: JSON.stringify({ question: query, model: selectedModel }),
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
    [question, selectedModel]
  );

  const handleAnalyzeImage = useCallback(async () => {
    if (!imageDataUrl) {
      setError("Primero toma o selecciona una imagen.");
      return;
    }

    setError("");
    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:
            question.trim() ||
            "Analiza la descripcion visible del campo Rationale en la imagen. Evalua si es especifica, concreta, concisa y apoyada en evidencia observable. Responde en espanol con un JSON valido.",
          imageDataUrl,
          model: selectedModel,
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

      setAnswer(data.answer || "");
    } catch {
      setError("Error de conexion. Verifica tu red e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [imageDataUrl, question, selectedModel]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageCapture = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setImageProcessing(true);
      setError("");

      const { blob, dataUrl } = await resizeImageForUpload(file, MAX_PREVIEW_WIDTH);
      const previewUrl = URL.createObjectURL(blob);
      setImagePreview((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return previewUrl;
      });
      setImageDataUrl(dataUrl);
      setImageName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo preparar la imagen.");
    } finally {
      setImageProcessing(false);
    }
  }, []);

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
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Captura de la descripcion de Rationale
              </p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Perfil</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                >
                  {MODEL_PROFILES.map((profile) => (
                    <option key={profile.value} value={profile.value}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted/60">
              <span>{imageProcessing ? "Redimensionando foto..." : "Abrir camara / seleccionar captura"}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageCapture}
              />
              <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                Camara
              </span>
            </label>
            {imagePreview && (
              <div className="space-y-2">
                <img
                  src={imagePreview}
                  alt={imageName || "Foto preparada para analisis"}
                  className="max-h-72 w-full rounded-md border object-cover"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Imagen preparada para envio. Se redimensiona automaticamente a un ancho maximo de 1200 px.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAnalyzeImage}
                    disabled={loading || !imageDataUrl}
                  >
                    Analizar imagen
                  </Button>
                </div>
              </div>
            )}
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
