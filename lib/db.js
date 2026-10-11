import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

const localDataPath = path.join(process.cwd(), "data", "entries.json");

function isLocalMode() {
  const url = process.env.DATABASE_URL;
  return !url || url.includes("npg_xxxx") || url.includes("host/db");
}

function ensureLocalFile() {
  const dir = path.dirname(localDataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(localDataPath)) fs.writeFileSync(localDataPath, "[]", "utf-8");
}

function readLocal() {
  ensureLocalFile();
  try {
    const raw = fs.readFileSync(localDataPath, "utf-8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function writeLocal(data) {
  ensureLocalFile();
  fs.writeFileSync(localDataPath, JSON.stringify(data, null, 2), "utf-8");
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
  if (isLocalMode()) {
    const list = readLocal();
    return list.sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1) || a.id - b.id);
  }
  const sql = neon(process.env.DATABASE_URL);
  await initPg(sql);
  const rows = await sql`
    SELECT id, to_char(entry_date,'YYYY-MM-DD') AS entry_date, client_name, type,
           bill_no, weight::float AS weight, amount::float AS amount,
           from_bank, to_bank, note
    FROM entries ORDER BY entry_date ASC, id ASC`;
  return rows;
}

export async function createEntry(entry) {
  if (isLocalMode()) {
    const list = readLocal();
    const newId = list.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
    const item = {
      id: newId,
      entry_date: entry.entry_date,
      client_name: entry.client_name,
      type: entry.type,
      bill_no: entry.bill_no || null,
      weight: entry.weight != null ? Number(entry.weight) : null,
      amount: Number(entry.amount),
      from_bank: entry.from_bank || null,
      to_bank: entry.to_bank || null,
      note: entry.note || null,
      created_at: new Date().toISOString(),
    };
    list.push(item);
    writeLocal(list);
    return item;
  }
  const sql = neon(process.env.DATABASE_URL);
  await initPg(sql);
  await sql`
    INSERT INTO entries (entry_date, client_name, type, bill_no, weight, amount, from_bank, to_bank, note)
    VALUES (${entry.entry_date}, ${entry.client_name}, ${entry.type}, ${entry.bill_no || null},
            ${entry.weight ?? null}, ${entry.amount}, ${entry.from_bank || null},
            ${entry.to_bank || null}, ${entry.note || null})`;
  return { ok: true };
}

export async function deleteEntry(id) {
  if (isLocalMode()) {
    const list = readLocal();
    const filtered = list.filter((item) => item.id !== Number(id));
    writeLocal(filtered);
    return true;
  }
  const sql = neon(process.env.DATABASE_URL);
  await initPg(sql);
  await sql`DELETE FROM entries WHERE id = ${Number(id)}`;
  return true;
}
