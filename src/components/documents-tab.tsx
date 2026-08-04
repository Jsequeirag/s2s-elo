"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Upload, FileText, Check, Loader2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DocKey = "instructions" | "guide";

interface DocStatus {
  content: string | null;
  length: number;
}

export default function DocumentsTab() {
  const [docs, setDocs] = useState<Record<DocKey, DocStatus>>({
    instructions: { content: null, length: 0 },
    guide: { content: null, length: 0 },
  });
  const [saving, setSaving] = useState<DocKey | null>(null);
  const [dragOver, setDragOver] = useState<DocKey | null>(null);

  const instructionsRef = useRef<HTMLInputElement>(null);
  const guideRef = useRef<HTMLInputElement>(null);

  // Load current document status on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/documents");
        const json = await res.json();
        if (res.ok) {
          setDocs({
            instructions: {
              content: json.instructions ?? null,
              length: json.instructions?.length ?? 0,
            },
            guide: {
              content: json.guide ?? null,
              length: json.guide?.length ?? 0,
            },
          });
        }
      } catch {
        // Silently fail — show defaults
      }
    })();
  }, []);

  const uploadFile = useCallback(
    async (key: DocKey, file: File) => {
      if (!file.name.endsWith(".md")) {
        return;
      }

      const text = await file.text();
      setSaving(key);

      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, content: text }),
        });
        const json = await res.json();

        if (res.ok) {
          setDocs((prev) => ({
            ...prev,
            [key]: { content: text, length: text.length },
          }));
        } else {
          console.error("Error saving document:", json.error);
        }
      } catch (err) {
        console.error("Error saving document:", err);
      } finally {
        setSaving(null);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, key: DocKey) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(null);
      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(key, file);
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent, key: DocKey) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(key);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, key: DocKey) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(key, file);
      e.target.value = "";
    },
    [uploadFile]
  );

  const handleRestore = useCallback(async () => {
    try {
      await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      setDocs({
        instructions: { content: null, length: 0 },
        guide: { content: null, length: 0 },
      });
    } catch {
      // Best-effort
    }
  }, []);

  const hasAnyCustom = docs.instructions.content || docs.guide.content;

  const renderDropZone = (key: DocKey, label: string, description: string) => {
    const ref = key === "instructions" ? instructionsRef : guideRef;
    const doc = docs[key];
    const isSaving = saving === key;
    const isDragOver = dragOver === key;

    return (
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <span className="font-medium">{label}</span>
        <p className="text-xs text-muted-foreground">{description}</p>

        <div
          className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
            isDragOver
              ? "border-primary bg-primary/5"
              : doc.content
                ? "border-primary/50"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onClick={() => ref.current?.click()}
          onDragOver={(e) => handleDragOver(e, key)}
          onDrop={(e) => handleDrop(e, key)}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={ref}
            type="file"
            accept=".md"
            className="hidden"
            onChange={(e) => handleFileChange(e, key)}
          />

          {isSaving ? (
            <>
              <Loader2 className="size-5 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Guardando...</span>
            </>
          ) : doc.content ? (
            <>
              <Check className="size-5 text-green-600" />
              <span className="text-xs font-medium">
                Documento cargado ({doc.length.toLocaleString()} caracteres)
              </span>
              <Badge variant="secondary" className="text-xs">
                Haz click o arrastra para reemplazar
              </Badge>
            </>
          ) : (
            <>
              <Upload className="size-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Arrastra un archivo .md o haz click
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="size-5" />
              Documentos de referencia
            </CardTitle>
            <CardDescription className="mt-1">
              Sube versiones personalizadas de instructions.md y guide.md.
              Los cambios se aplican inmediatamente en Analisis y Consultas.
            </CardDescription>
          </div>
          {hasAnyCustom && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestore}
              className="shrink-0"
            >
              <RotateCcw className="size-4 mr-1" />
              Restaurar originales
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {renderDropZone(
            "instructions",
            "Instrucciones de evaluacion",
            "Reglas para fortalecer justificaciones, vocabulario experto, casos de estudio."
          )}
          {renderDropZone(
            "guide",
            "Guia de evaluacion",
            "Dimensiones, trade-offs, taxonomia de audio, error clusters, criterios de auditoria."
          )}
        </div>

        {hasAnyCustom && (
          <p className="text-xs text-muted-foreground text-center">
            Los documentos personalizados reemplazan los valores por defecto del sistema.
            Al restaurar, se usan los documentos incluidos en el bundle.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
