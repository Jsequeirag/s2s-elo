import { NextRequest, NextResponse } from "next/server";
import { getModelConfig, saveModelConfig } from "@/lib/mongodb";

const ALLOWED_KEYS = ["qaModel", "imageModel", "analyzeModel", "dialogModel", "generalModel"];

export async function GET() {
  try {
    const config = await getModelConfig();
    return NextResponse.json({ data: config });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[API /api/config] GET error:", msg);
    return NextResponse.json(
      { error: "Error al leer la configuracion." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || !ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        {
          error: `La clave debe ser una de: ${ALLOWED_KEYS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (typeof value !== "string" || !value.trim()) {
      return NextResponse.json(
        { error: "El valor del modelo no puede estar vacio." },
        { status: 400 }
      );
    }

    await saveModelConfig(key, value.trim());

    return NextResponse.json({ data: { key, value: value.trim() } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[API /api/config] POST error:", msg);
    return NextResponse.json(
      { error: "Error al guardar la configuracion." },
      { status: 500 }
    );
  }
}
