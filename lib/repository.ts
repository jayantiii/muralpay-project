import { getDbPool } from "@/lib/db";
import { decideRail } from "@/lib/routing";
import { executeMuralPayout } from "@/lib/mural";
import type { CreatePayoutInput, PayoutRecord, PayoutStatus, Rail, RoutingLogRecord } from "@/lib/types";

interface PayoutFilters {
  country?: string;
  rail?: Rail;
  status?: PayoutStatus;
}

interface CreatePayoutResult {
  payout: PayoutRecord;
  routingLog: RoutingLogRecord;
}

type MemoryStore = {
  payouts: PayoutRecord[];
  routingLogs: RoutingLogRecord[];
};

function getMemoryStore(): MemoryStore {
  const g = globalThis as typeof globalThis & { __memoryStore?: MemoryStore };
  if (!g.__memoryStore) {
    g.__memoryStore = { payouts: [], routingLogs: [] };
  }
  return g.__memoryStore;
}

function rowToPayoutRecord(row: Record<string, unknown>): PayoutRecord {
  return {
    id: String(row.id),
    recipient_name: String(row.recipient_name),
    country: String(row.country),
    amount: Number(row.amount),
    currency: String(row.currency),
    rail: row.rail as Rail,
    status: row.status as PayoutStatus,
    purpose: row.purpose ? String(row.purpose) : null,
    urgency: row.urgency as "fast" | "normal",
    mural_transaction_id: row.mural_transaction_id ? String(row.mural_transaction_id) : null,
    mural_response: row.mural_response ? JSON.stringify(row.mural_response) : null,
    created_at: new Date(String(row.created_at)).toISOString(),
  };
}

function rowToRoutingLogRecord(row: Record<string, unknown>): RoutingLogRecord {
  return {
    id: String(row.id),
    payout_id: String(row.payout_id),
    input_data: JSON.stringify(row.input_data),
    decision: row.decision as Rail,
    reason: String(row.reason),
    created_at: new Date(String(row.created_at)).toISOString(),
  };
}

export async function createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult> {
  const payoutId = `payout_${crypto.randomUUID()}`;
  const logId = `route_${crypto.randomUUID()}`;
  const routing = decideRail(input);
  const hasDb = Boolean(process.env.DATABASE_URL);

  if (!hasDb) {
    const store = getMemoryStore();
    const mural = await executeMuralPayout(input, routing.selected_rail);
    const payout: PayoutRecord = {
      id: payoutId,
      recipient_name: input.recipient_name,
      country: input.country.toUpperCase(),
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      rail: routing.selected_rail,
      status: mural.status === "completed" ? "completed" : "failed",
      purpose: input.purpose ?? null,
      urgency: input.urgency,
      mural_transaction_id: mural.transactionId,
      mural_response: JSON.stringify(mural.raw),
      created_at: new Date().toISOString(),
    };
    const routingLog: RoutingLogRecord = {
      id: logId,
      payout_id: payoutId,
      input_data: JSON.stringify(input),
      decision: routing.selected_rail,
      reason: routing.reason,
      created_at: new Date().toISOString(),
    };
    store.payouts.unshift(payout);
    store.routingLogs.unshift(routingLog);
    return { payout, routingLog };
  }

  const pool = await getDbPool();

  await pool.query(
    `INSERT INTO payouts
      (id, recipient_name, country, amount, currency, rail, status, purpose, urgency)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      payoutId,
      input.recipient_name,
      input.country.toUpperCase(),
      input.amount,
      input.currency.toUpperCase(),
      routing.selected_rail,
      "processing",
      input.purpose ?? null,
      input.urgency,
    ],
  );

  await pool.query(
    `INSERT INTO routing_logs
      (id, payout_id, input_data, decision, reason)
     VALUES ($1,$2,$3::jsonb,$4,$5)`,
    [logId, payoutId, JSON.stringify(input), routing.selected_rail, routing.reason],
  );

  const mural = await executeMuralPayout(input, routing.selected_rail);
  const finalStatus: PayoutStatus = mural.status === "completed" ? "completed" : "failed";

  const updated = await pool.query(
    `UPDATE payouts
      SET status = $2, mural_transaction_id = $3, mural_response = $4::jsonb
     WHERE id = $1
     RETURNING *`,
    [payoutId, finalStatus, mural.transactionId, JSON.stringify(mural.raw)],
  );

  const log = await pool.query(`SELECT * FROM routing_logs WHERE id = $1`, [logId]);

  return {
    payout: rowToPayoutRecord(updated.rows[0]),
    routingLog: rowToRoutingLogRecord(log.rows[0]),
  };
}

export async function getPayouts(filters: PayoutFilters = {}): Promise<PayoutRecord[]> {
  if (!process.env.DATABASE_URL) {
    const store = getMemoryStore();
    return store.payouts.filter((payout) => {
      if (filters.country && payout.country !== filters.country.toUpperCase()) return false;
      if (filters.rail && payout.rail !== filters.rail) return false;
      if (filters.status && payout.status !== filters.status) return false;
      return true;
    });
  }

  const pool = await getDbPool();
  const where: string[] = [];
  const values: unknown[] = [];

  if (filters.country) {
    values.push(filters.country.toUpperCase());
    where.push(`country = $${values.length}`);
  }
  if (filters.rail) {
    values.push(filters.rail);
    where.push(`rail = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    where.push(`status = $${values.length}`);
  }

  const query = `
    SELECT * FROM payouts
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, values);
  return result.rows.map((row) => rowToPayoutRecord(row));
}

export async function getPayoutById(id: string): Promise<{ payout: PayoutRecord; routingLog: RoutingLogRecord | null } | null> {
  if (!process.env.DATABASE_URL) {
    const store = getMemoryStore();
    const payout = store.payouts.find((item) => item.id === id);
    if (!payout) return null;
    const routingLog = store.routingLogs.find((item) => item.payout_id === id) ?? null;
    return { payout, routingLog };
  }

  const pool = await getDbPool();
  const payoutRes = await pool.query(`SELECT * FROM payouts WHERE id = $1`, [id]);
  if (payoutRes.rowCount === 0) {
    return null;
  }
  const logRes = await pool.query(`SELECT * FROM routing_logs WHERE payout_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]);
  return {
    payout: rowToPayoutRecord(payoutRes.rows[0]),
    routingLog: logRes.rowCount ? rowToRoutingLogRecord(logRes.rows[0]) : null,
  };
}
