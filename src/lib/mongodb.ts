import { MongoClient, type Document } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Falta MONGODB_URI. Agregala en .env.local y en Vercel > Settings > Environment Variables."
  );
}

const DB_NAME = "s2s-elo";
const COLLECTION = "justifications";
const REF_COLLECTION = "reference-docs";

// Singleton client for serverless (reuses connection across invocations)
let clientPromise: Promise<MongoClient> | null = null;

function getClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const client = new MongoClient(MONGODB_URI!);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export interface TaskSpec {
  scenario?: string;
  whatToDo?: string;
  skillsTested?: string[];
  userRole?: string;
  updatedAt: string;
}

export interface JustificationDocument extends Document {
  justification: string;
  analysis: Record<string, unknown>;
  imageAnalysis?: Record<string, unknown>;
  dialogue?: Record<string, unknown>;
  qaState?: Record<string, unknown>;
  generalQaState?: Record<string, unknown>;
  taskSpec?: TaskSpec;
  updatedAt: string;
}

/**
 * Returns the latest saved scenario, or null if none exists.
 */
export async function getLatestJustification(): Promise<JustificationDocument | null> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  const doc = await db
    .collection<JustificationDocument>(COLLECTION)
    .findOne({}, { sort: { updatedAt: -1 } });
  return doc;
}

/**
 * Saves (upserts) a justification document. Preserves taskSpec,
 * imageAnalysis, and dialogue fields if they already exist.
 */
