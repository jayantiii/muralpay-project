import { Pool } from "pg";

let pool: Pool | null = null;
let initialized = false;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set.");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function getDbPool(): Promise<Pool> {
  const currentPool = getPool();
  if (!initialized) {
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS payouts (
        id TEXT PRIMARY KEY,
        recipient_name TEXT NOT NULL,
        country TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        currency TEXT NOT NULL,
        rail TEXT NOT NULL,
        status TEXT NOT NULL,
        purpose TEXT,
        urgency TEXT NOT NULL,
        mural_transaction_id TEXT,
        mural_response JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS routing_logs (
        id TEXT PRIMARY KEY,
        payout_id TEXT NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
        input_data JSONB NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS payout_events (
        id TEXT PRIMARY KEY,
        payout_id TEXT NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    initialized = true;
  }
  return currentPool;
}
