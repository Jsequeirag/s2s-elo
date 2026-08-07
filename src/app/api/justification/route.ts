import { NextRequest, NextResponse } from "next/server";
import {
  getLatestJustification,
  saveJustification,
  saveImageAnalysis,
  clearImageAnalysis,
  clearJustification,
  saveDialogue,
  clearDialogue,
  saveQaState,
  clearQaState,
  saveGeneralQaState,
  clearGeneralQaState,
} from "@/lib/mongodb";

export async function GET() {
  try {
    const doc = await getLatestJustification();

    if (!doc) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: {
        justification: doc.justification,
        analysis: doc.analysis,
        imageAnalysis: doc.imageAnalysis ?? null,
        dialogue: doc.dialogue ?? null,
        qaState: doc.qaState ?? null,
        generalQaState: doc.generalQaState ?? null,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[API /api/justification GET] UNEXPECTED ERROR:", {
      message: msg,
      stack,
    });

    return NextResponse.json(
      { error: "Error al leer la justificacion guardada.", details: msg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: {
      justification?: string;
      analysis?: Record<string, unknown>;
      imageAnalysis?: Record<string, unknown>;
      dialogue?: Record<string, unknown>;
      qaState?: Record<string, unknown>;
      generalQaState?: Record<string, unknown>;
      clear?: boolean;
      clearImage?: boolean;
      clearDialogue?: boolean;
      clearQa?: boolean;
      clearGeneralQa?: boolean;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "El cuerpo de la solicitud no es JSON valido.",
        },
        { status: 400 }
      );
    }

    // Clear image analysis only
    if (body.clearImage) {
      await clearImageAnalysis();
      return NextResponse.json({ ok: true });
    }

    // Clear dialogue only
    if (body.clearDialogue) {
      await clearDialogue();
      return NextResponse.json({ ok: true });
    }

    // Clear qa state only
    if (body.clearQa) {
      await clearQaState();
      return NextResponse.json({ ok: true });
    }

    // Clear general qa state only
    if (body.clearGeneralQa) {
      await clearGeneralQaState();
      return NextResponse.json({ ok: true });
    }

    // Clear mode: remove the saved justification
    if (body.clear) {
      await clearJustification();
      return NextResponse.json({ ok: true });
    }

    // Save dialogue mode (no justification needed)
    if (body.dialogue) {
      await saveDialogue(body.dialogue);
      return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
    }

    // Save qa state mode (no justification needed)
    if (body.qaState) {
      await saveQaState(body.qaState);
      return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
    }

    // Save general qa state mode (no justification needed)
    if (body.generalQaState) {
      await saveGeneralQaState(body.generalQaState);
      return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
    }

    // Save image analysis mode (no justification needed)
    if (body.imageAnalysis) {
      await saveImageAnalysis(body.imageAnalysis);
      return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
    }

    // Save mode
    const { justification, analysis } = body;

    if (
      !justification ||
      typeof justification !== "string" ||
      !analysis ||
      typeof analysis !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            'Campos requeridos: "justification" (string) y "analysis" (object).',
        },
        { status: 400 }
      );
    }

    await saveJustification({
      justification,
      analysis,
    });

    return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[API /api/justification POST] UNEXPECTED ERROR:", {
      message: msg,
      stack,
    });

    return NextResponse.json(
      { error: "Error al guardar la justificacion.", details: msg },
      { status: 500 }
    );
  }
}
