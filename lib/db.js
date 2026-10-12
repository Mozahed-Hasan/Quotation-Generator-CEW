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
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS items JSONB`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS labour_cost NUMERIC`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS transport_cost NUMERIC`;
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
    await sql`
      CREATE TABLE IF NOT EXISTS customer_bills (
        id SERIAL PRIMARY KEY,
        bill_no TEXT,
        bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
        customer_name TEXT NOT NULL,
        customer_address TEXT,
        customer_mobile TEXT,
        customer_id TEXT,
        items JSONB NOT NULL DEFAULT '[]',
        labour_charge NUMERIC DEFAULT 0,
        transport_cost NUMERIC DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        total_bill NUMERIC NOT NULL,
        client_payment NUMERIC DEFAULT 0,
        due_advance NUMERIC DEFAULT 0,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mobile TEXT,
        address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
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
           from_bank, to_bank, note, items,
           labour_cost::float AS labour_cost, transport_cost::float AS transport_cost
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
  const itemsJson = entry.items && entry.items.length > 0 ? JSON.stringify(entry.items) : null;
  await sql`
    INSERT INTO entries (entry_date, client_name, type, bill_no, weight, amount, from_bank, to_bank, note, items, labour_cost, transport_cost)
    VALUES (${entry.entry_date}, ${entry.client_name}, ${entry.type}, ${entry.bill_no || null},
            ${entry.weight ?? null}, ${entry.amount}, ${entry.from_bank || null},
            ${entry.to_bank || null}, ${entry.note || null}, ${itemsJson},
            ${entry.labour_cost ?? null}, ${entry.transport_cost ?? null})`;
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

export async function getCustomerBills(search = "") {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    const rows = await sql`
      SELECT id, to_char(bill_date, 'YYYY-MM-DD') AS bill_date,
             bill_no, customer_name, customer_address, customer_mobile, customer_id,
             items, labour_charge::float AS labour_charge, transport_cost::float AS transport_cost,
             discount::float AS discount,
             total_bill::float AS total_bill, client_payment::float AS client_payment,
             due_advance::float AS due_advance, note, created_at
      FROM customer_bills
      WHERE COALESCE(is_deleted, false) = false
        AND (
          LOWER(customer_name) LIKE ${q}
          OR LOWER(COALESCE(customer_mobile, '')) LIKE ${q}
          OR LOWER(COALESCE(customer_id, '')) LIKE ${q}
          OR LOWER(COALESCE(bill_no, '')) LIKE ${q}
        )
      ORDER BY bill_date DESC, id DESC`;
    return rows;
  }
  const rows = await sql`
    SELECT id, to_char(bill_date, 'YYYY-MM-DD') AS bill_date,
           bill_no, customer_name, customer_address, customer_mobile, customer_id,
           items, labour_charge::float AS labour_charge, transport_cost::float AS transport_cost,
           discount::float AS discount,
           total_bill::float AS total_bill, client_payment::float AS client_payment,
           due_advance::float AS due_advance, note, created_at
    FROM customer_bills
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY bill_date DESC, id DESC`;
  return rows;
}

export async function createCustomerBill(data) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);

  const itemsJson = data.items && Array.isArray(data.items) ? JSON.stringify(data.items) : '[]';

  // Upsert customer info if customer_id exists
  if (data.customer_id) {
    await sql`
      INSERT INTO customers (customer_id, name, mobile, address, updated_at, is_deleted)
      VALUES (${data.customer_id}, ${data.customer_name}, ${data.customer_mobile || null}, ${data.customer_address || null}, now(), false)
      ON CONFLICT (customer_id) DO UPDATE
      SET name = EXCLUDED.name,
          mobile = EXCLUDED.mobile,
          address = EXCLUDED.address,
          updated_at = now(),
          is_deleted = false,
          deleted_at = NULL`;
  }

  const [row] = await sql`
    INSERT INTO customer_bills (
      bill_no, bill_date, customer_name, customer_address, customer_mobile, customer_id,
      items, labour_charge, transport_cost, discount, total_bill, client_payment, due_advance, note
    )
    VALUES (
      ${data.bill_no || null},
      ${data.bill_date || new Date().toISOString().slice(0, 10)},
      ${data.customer_name},
      ${data.customer_address || null},
      ${data.customer_mobile || null},
      ${data.customer_id || null},
      ${itemsJson},
      ${Number(data.labour_charge || 0)},
      ${Number(data.transport_cost || 0)},
      ${Number(data.discount || 0)},
      ${Number(data.total_bill || 0)},
      ${Number(data.client_payment || 0)},
      ${Number(data.due_advance || 0)},
      ${data.note || null}
    )
    RETURNING id`;
  return row;
}

