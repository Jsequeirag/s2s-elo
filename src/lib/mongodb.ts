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

export interface JustificationDocument extends Document {
  justification: string;
  analysis: Record<string, unknown>;
  imageAnalysis?: Record<string, unknown>;
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
 * Saves (upserts) a justification document. Replaces any previous data.
 */
export async function saveJustification(data: {
  justification: string;
  analysis: Record<string, unknown>;
}): Promise<void> {
  const client = await getClient();
  const db = client.db(DB_NAME);

  await db.collection(COLLECTION).deleteMany({});

  await db.collection<JustificationDocument>(COLLECTION).insertOne({
    justification: data.justification,
    analysis: data.analysis,
    updatedAt: new Date().toISOString(),
  });
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