export async function saveJustification(data: {
  justification: string;
  analysis: Record<string, unknown>;
}): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  const result = await db
    .collection<JustificationDocument>(COLLECTION)
    .updateOne(
      {},
      {
        $set: {
          justification: data.justification,
          analysis: data.analysis,
          updatedAt: new Date().toISOString(),
        },
      }
    );

  if (result.matchedCount === 0) {
    await db.collection<JustificationDocument>(COLLECTION).insertOne({
      justification: data.justification,
      analysis: data.analysis,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Updates only the imageAnalysis field of the current scenario document.
 * No-ops if there is no document yet.
 */
export async function saveImageAnalysis(
  imageAnalysis: Record<string, unknown>
): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  const result = await db
    .collection<JustificationDocument>(COLLECTION)
    .updateOne(
      {},
      { $set: { imageAnalysis, updatedAt: new Date().toISOString() } }
    );

  // If no document exists, create one with only imageAnalysis
  if (result.matchedCount === 0) {
    await db.collection<JustificationDocument>(COLLECTION).insertOne({
      justification: "",
      analysis: {},
      imageAnalysis,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Clears the imageAnalysis field of the current scenario document.
 */
export async function clearImageAnalysis(): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  const result = await db
    .collection<JustificationDocument>(COLLECTION)
    .updateOne({}, { $unset: { imageAnalysis: "" }, $set: { updatedAt: new Date().toISOString() } });

  // If no document exists, nothing to clear
  if (result.matchedCount === 0) {
    // No-op
  }
}

/**
 * Updates only the dialogue field of the current scenario document.
 * No-ops if there is no document yet.
 */
export async function saveDialogue(
  dialogue: Record<string, unknown>
): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  const result = await db
    .collection<JustificationDocument>(COLLECTION)
    .updateOne(
      {},
      { $set: { dialogue, updatedAt: new Date().toISOString() } }
    );

  if (result.matchedCount === 0) {
    await db.collection<JustificationDocument>(COLLECTION).insertOne({
      justification: "",
      analysis: {},
      dialogue,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Clears the dialogue field of the current scenario document.
 */
export async function clearDialogue(): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  const result = await db
    .collection<JustificationDocument>(COLLECTION)
    .updateOne({}, { $unset: { dialogue: "" }, $set: { updatedAt: new Date().toISOString() } });

  if (result.matchedCount === 0) {
    // No-op
  }
}

/**
 * Updates only the qaState field (last question/answer for the Consultar tab).
 * No-ops if there is no document yet.
 */
export async function saveQaState(
  qaState: Record<string, unknown>
): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  const result = await db
    .collection<JustificationDocument>(COLLECTION)
    .updateOne(
      {},
      { $set: { qaState, updatedAt: new Date().toISOString() } }
    );

  if (result.matchedCount === 0) {
    await db.collection<JustificationDocument>(COLLECTION).insertOne({
      justification: "",
      analysis: {},
      qaState,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Clears the qaState field of the current scenario document.
 */
export async function clearQaState(): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  await db
    .collection<JustificationDocument>(COLLECTION)
    .updateOne({}, { $unset: { qaState: "" }, $set: { updatedAt: new Date().toISOString() } });
}

/**
 * Updates only the generalQaState field (last question/answer for the General tab).
 * No-ops if there is no document yet.
 */
export async function saveGeneralQaState(
  generalQaState: Record<string, unknown>
): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  const result = await db
    .collection<JustificationDocument>(COLLECTION)
    .updateOne(
      {},
      { $set: { generalQaState, updatedAt: new Date().toISOString() } }
    );

  if (result.matchedCount === 0) {
    await db.collection<JustificationDocument>(COLLECTION).insertOne({
      justification: "",
      analysis: {},
      generalQaState,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Clears the generalQaState field of the current scenario document.
 */
export async function clearGeneralQaState(): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  await db
    .collection<JustificationDocument>(COLLECTION)
    .updateOne({}, { $unset: { generalQaState: "" }, $set: { updatedAt: new Date().toISOString() } });
}

/**
 * Saves the task specification (SCENARIO + WHAT TO DO + Skills Tested)
 * extracted from the dialogue generation image. Replaces any previous
 * taskSpec — only one active task spec exists at a time.
 */
export async function saveTaskSpec(
  spec: Omit<TaskSpec, "updatedAt">
): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  const taskSpec: TaskSpec = {
    ...spec,
    updatedAt: new Date().toISOString(),
  };

  const result = await db
    .collection<JustificationDocument>(COLLECTION)
    .updateOne({}, { $set: { taskSpec, updatedAt: new Date().toISOString() } });

  if (result.matchedCount === 0) {
    await db.collection<JustificationDocument>(COLLECTION).insertOne({
      justification: "",
      analysis: {},
      taskSpec,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Clears all saved justifications.
 */
export async function clearJustification(): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  await db.collection(COLLECTION).deleteMany({});
}

// ── Reference documents (instructions.md / guide.md) ──────────────────

export interface ReferenceDocDocument extends Document {
  key: "instructions" | "guide";
  content: string;
  updatedAt: string;
}

/**
 * Returns the latest reference document for the given key, or null.
 */
export async function getReferenceDoc(
  key: "instructions" | "guide"
): Promise<string | null> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  const doc = await db
    .collection<ReferenceDocDocument>(REF_COLLECTION)
    .findOne({ key }, { sort: { updatedAt: -1 } });
  return doc?.content ?? null;
}

/**
 * Saves a reference document, replacing any previous version for the same key.
 */
export async function saveReferenceDoc(
  key: "instructions" | "guide",
  content: string
): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  await db.collection(REF_COLLECTION).deleteMany({ key });
  await db.collection<ReferenceDocDocument>(REF_COLLECTION).insertOne({
    key,
    content,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Deletes all custom reference documents, restoring fallback to bundled content.
 */
export async function clearReferenceDocs(): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  await db.collection(REF_COLLECTION).deleteMany({});
}

// ── App config (model selection per task) ───────────────────────────────

const CONFIG_COLLECTION = "config";

export interface ConfigDocument extends Document {
  key: string;
  value: string;
  updatedAt: string;
}

const MODEL_KEYS = ["qaModel", "imageModel", "analyzeModel", "dialogModel", "generalModel"] as const;

/**
 * Returns all saved model config values, using defaults for missing keys.
 */
export async function getModelConfig(): Promise<{
  qaModel: string;
  imageModel: string;
  analyzeModel: string;
  dialogModel: string;
  generalModel: string;
}> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  const docs = await db
    .collection<ConfigDocument>(CONFIG_COLLECTION)
    .find({ key: { $in: [...MODEL_KEYS] } })
    .toArray();

  const map = new Map(docs.map((d) => [d.key, d.value]));
  return {
    qaModel: map.get("qaModel") || "openai/gpt-4o-mini",
    imageModel: map.get("imageModel") || "openai/gpt-4o-mini",
    analyzeModel: map.get("analyzeModel") || "openai/gpt-4o-mini",
    dialogModel: map.get("dialogModel") || "openai/gpt-4o-mini",
    generalModel: map.get("generalModel") || "openai/gpt-4o-mini",
  };
}

/**
 * Saves a model config value, upserting by key.
 */
export async function saveModelConfig(
  key: string,
  value: string
): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  await db.collection(CONFIG_COLLECTION).updateOne(
    { key },
    { $set: { value, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}
