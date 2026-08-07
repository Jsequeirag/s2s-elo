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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Upload,
  ImageIcon,
  AlertCircle,
  RotateCcw,
  Copy,
  Check,
  MessageSquare,
} from "lucide-react";

interface DialogTurn {
  number: number;
  speaker?: string;
  text: string;
}

interface DialogResult {
  scenarioType: string;
  scenario?: string;
  scenarioDescription?: string;
  userRole?: string;
  skillsTested?: string[];
  turns: DialogTurn[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  model: string;
  requestedAt: string;
}

const SCENARIO_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  customer_service: { label: "Atencion al Cliente", variant: "default" },
  scheduling: { label: "Agendamiento", variant: "secondary" },
  information: { label: "Informacion", variant: "secondary" },
  troubleshooting: { label: "Soporte Tecnico", variant: "destructive" },
  sales: { label: "Ventas", variant: "default" },
  emergency: { label: "Emergencia", variant: "destructive" },
  creative: { label: "Creativo", variant: "secondary" },
};

export default function DialogTab({
  dialogModel,
  onDialogModelChange,
}: {
  dialogModel: string;
  onDialogModelChange: (value: string) => void;
}) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DialogResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved dialogue on mount
  useEffect(() => {
    if (loaded) return;
    (async () => {
      try {
        const res = await fetch("/api/justification");
        const json = await res.json();
        if (res.ok && json.data?.dialogue) {
          setResult(json.data.dialogue as DialogResult);
        }
      } catch {
        // Silently fail
      } finally {
        setLoaded(true);
      }
    })();
  }, [loaded]);

  // Persist dialogue to MongoDB
  const persist = useCallback(async (dialogue: DialogResult) => {
    try {
      await fetch("/api/justification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dialogue }),
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

        // Resize/compress large images (especially phone photos)
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 2560;
          const QUALITY = 0.85;

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

  const handleGenerate = useCallback(async () => {
    if (!imageDataUrl) return;
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/dialog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, model: dialogModel }),
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
      persist(data);
    } catch {
      setError("Error de conexion. Verifica tu red e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [imageDataUrl, dialogModel, persist]);

  const handleCopyTurn = useCallback(async (turnIndex: number) => {
    if (!result) return;
    const turn = result.turns[turnIndex];
    if (!turn) return;
    await navigator.clipboard.writeText(turn.text);
    setCopied(turnIndex);
    setTimeout(() => setCopied(null), 1500);
  }, [result]);

  const handleCopyAll = useCallback(async () => {
    if (!result) return;
    const fullText = result.turns
      .map((t) => `[${t.speaker || "Turno"} ${t.number}] ${t.text}`)
      .join("\n\n");
    await navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }, [result]);

  const handleReset = useCallback(async () => {
    setImagePreview(null);
    setImageDataUrl(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Clear persisted dialogue
    try {
      await fetch("/api/justification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearDialogue: true }),
      });
    } catch {
      // Best-effort
    }
  }, []);

  const scenarioInfo = result
    ? SCENARIO_LABELS[result.scenarioType] || {
        label: result.scenarioType,
        variant: "secondary" as const,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            Generar Dialogo
          </CardTitle>
          <CardDescription>
            Sube la imagen de un escenario &quot;What to do&quot; y genera un guion
            de dialogo en espanol para evaluacion S2S Arena.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model selector */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Modelo de generacion
              </p>
              <div className="flex items-center gap-2">
                <ImageIcon className="size-3.5 text-muted-foreground" />
                <input
                  value={dialogModel}
                  onChange={(e) => onDialogModelChange(e.target.value)}
                  className="rounded-md border bg-background px-2 py-1 text-xs w-full md:w-auto md:min-w-[220px]"
                  placeholder="openai/gpt-4o-mini"
                />
              </div>
            </div>
          </div>

          {/* Image upload area */}
          <div
            className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
              imagePreview
                ? "border-primary/50"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
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
                  alt="Escenario What to do"
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
                  PNG, JPG, WebP — captura de pantalla con escenario &quot;What to do&quot;
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="size-4" />
              Limpiar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={loading || !imageDataUrl}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <MessageSquare className="size-4" />
                  Generar Dialogo
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
            <Skeleton className="h-4 w-36" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && !loading && (
        <>
          {/* Scenario Type Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="size-5 text-emerald-500" />
                Guion Generado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scenarioInfo && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={scenarioInfo.variant}>
                    {scenarioInfo.label}
                  </Badge>
                  {result.scenario && (
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {result.scenario}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {result.turns.length} turnos
                  </span>
                </div>
              )}

              {result.scenario && (
                <p className="text-[11px] text-muted-foreground/70 italic">
                  El SCENARIO es solo informativo (extraido de la imagen). No
                  afecta la generacion del dialogo.
                </p>
              )}

              {result.scenarioDescription && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    WHAT TO DO
                  </p>
                  <p className="text-sm leading-relaxed">
                    {result.scenarioDescription}
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {result.userRole && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      User Role
                    </p>
                    <p className="text-sm">{result.userRole}</p>
                  </div>
                )}
                {result.skillsTested && result.skillsTested.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Skills Tested
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.skillsTested.map((skill, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Copy all button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAll}
                  className="gap-2 text-xs"
                >
                  {copiedAll ? (
                    <>
                      <Check className="size-3.5" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copiar todo
                    </>
                  )}
                </Button>
              </div>

              {/* Turn cards */}
              <div className="space-y-3">
                {result.turns.map((turn, idx) => (
                  <div
                    key={turn.number}
                    className={`rounded-lg border p-4 ${
                      turn.speaker === "usuario"
                        ? "bg-blue-50/50 border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-800/40"
                        : "bg-emerald-50/50 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {turn.speaker === "usuario" ? "Usuario" : "Asistente"}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {turn.number}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyTurn(idx)}
                        className="gap-1 text-xs h-7 px-2"
                      >
                        {copied === idx ? (
                          <>
                            <Check className="size-3" />
                            OK
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed">{turn.text}</p>
                  </div>
                ))}
              </div>

              {/* Usage */}
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-3">
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
                    <strong>Completion:</strong> {result.usage.completionTokens}
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
