"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ModelConfigTab({
    qaModel,
    imageModel,
    analyzeModel,
    generalModel,
    onQaModelChange,
    onImageModelChange,
    onAnalyzeModelChange,
    onGeneralModelChange,
}: {
    qaModel: string;
    imageModel: string;
    analyzeModel: string;
    generalModel: string;
    onQaModelChange: (value: string) => void;
    onImageModelChange: (value: string) => void;
    onAnalyzeModelChange: (value: string) => void;
    onGeneralModelChange: (value: string) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Modelos por tarea</CardTitle>
                <CardDescription>
                    Elige un modelo independiente para consultas, imagen, dialogo, consulta general y generacion de justificacion.
                    El costo real de cada llamada aparece en los resultados.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                        <span className="font-medium">Consulta / QA</span>
                        <input
                            value={qaModel}
                            onChange={(e) => onQaModelChange(e.target.value)}
                            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                            placeholder="openai/gpt-4o-mini"
                        />
                    </div>

                    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                        <span className="font-medium">Imagen / Rationale</span>
                        <input
                            value={imageModel}
                            onChange={(e) => onImageModelChange(e.target.value)}
                            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                            placeholder="openai/gpt-4o-mini"
                        />
                    </div>

                    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                        <span className="font-medium">Justificacion</span>
                        <input
                            value={analyzeModel}
                            onChange={(e) => onAnalyzeModelChange(e.target.value)}
                            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                            placeholder="openai/gpt-4o-mini"
                        />
                    </div>

                    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                        <span className="font-medium">Dialogo</span>
                        <p className="text-xs text-muted-foreground">
                            Se configura desde el tab Dialogo.
                        </p>
                    </div>

                    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                        <span className="font-medium">Consulta General</span>
                        <input
                            value={generalModel}
                            onChange={(e) => onGeneralModelChange(e.target.value)}
                            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                            placeholder="openai/gpt-4o-mini"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
