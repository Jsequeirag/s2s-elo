import { NextRequest, NextResponse } from "next/server";
import {
  getReferenceDoc,
  saveReferenceDoc,
  clearReferenceDocs,
} from "@/lib/mongodb";
import { errorResponse } from "@/lib/openrouter";

const VALID_KEYS = ["instructions", "guide"] as const;

export async function GET() {
  try {
    const [instructions, guide] = await Promise.all([
      getReferenceDoc("instructions"),
      getReferenceDoc("guide"),
    ]);

    return NextResponse.json({
      instructions: instructions ?? null,
      guide: guide ?? null,
      updatedAt: {
        instructions: instructions ? "custom" : null,
        guide: guide ? "custom" : null,
      },
    });
  } catch (err) {
    return errorResponse("Error al leer documentos de referencia", 500, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, content, clear } = body as {
      key?: string;
      content?: string;
      clear?: boolean;
    };

    // Full clear — restore bundled defaults
    if (clear) {
      await clearReferenceDocs();
      return NextResponse.json({ cleared: true });
    }

    // Validate key
    if (!key || !VALID_KEYS.includes(key as (typeof VALID_KEYS)[number])) {
      return errorResponse("Key debe ser 'instructions' o 'guide'", 400);
    }

    // Validate content
    if (typeof content !== "string" || content.trim().length === 0) {
      return errorResponse("El contenido no puede estar vacio", 400);
    }

    // Size limit: ~500 KB of markdown
    if (content.length > 500_000) {
      return errorResponse("El documento excede el limite de 500 KB", 400);
    }

    await saveReferenceDoc(key as "instructions" | "guide", content.trim());

    return NextResponse.json({ saved: true, key, length: content.length });
  } catch (err) {
    return errorResponse("Error al guardar documento", 500, err);
  }
}
