import { getDbPool } from "@/lib/db";
import { decideRail } from "@/lib/routing";
import { executeMuralPayout } from "@/lib/mural";
import type {
  BulkPayoutInput,
  CreatePayoutInput,
  PayoutBatchItemRecord,
  PayoutBatchRecord,
  PayoutEventRecord,
  PayoutEventType,
  PayoutRecord,
  PayoutStatus,
  Rail,
  RoutingLogRecord,
} from "@/lib/types";

interface PayoutFilters {
  country?: string;
  rail?: Rail;
  status?: PayoutStatus;
}

interface CreatePayoutResult {
  payout: PayoutRecord;
  routingLog: RoutingLogRecord;
  events: PayoutEventRecord[];
}

type MemoryStore = {
  payouts: PayoutRecord[];
  routingLogs: RoutingLogRecord[];
  payoutEvents: PayoutEventRecord[];
  payoutBatches: PayoutBatchRecord[];
  payoutBatchItems: PayoutBatchItemRecord[];
};

function getMemoryStore(): MemoryStore {
  const g = globalThis as typeof globalThis & { __memoryStore?: MemoryStore };
  if (!g.__memoryStore) {
    g.__memoryStore = { payouts: [], routingLogs: [], payoutEvents: [], payoutBatches: [], payoutBatchItems: [] };
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

function rowToPayoutEventRecord(row: Record<string, unknown>): PayoutEventRecord {
  return {
    id: String(row.id),
    payout_id: String(row.payout_id),
    event_type: row.event_type as PayoutEventType,
    payload: row.payload ? JSON.stringify(row.payload) : null,
    created_at: new Date(String(row.created_at)).toISOString(),
  };
}

function rowToPayoutBatchRecord(row: Record<string, unknown>): PayoutBatchRecord {
  return {
    id: String(row.id),
    status: row.status as "processing" | "completed" | "failed",
    total_count: Number(row.total_count),
    success_count: Number(row.success_count),
    failed_count: Number(row.failed_count),
    source_type: row.source_type as "csv" | "json",
    created_at: new Date(String(row.created_at)).toISOString(),
  };
}

function rowToPayoutBatchItemRecord(row: Record<string, unknown>): PayoutBatchItemRecord {
  return {
    id: String(row.id),
    batch_id: String(row.batch_id),
    row_index: Number(row.row_index),
    status: row.status as "completed" | "failed",
    payout_id: row.payout_id ? String(row.payout_id) : null,
    error_message: row.error_message ? String(row.error_message) : null,
    input_data: JSON.stringify(row.input_data),
    created_at: new Date(String(row.created_at)).toISOString(),
  };
}

function makePayoutEvent(payoutId: string, eventType: PayoutEventType, payload?: unknown): PayoutEventRecord {
  return {
    id: `evt_${crypto.randomUUID()}`,
    payout_id: payoutId,
    event_type: eventType,
    payload: payload ? JSON.stringify(payload) : null,
    created_at: new Date().toISOString(),
  };
}

async function insertPayoutEvent(
  payoutId: string,
  eventType: PayoutEventType,
  payload: unknown,
  hasDb: boolean,
): Promise<PayoutEventRecord> {
  const event = makePayoutEvent(payoutId, eventType, payload);
  if (!hasDb) {
    getMemoryStore().payoutEvents.unshift(event);
    return event;
  }

  const pool = await getDbPool();
  const inserted = await pool.query(
    `INSERT INTO payout_events (id, payout_id, event_type, payload)
     VALUES ($1,$2,$3,$4::jsonb)
     RETURNING *`,
    [event.id, payoutId, eventType, JSON.stringify(payload ?? {})],
  );
  return rowToPayoutEventRecord(inserted.rows[0]);
}

export async function createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult> {
  const payoutId = `payout_${crypto.randomUUID()}`;
  const logId = `route_${crypto.randomUUID()}`;
  const routing = decideRail(input);
  const hasDb = Boolean(process.env.DATABASE_URL);
  const events: PayoutEventRecord[] = [];

  if (!hasDb) {
    const store = getMemoryStore();
    events.push(await insertPayoutEvent(payoutId, "payout_requested", { input }, hasDb));
    events.push(await insertPayoutEvent(payoutId, "routing_decided", { rail: routing.selected_rail, reason: routing.reason }, hasDb));
    events.push(await insertPayoutEvent(payoutId, "execution_started", { rail: routing.selected_rail }, hasDb));
    const mural = await executeMuralPayout(input, routing.selected_rail);
    events.push(
      await insertPayoutEvent(
        payoutId,
        mural.status === "completed" ? "execution_succeeded" : "execution_failed",
        { transactionId: mural.transactionId, raw: mural.raw },
        hasDb,
      ),
    );
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
    return { payout, routingLog, events };
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

  events.push(await insertPayoutEvent(payoutId, "payout_requested", { input }, hasDb));
  events.push(await insertPayoutEvent(payoutId, "routing_decided", { rail: routing.selected_rail, reason: routing.reason }, hasDb));
  events.push(await insertPayoutEvent(payoutId, "execution_started", { rail: routing.selected_rail }, hasDb));
  const mural = await executeMuralPayout(input, routing.selected_rail);
  events.push(
    await insertPayoutEvent(
      payoutId,
      mural.status === "completed" ? "execution_succeeded" : "execution_failed",
      { transactionId: mural.transactionId, raw: mural.raw },
      hasDb,
    ),
  );
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
    events,
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

export async function getPayoutById(
  id: string,
): Promise<{ payout: PayoutRecord; routingLog: RoutingLogRecord | null; events: PayoutEventRecord[] } | null> {
  if (!process.env.DATABASE_URL) {
    const store = getMemoryStore();
    const payout = store.payouts.find((item) => item.id === id);
    if (!payout) return null;
    const routingLog = store.routingLogs.find((item) => item.payout_id === id) ?? null;
    const events = store.payoutEvents.filter((item) => item.payout_id === id);
    return { payout, routingLog, events };
  }

  const pool = await getDbPool();
  const payoutRes = await pool.query(`SELECT * FROM payouts WHERE id = $1`, [id]);
  if (payoutRes.rowCount === 0) {
    return null;
  }
  const logRes = await pool.query(`SELECT * FROM routing_logs WHERE payout_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]);
  const eventsRes = await pool.query(`SELECT * FROM payout_events WHERE payout_id = $1 ORDER BY created_at ASC`, [id]);
  return {
    payout: rowToPayoutRecord(payoutRes.rows[0]),
    routingLog: logRes.rowCount ? rowToRoutingLogRecord(logRes.rows[0]) : null,
    events: eventsRes.rows.map((row) => rowToPayoutEventRecord(row)),
  };
}

export async function createPayoutBatch(rows: BulkPayoutInput[], sourceType: "csv" | "json"): Promise<PayoutBatchRecord> {
  const batchId = `batch_${crypto.randomUUID()}`;
  const hasDb = Boolean(process.env.DATABASE_URL);

  if (!hasDb) {
    const store = getMemoryStore();
    let successCount = 0;
    let failedCount = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const result = await createPayout(row);
        store.payoutBatchItems.unshift({
          id: `bitem_${crypto.randomUUID()}`,
          batch_id: batchId,
          row_index: i + 1,
          status: "completed",
          payout_id: result.payout.id,
          error_message: null,
          input_data: JSON.stringify(row),
          created_at: new Date().toISOString(),
        });
        successCount += 1;
      } catch (error) {
        failedCount += 1;
        store.payoutBatchItems.unshift({
          id: `bitem_${crypto.randomUUID()}`,
          batch_id: batchId,
          row_index: i + 1,
          status: "failed",
          payout_id: null,
          error_message: error instanceof Error ? error.message : "Unknown batch row error.",
          input_data: JSON.stringify(row),
          created_at: new Date().toISOString(),
        });
      }
    }
    const batch: PayoutBatchRecord = {
      id: batchId,
      status: failedCount === rows.length ? "failed" : "completed",
      total_count: rows.length,
      success_count: successCount,
      failed_count: failedCount,
      source_type: sourceType,
      created_at: new Date().toISOString(),
    };
    store.payoutBatches.unshift(batch);
    return batch;
  }

  const pool = await getDbPool();
  await pool.query(
    `INSERT INTO payout_batches (id, status, total_count, success_count, failed_count, source_type)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [batchId, "processing", rows.length, 0, 0, sourceType],
  );

  let successCount = 0;
  let failedCount = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const result = await createPayout(row);
      await pool.query(
        `INSERT INTO payout_batch_items (id, batch_id, row_index, status, payout_id, error_message, input_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [`bitem_${crypto.randomUUID()}`, batchId, i + 1, "completed", result.payout.id, null, JSON.stringify(row)],
      );
      successCount += 1;
    } catch (error) {
      failedCount += 1;
      await pool.query(
        `INSERT INTO payout_batch_items (id, batch_id, row_index, status, payout_id, error_message, input_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [
          `bitem_${crypto.randomUUID()}`,
          batchId,
          i + 1,
          "failed",
          null,
          error instanceof Error ? error.message : "Unknown batch row error.",
          JSON.stringify(row),
        ],
      );
    }
  }

  const finalStatus = failedCount === rows.length ? "failed" : "completed";
  const updated = await pool.query(
    `UPDATE payout_batches
     SET status = $2, success_count = $3, failed_count = $4
     WHERE id = $1
     RETURNING *`,
    [batchId, finalStatus, successCount, failedCount],
  );
  return rowToPayoutBatchRecord(updated.rows[0]);
}

export async function getPayoutBatches(): Promise<PayoutBatchRecord[]> {
  if (!process.env.DATABASE_URL) {
    return getMemoryStore().payoutBatches;
  }
  const pool = await getDbPool();
  const result = await pool.query(`SELECT * FROM payout_batches ORDER BY created_at DESC`);
  return result.rows.map((row) => rowToPayoutBatchRecord(row));
}

export async function getPayoutBatchById(
  id: string,
): Promise<{ batch: PayoutBatchRecord; items: PayoutBatchItemRecord[] } | null> {
  if (!process.env.DATABASE_URL) {
    const store = getMemoryStore();
    const batch = store.payoutBatches.find((item) => item.id === id);
    if (!batch) return null;
    const items = store.payoutBatchItems.filter((item) => item.batch_id === id);
    return { batch, items };
  }
  const pool = await getDbPool();
  const batchRes = await pool.query(`SELECT * FROM payout_batches WHERE id = $1`, [id]);
  if (!batchRes.rowCount) return null;
  const itemsRes = await pool.query(`SELECT * FROM payout_batch_items WHERE batch_id = $1 ORDER BY row_index ASC`, [id]);
  return {
    batch: rowToPayoutBatchRecord(batchRes.rows[0]),
    items: itemsRes.rows.map((row) => rowToPayoutBatchItemRecord(row)),
  };
}
