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
  Info,
  RotateCcw,
} from "lucide-react";

interface Subdimension {
  id: string;
  label: string;
  question: string;
  hasInfo?: boolean;
  A: boolean;
  B: boolean;
}

interface AnalysisResult {
  strengthenedJustification: string;
  diagnosis: string;
  charCount: number;
  dimensions: {
    overall: string;
    naturalness: string;
    dynamics: string;
    instructionFollowing: string;
    utility: string;
    audioQuality: string;
  };
  taskSuccess: {
    A: string;
    B: string;
  };
  techIssues: {
    A: boolean;
    B: boolean;
  };
  subdimensions: Subdimension[];
}

const DIMENSION_LABELS: Record<string, string> = {
  overall: "Overall Preference",
  naturalness: "Naturalness / Engagement",
  dynamics: "Conversational Dynamics",
  instructionFollowing: "Instruction Following",
  utility: "Utility",
  audioQuality: "Audio Quality",
};

const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  overall:
    "Experiencia general combinando todos los criterios.",
  naturalness:
    "Si la respuesta suena humana, fluida y atractiva vs. robotica o repetitiva.",
  dynamics:
    "Manejo de turnos, pausas, interrupciones, backchannels, cambio de tono.",
  instructionFollowing:
    "Si el modelo entendio y ejecuto la intencion del usuario.",
  utility:
    "La respuesta debe ser correcta y usable para ser competitiva.",
  audioQuality:
    "Solo penaliza si hay artefactos evidentes (cortes, distorsion).",
};

function DimensionRadio({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
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
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs font-semibold rounded-md border-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
            value === opt.value
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

export default function Home() {
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
        body: JSON.stringify({ justification: justification.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errorDetail =
          data.details
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
    } catch {
      setError("Error de conexion. Verifica tu red e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [justification]);

  const updateDimension = (key: string, value: string) => {
    if (!result) return;
    setResult({
      ...result,
      dimensions: { ...result.dimensions, [key]: value },
    });
  };

  const updateSubdimension = (
    id: string,
    model: "A" | "B",
    checked: boolean
  ) => {
    if (!result) return;
    setResult({
      ...result,
      subdimensions: result.subdimensions.map((s) =>
        s.id === id ? { ...s, [model]: checked } : s
      ),
    });
  };

  const updateTaskSuccess = (
    model: "A" | "B",
    value: "pass" | "partial" | "fail"
  ) => {
    if (!result) return;
    setResult({
      ...result,
      taskSuccess: { ...result.taskSuccess, [model]: value },
    });
  };

  const handleReset = useCallback(() => {
    setJustification("");
    setResult(null);
    setError("");
  }, []);

  const updateTechIssues = (model: "A" | "B", checked: boolean) => {
    if (!result) return;
    setResult({
      ...result,
      techIssues: { ...result.techIssues, [model]: checked },
    });
  };

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
                Escribe tu justificacion y obtiene los votos alineados
                automaticamente
              </p>
            </div>
          </div>
        </header>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Justificacion (Espanol)
            </CardTitle>
            <CardDescription>
              Escribe tu justificacion de evaluacion. El sistema la
              traducira al ingles, la fortalecera segun las reglas de
              Instruction y determinara los votos correspondientes.
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
            {/* Strengthened Justification */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-500" />
                    Justificacion Fortalecida (Ingles)
                  </CardTitle>
                  <Badge variant={
                    result.charCount >= 300 && result.charCount <= 450
                      ? "default"
                      : "destructive"
                  }>
                    {result.charCount} chars
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Readable + copyable justification block */}
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
                        navigator.clipboard?.writeText(result.strengthenedJustification);
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
                  Votos por dimension segun la justificacion. Puedes
                  ajustarlos manualmente si es necesario.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_100px_100px_100px] gap-2 px-4 py-2.5 bg-muted/80 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Dimension</span>
                    <span className="text-center">A</span>
                    <span className="text-center">Tie</span>
                    <span className="text-center">B</span>
                  </div>

                  {/* Dimension rows */}
                  {(
                    Object.entries(DIMENSION_LABELS) as [
                      string,
                      string,
                    ][]
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
                          value={result.dimensions[key as keyof typeof result.dimensions]}
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
                        onCheckedChange={(c) =>
                          updateTechIssues("A", !!c)
                        }
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                    </div>
                    <div />
                    <div className="text-center">
                      <Checkbox
                        checked={result.techIssues.B}
                        onCheckedChange={(c) =>
                          updateTechIssues("B", !!c)
                        }
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subdimensions (Check if present) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-amber-500" />
                  <div>
                    <CardTitle className="text-lg">
                      Check if Present — Subdimensiones
                    </CardTitle>
                    <CardDescription>
                      Marca las casillas segun la justificacion del
                      evaluador. Problemas observados en cada modelo.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_48px_48px] gap-2 px-4 py-2.5 bg-muted/80 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Criterio</span>
                    <span className="text-center">A</span>
                    <span className="text-center">B</span>
                  </div>

                  {/* Subdimension rows */}
                  {result.subdimensions.map((sub) => (
                    <div
                      key={sub.id}
                      className={`grid grid-cols-[1fr_48px_48px] gap-2 px-4 py-3 border-t items-start ${
                        sub.A || sub.B
                          ? "bg-destructive/5"
                          : ""
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
                          className={`data-[state=checked]:bg-destructive data-[state=checked]:border-destructive`}
                        />
                      </div>
                      <div className="flex justify-center pt-1">
                        <Checkbox
                          checked={sub.B}
                          onCheckedChange={(c) =>
                            updateSubdimension(sub.id, "B", !!c)
                          }
                          className={`data-[state=checked]:bg-destructive data-[state=checked]:border-destructive`}
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
                  La guia completa esta disponible en el archivo adjunto.
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
      </main>
    </div>
  );
}
