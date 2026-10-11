import { neon } from "@neondatabase/serverless";

const FALLBACK_DB_URL = "postgresql://neondb_owner:npg_zXRfTDa1dmU5@ep-plain-cherry-b38m23d7-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("npg_xxxx") || url.includes("host/db")) {
    return FALLBACK_DB_URL;
  }
  return url;
}

let pgReady = false;
async function initPg(sql) {
  if (!pgReady) {
    await sql`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
        client_name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('bill','payment')),
        bill_no TEXT,
        weight NUMERIC,
        amount NUMERIC NOT NULL,
        from_bank TEXT,
        to_bank TEXT,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    pgReady = true;
  }
}

export async function getEntries() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const rows = await sql`
    SELECT id, to_char(entry_date,'YYYY-MM-DD') AS entry_date, client_name, type,
           bill_no, weight::float AS weight, amount::float AS amount,
           from_bank, to_bank, note
    FROM entries ORDER BY entry_date ASC, id ASC`;
  return rows;
}

export async function createEntry(entry) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  await sql`
    INSERT INTO entries (entry_date, client_name, type, bill_no, weight, amount, from_bank, to_bank, note)
    VALUES (${entry.entry_date}, ${entry.client_name}, ${entry.type}, ${entry.bill_no || null},
            ${entry.weight ?? null}, ${entry.amount}, ${entry.from_bank || null},
            ${entry.to_bank || null}, ${entry.note || null})`;
  return { ok: true };
}

export async function deleteEntry(id) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  await sql`DELETE FROM entries WHERE id = ${Number(id)}`;
  return true;
}