export async function deleteCustomerBill(id, permanent = false) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  if (permanent) {
    await sql`DELETE FROM customer_bills WHERE id = ${Number(id)}`;
  } else {
    await sql`
      UPDATE customer_bills
      SET is_deleted = true, deleted_at = now()
      WHERE id = ${Number(id)}`;
  }
  return true;
}

export async function softDeleteCustomerBill(id) {
  return deleteCustomerBill(id, false);
}

export async function permanentDeleteCustomerBill(id) {
  return deleteCustomerBill(id, true);
}

export async function restoreCustomerBill(id) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const [bill] = await sql`
    SELECT customer_id
    FROM customer_bills
    WHERE id = ${Number(id)}
    LIMIT 1`;
  await sql`
    UPDATE customer_bills
    SET is_deleted = false, deleted_at = NULL
    WHERE id = ${Number(id)}`;
  if (bill && bill.customer_id) {
    await sql`
      UPDATE customers
      SET is_deleted = false, deleted_at = NULL
      WHERE customer_id = ${bill.customer_id}`;
  }
  return true;
}

export async function getCustomers() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const rows = await sql`
    SELECT customer_id, name, mobile, address
    FROM customers
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY updated_at DESC, name ASC`;
  return rows;
}

export async function deleteCustomerById(customerId, permanent = false) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  if (permanent) {
    await sql`DELETE FROM customer_bills WHERE customer_id = ${customerId}`;
    await sql`DELETE FROM customers WHERE customer_id = ${customerId}`;
  } else {
    await sql`
      UPDATE customer_bills
      SET is_deleted = true, deleted_at = now()
      WHERE customer_id = ${customerId}`;
    await sql`
      UPDATE customers
      SET is_deleted = true, deleted_at = now()
      WHERE customer_id = ${customerId}`;
  }
  return true;
}

export async function softDeleteCustomerById(customerId) {
  return deleteCustomerById(customerId, false);
}

export async function permanentDeleteCustomerById(customerId) {
  return deleteCustomerById(customerId, true);
}

export async function restoreCustomerById(customerId) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  await sql`
    UPDATE customer_bills
    SET is_deleted = false, deleted_at = NULL
    WHERE customer_id = ${customerId}`;
  await sql`
    UPDATE customers
    SET is_deleted = false, deleted_at = NULL
    WHERE customer_id = ${customerId}`;
  return true;
}

export async function getRecycleBinItems() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const rows = await sql`
    SELECT id, to_char(bill_date, 'YYYY-MM-DD') AS bill_date,
           bill_no, customer_name, customer_address, customer_mobile, customer_id,
           items, labour_charge::float AS labour_charge, transport_cost::float AS transport_cost,
           discount::float AS discount,
           total_bill::float AS total_bill, client_payment::float AS client_payment,
           due_advance::float AS due_advance, note,
           to_char(deleted_at, 'YYYY-MM-DD HH24:MI:SS') AS deleted_at,
           created_at
    FROM customer_bills
    WHERE is_deleted = true
    ORDER BY deleted_at DESC NULLS LAST, id DESC`;
  return rows;
}

export async function emptyRecycleBin() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  await sql`DELETE FROM customer_bills WHERE is_deleted = true`;
  await sql`
    DELETE FROM customers
    WHERE is_deleted = true
      AND customer_id NOT IN (SELECT customer_id FROM customer_bills WHERE customer_id IS NOT NULL)`;
  return true;
}

export async function restoreAllRecycleBin() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  await sql`
    UPDATE customer_bills
    SET is_deleted = false, deleted_at = NULL
    WHERE is_deleted = true`;
  await sql`
    UPDATE customers
    SET is_deleted = false, deleted_at = NULL
    WHERE is_deleted = true`;
  return true;
}
