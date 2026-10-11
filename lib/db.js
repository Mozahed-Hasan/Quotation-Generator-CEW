import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("npg_xxxx") || url.includes("host/db")) {
    throw new Error("DATABASE_URL is missing or invalid. Please configure it in .env.local");
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
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        name TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'dealer',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`
      INSERT INTO clients (name, type)
      SELECT DISTINCT client_name, 'dealer'
      FROM entries
      ON CONFLICT (name) DO NOTHING
    `;
    pgReady = true;
  }
}

export async function getClients() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const rows = await sql`
    SELECT name, type
    FROM clients
    ORDER BY name ASC`;
  return rows;
}

export async function upsertClient(name, type = "dealer") {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  await sql`
    INSERT INTO clients (name, type)
    VALUES (${name}, ${type})
    ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type`;
  return { ok: true };
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
  if (entry.client_name) {
    await sql`
      INSERT INTO clients (name, type)
      VALUES (${entry.client_name}, ${entry.client_type || 'dealer'})
      ON CONFLICT (name) DO NOTHING`;
  }
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

export async function deleteClientEntries(clientName) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  await sql`DELETE FROM entries WHERE client_name = ${clientName}`;
  await sql`DELETE FROM clients WHERE name = ${clientName}`;
  return true;
}
