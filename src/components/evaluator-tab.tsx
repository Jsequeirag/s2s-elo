"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Loader2,
  BookOpen,
  ClipboardList,
  ArrowRight,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import {
  type AnalysisResult,
  DIMENSION_LABELS,
  DIMENSION_DESCRIPTIONS,
} from "@/components/types";

function DimensionRadio({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const options = [
    { label: "A", value: "A", color: "border-emerald-500 text-emerald-600" },
    { label: "Tie", value: "Tie", color: "border-amber-500 text-amber-600" },
    { label: "B", value: "B", color: "border-sky-500 text-sky-600" },
  ];

  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs font-semibold rounded-md border-2 transition-all cursor-pointer ${value === opt.value
            ? `${opt.color} bg-current/10`
            : "border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TaskSuccessBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    pass: { label: "Pass", variant: "default" },
    partial: { label: "Partial", variant: "secondary" },
    fail: { label: "Fail", variant: "destructive" },
  };
  const c = config[status] || config.pass;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export default function EvaluatorTab({
  analyzeModel,
  onAnalyzeModelChange,
}: {
  analyzeModel: string;
  onAnalyzeModelChange: (value: string) => void;
}) {
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Track the justification text at the time of the last analysis for saving
  const justificationAtAnalysis = useRef("");

  // Load saved justification on mount
  useEffect(() => {
    if (loaded) return;
    (async () => {
      try {
        const res = await fetch("/api/justification");
        const json = await res.json();
        if (res.ok && json.data) {
          setJustification(json.data.justification);
          setResult(json.data.analysis as AnalysisResult);
          justificationAtAnalysis.current = json.data.justification;
        }
      } catch {
        // Silently fail — if there's no saved data, start fresh
      } finally {
        setLoaded(true);
      }
    })();
  }, [loaded]);

  // Persist result + justification to MongoDB
  const persist = useCallback(async (jText: string, analysis: AnalysisResult) => {
    try {
      await fetch("/api/justification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justification: jText, analysis }),
      });
    } catch {
      // Best-effort persistence
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (justification.trim().length < 20) {
      setError("La justificacion debe tener al menos 20 caracteres.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justification: justification.trim(), model: analyzeModel }),
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
      justificationAtAnalysis.current = justification.trim();
      // Persist after successful analysis
      persist(justification.trim(), data);
    } catch {
      setError("Error de conexion. Verifica tu red e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [analyzeModel, justification, persist]);

  const updateDimension = (key: string, value: string) => {
    if (!result) return;
    const updated = {
      ...result,
      dimensions: { ...result.dimensions, [key]: value },
    };
    setResult(updated);
    persist(justificationAtAnalysis.current, updated);
  };

  const updateSubdimension = (
    id: string,
    model: "A" | "B",
    checked: boolean
  ) => {
    if (!result) return;
    const updated = {
      ...result,
      subdimensions: result.subdimensions.map((s) =>
        s.id === id ? { ...s, [model]: checked } : s
      ),
    };
    setResult(updated);
    persist(justificationAtAnalysis.current, updated);
  };

  const updateTechIssues = (model: "A" | "B", checked: boolean) => {
    if (!result) return;
    const updated = {
      ...result,
      techIssues: { ...result.techIssues, [model]: checked },
    };
    setResult(updated);
    persist(justificationAtAnalysis.current, updated);
  };

  const handleReset = useCallback(async () => {
    setJustification("");
    setResult(null);
    setError("");
    justificationAtAnalysis.current = "";
    // Clear persisted justification
    try {
      await fetch("/api/justification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
    } catch {
      // Best-effort
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Justificacion (Espanol)</CardTitle>
          <CardDescription>
            Escribe tu justificacion de evaluacion. El sistema la traducira al
            ingles, la fortalecera segun las reglas de Instruction y determinara
            los votos correspondientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={
              'Ej: Prefiero el Modelo B porque su tono cambio de empathico a indignado cuando le di mas detalles, se adapto al contexto emocional. El Modelo A se mantuvo plano. Ambos tuvieron clics menores que no afectaron la comprension...'
            }
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="min-h-[140px] text-sm leading-relaxed"
            disabled={loading}
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {justification.length} caracteres
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={loading || justification.trim().length < 20}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  Analizar Justificacion
                  <ArrowRight className="size-4" />
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {result.model && result.requestedAt && result.usage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Consumo de llamada</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span><strong>Modelo:</strong> {result.model}</span>
                  <span><strong>Tokens:</strong> {result.usage.totalTokens}</span>
                  <span><strong>Prompt:</strong> {result.usage.promptTokens}</span>
                  <span><strong>Completion:</strong> {result.usage.completionTokens}</span>
                  <span><strong>Costo:</strong> ${result.usage.cost.toFixed(4)}</span>
                  <span><strong>Hora:</strong> {new Date(result.requestedAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strengthened Justification */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  Justificacion Fortalecida (Ingles)
                </CardTitle>
                <Badge
                  variant={
                    result.charCount >= 300 && result.charCount <= 450
                      ? "default"
                      : "destructive"
                  }
                >
                  {result.charCount} chars
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-background overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Texto para transcribir
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        result.strengthenedJustification
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <ClipboardList className="size-3.5" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                <p className="px-5 py-5 text-lg md:text-xl leading-relaxed md:leading-loose font-serif">
                  {result.strengthenedJustification}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-200">
                <p className="font-medium mb-1">Diagnostico de Auditoria:</p>
                <p>{result.diagnosis}</p>
              </div>
            </CardContent>
          </Card>

          {/* Dimensions + Task Success + Tech Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CircleDot className="size-5 text-primary" />
                Dimensiones de Evaluacion
              </CardTitle>
              <CardDescription>
                Votos por dimension segun la justificacion. Puedes ajustarlos
                manualmente si es necesario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_100px_100px_100px] gap-2 px-4 py-2.5 bg-muted/80 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>Dimension</span>
                  <span className="text-center">A</span>
                  <span className="text-center">Tie</span>
                  <span className="text-center">B</span>
                </div>

                {(
                  Object.entries(DIMENSION_LABELS) as [string, string][]
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_100px_100px_100px] gap-2 px-4 py-3 border-t items-center"
                  >
                    <div className="pr-2">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {DIMENSION_DESCRIPTIONS[key]}
                      </p>
                    </div>
                    <div className="col-span-3 md:col-span-3 flex justify-center">
                      <DimensionRadio
                        value={
                          result.dimensions[
                          key as keyof typeof result.dimensions
                          ]
                        }
                        onChange={(val) => updateDimension(key, val)}
                      />
                    </div>
                  </div>
                ))}

                {/* Task Success Row */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_100px_100px_100px] gap-2 px-4 py-3 border-t items-center">
                  <div className="pr-2">
                    <p className="text-sm font-medium">Task Success</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cumplimiento de la tarea del escenario
                    </p>
                  </div>
                  <div className="text-center">
                    <TaskSuccessBadge status={result.taskSuccess.A} />
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    —
                  </div>
                  <div className="text-center">
                    <TaskSuccessBadge status={result.taskSuccess.B} />
                  </div>
                </div>

                {/* Tech Issues Row */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_100px_100px_100px] gap-2 px-4 py-3 border-t items-center bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="pr-2">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 text-amber-500" />
                      Tech Issues
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Clics, reinicios, pausas anormales o cortes
                    </p>
                  </div>
                  <div className="text-center">
                    <Checkbox
                      checked={result.techIssues.A}
                      onCheckedChange={(c) => updateTechIssues("A", !!c)}
                      className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                  </div>
                  <div />
                  <div className="text-center">
                    <Checkbox
                      checked={result.techIssues.B}
                      onCheckedChange={(c) => updateTechIssues("B", !!c)}
                      className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subdimensions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" />
                <div>
                  <CardTitle className="text-lg">
                    Check if Present — Subdimensiones
                  </CardTitle>
                  <CardDescription>
                    Marca las casillas segun la justificacion del evaluador.
                    Problemas observados en cada modelo.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_48px_48px] gap-2 px-4 py-2.5 bg-muted/80 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>Criterio</span>
                  <span className="text-center">A</span>
                  <span className="text-center">B</span>
                </div>

                {result.subdimensions.map((sub) => (
                  <div
                    key={sub.id}
                    className={`grid grid-cols-[1fr_48px_48px] gap-2 px-4 py-3 border-t items-start ${sub.A || sub.B ? "bg-destructive/5" : ""
                      }`}
                  >
                    <div className="pr-2">
                      <p className="text-sm font-medium leading-snug">
                        {sub.label}
                        {sub.hasInfo && (
                          <span className="inline-flex items-center justify-center ml-1.5 size-4 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            7
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {sub.question}
                      </p>
                    </div>
                    <div className="flex justify-center pt-1">
                      <Checkbox
                        checked={sub.A}
                        onCheckedChange={(c) =>
                          updateSubdimension(sub.id, "A", !!c)
                        }
                        className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                      />
                    </div>
                    <div className="flex justify-center pt-1">
                      <Checkbox
                        checked={sub.B}
                        onCheckedChange={(c) =>
                          updateSubdimension(sub.id, "B", !!c)
                        }
                        className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                      />
                    </div>
                  </div>
                ))}
              </div>
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
              Analizar Otra Justificacion
            </Button>
          </div>

          {/* Guide Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="size-5 text-muted-foreground" />
                Guia de Referencia
              </CardTitle>
              <CardDescription>
                Resumen de la guia de evaluacion para consulta rapida.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="workflow">
                  <AccordionTrigger className="text-sm font-medium">
                    Flujo de Trabajo
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground space-y-2">
                    <p><strong>1. Configuracion de Audio:</strong> Usa auriculares estereo. Escucha el clip completo.</p>
                    <p><strong>2. Iniciar Conversacion:</strong> Revisa el Escenario y "Que Hacer". Usa tus propias palabras naturales.</p>
                    <p><strong>3. Interaccion:</strong> Minimo 4 turnos. Consistencia 1:1 con ambos modelos. Prueba interrupciones.</p>
                    <p><strong>4. Calificar:</strong> Califica cada dimension con justificacion especifica. Selecciona Error Clusters.</p>
                    <p><strong>5. Enviar Voto:</strong> Revisa coherencia entre preferencia, ratings y justificacion.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="hierarchy">
                  <AccordionTrigger className="text-sm font-medium">
                    Jerarquia de Dimensiones
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>1</Badge>
                      <span><strong>Naturalness/Engagement</strong> — Prioridad maxima</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">2</Badge>
                      <span><strong>Utility</strong> — Criterio secundario (umbral)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">3</Badge>
                      <span><strong>Audio Quality</strong> — Umbral, evaluar con lenidad</span>
                    </div>
                    <p className="mt-2">Utility y Audio Quality operan como umbral: ambos deben cumplir un minimo aceptable. Si ambos pasan, la decision se basa en trade-offs.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="formula">
                  <AccordionTrigger className="text-sm font-medium">
                    Formula de Justificacion
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground space-y-2">
                    <p className="italic p-2 rounded bg-muted/50">"Elegi [Modelo] porque [dimension] fue mas fuerte. En [timestamp/turno/frase], [comportamiento observable], lo cual importo porque [impacto en el usuario]. El otro modelo [trade-off o debilidad breve]."</p>
                    <p>Debe ser: <strong>especifica</strong> (timestamps, turnos), <strong>concreta</strong> (evidencia observable) y <strong>concisa</strong> (4-6 oraciones).</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tradeoffs">
                  <AccordionTrigger className="text-sm font-medium">
                    Guia de Trade-Offs
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground space-y-1.5">
                    <p><strong>Empatia sin accion:</strong> Mas debil cuando el usuario queria ayuda concreta (fallo en Utility).</p>
                    <p><strong>Respuesta pulida pero ignora algo:</strong> Mas debil: desvio de la intencion.</p>
                    <p><strong>Tecnicamente correcto pero responde otra pregunta:</strong> Mas debil que una respuesta simple que responda directamente.</p>
                    <p><strong>Ambas fuertes en dimensiones distintas:</strong> Elige segun la necesidad principal del usuario.</p>
                    <p><strong>Ambas defectuosas:</strong> Elige la que falla menos criticamente.</p>
                    <p><strong>Correcto pero robotico vs impreciso pero natural:</strong> El natural y util suele ganar.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="errors">
                  <AccordionTrigger className="text-sm font-medium">
                    Errores Comunes a Evitar
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground space-y-1.5">
                    <p><strong>Audio:</strong> No marcar "Both Good" cuando un modelo tiene artefactos claros.</p>
                    <p><strong>Contradiccion:</strong> La justificacion no coincide con la preferencia seleccionada.</p>
                    <p><strong>No detectar problemas:</strong> Ignorar naturalidad robotica, cortes, o alucinaciones.</p>
                    <p><strong>Enfoque inconsistente:</strong> Dar turnos o temas diferente a cada modelo.</p>
                    <p><strong>No marcar Error Clusters:</strong> Omitir checklists de errores observables.</p>
                    <p><strong>Malinterpretar escenario:</strong> No entender que un modelo discrepando puede ser positivo.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="audio-defects">
                  <AccordionTrigger className="text-sm font-medium">
                    Taxonomia de Defectos de Audio
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground space-y-1.5">
                    <p><strong>Warbling / Aliasing:</strong> Tartamudeos, repeticiones. No penalizar si es leve.</p>
                    <p><strong>Ticks / Clicks:</strong> Sonidos impulsivos no-voz o chasquidos labiales excesivos.</p>
                    <p><strong>Ruido Sintetico:</strong> Ruido mecanico/artificial en el fondo.</p>
                    <p><strong>Distorsion:</strong> Voz suena dura, aplastada o sobrecargada.</p>
                    <p><strong>Plosivas:</strong> Explosiones de aire en p, b, t, h, f.</p>
                    <p><strong>Sibilancia Harsh:</strong> Sonidos s/sh agudos o penetrantes.</p>
                    <p><strong>Reverberacion:</strong> Sonido ecoico, distante o demasiado reflectivo.</p>
                    <p><strong>Corte al Final:</strong> Voz truncada abruptamente.</p>
                    <p><strong>Cambio de Identidad Vocal:</strong> Timbre cambia inesperadamente.</p>
                    <p><strong>Solapamiento por Busqueda:</strong> Glitches antes/durante/despues de busqueda web.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
