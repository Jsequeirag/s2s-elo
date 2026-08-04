"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const COMMON_MODEL_PROFILES = [
    { label: "OpenAI GPT-4o mini", value: "openai/gpt-4o-mini" },
    { label: "OpenAI GPT-4o", value: "openai/gpt-4o" },
    { label: "Google Gemini 2.5 Flash Lite", value: "google/gemini-2.5-flash-lite" },
    { label: "OpenAI GPT-5.6 Luna", value: "openai/gpt-5.6-luna" },
    { label: "OpenAI GPT-5.6 Terra", value: "openai/gpt-5.6-terra" },
];

export default function ModelConfigTab({
    qaModel,
    imageModel,
    analyzeModel,
    onQaModelChange,
    onImageModelChange,
    onAnalyzeModelChange,
}: {
    qaModel: string;
    imageModel: string;
    analyzeModel: string;
    onQaModelChange: (value: string) => void;
    onImageModelChange: (value: string) => void;
    onAnalyzeModelChange: (value: string) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Modelos por tarea</CardTitle>
                <CardDescription>
                    Elige un modelo independiente para consultas, imagen y generacion de justificacion.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                        <span className="font-medium">Consulta / QA</span>
                        <select
                            value={qaModel}
                            onChange={(e) => onQaModelChange(e.target.value)}
                            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                        >
                            {COMMON_MODEL_PROFILES.map((profile) => (
                                <option key={profile.value} value={profile.value}>
                                    {profile.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                        <span className="font-medium">Imagen / Rationale</span>
                        <select
                            value={imageModel}
                            onChange={(e) => onImageModelChange(e.target.value)}
                            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                        >
                            {COMMON_MODEL_PROFILES.map((profile) => (
                                <option key={profile.value} value={profile.value}>
                                    {profile.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                        <span className="font-medium">Justificacion</span>
                        <select
                            value={analyzeModel}
                            onChange={(e) => onAnalyzeModelChange(e.target.value)}
                            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                        >
                            {COMMON_MODEL_PROFILES.map((profile) => (
                                <option key={profile.value} value={profile.value}>
                                    {profile.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </CardContent>
        </Card>
    );
}
