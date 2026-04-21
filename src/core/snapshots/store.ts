import type { AssertionContext } from '../assertions/context.js';
import { getDb } from '../storage/db.js';
import { readSnapshotRow, writeSnapshotRow } from '../storage/queries.js';

// Day 4 moves snapshots from flat JSON under .promptforge/snapshots/ into
// the SQLite `snapshots` table. Migration 002 imports any legacy flat files
// on first DB open. The executor keeps the same `readSnapshot`/`writeSnapshot`
// shape so snapshot.ts assertion needed minimal changes.

export interface StoredSnapshot {
  testFile: string;
  testName: string;
  provider: string;
  output: string;
  embedding: Float32Array | null;
  createdAt: number;
}

export async function readSnapshot(ctx: AssertionContext): Promise<StoredSnapshot | null> {
  const db = await getDb(ctx.projectRoot);
  const row = readSnapshotRow(db, ctx.testFile, ctx.testName, ctx.providerName);
  if (!row) return null;
  return {
    testFile: row.test_file,
    testName: row.test_name,
    provider: row.provider,
    output: row.output,
    embedding: row.embedding ? bufferToFloat32(row.embedding) : null,
    createdAt: row.created_at,
  };
}

export async function writeSnapshot(
  ctx: AssertionContext,
  snap: { output: string; embedding: Float32Array },
): Promise<void> {
  const db = await getDb(ctx.projectRoot);
  writeSnapshotRow(db, {
    testFile: ctx.testFile,
    testName: ctx.testName,
    provider: ctx.providerName,
    output: snap.output,
    embedding: float32ToBuffer(snap.embedding),
    createdAt: Date.now(),
  });
}

function float32ToBuffer(arr: Float32Array): Buffer {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
}

function bufferToFloat32(buf: Buffer): Float32Array {
  // Copy so the Float32Array doesn't hold a reference to the SQLite buffer
  // past this call (better-sqlite3 recycles buffers).
  const copy = new ArrayBuffer(buf.byteLength);
  new Uint8Array(copy).set(buf);
  return new Float32Array(copy);
}
