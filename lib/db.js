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
    await sql`ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS deleted_by TEXT`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS deleted_by TEXT`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_by TEXT`;
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
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Other',
        amount NUMERIC NOT NULL,
        payment_method TEXT,
        paid_to TEXT,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS from_bank TEXT`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS to_bank TEXT`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS linked_client TEXT`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS linked_entry_id INTEGER`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS phone TEXT`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS linked_expense_id INTEGER`;

    // Approval tracking columns across all system entities (Default: 'pending')
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`;
    await sql`ALTER TABLE entries ALTER COLUMN status SET DEFAULT 'pending'`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS approved_by TEXT`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`;

    await sql`ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`;
    await sql`ALTER TABLE customer_bills ALTER COLUMN status SET DEFAULT 'pending'`;
    await sql`ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS approved_by TEXT`;
    await sql`ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`;

    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`;
    await sql`ALTER TABLE expenses ALTER COLUMN status SET DEFAULT 'pending'`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by TEXT`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`;

    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS created_by TEXT`;
    await sql`ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS created_by TEXT`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by TEXT`;
    await sql`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'moderator',
        permissions JSONB NOT NULL DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
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
    FROM entries
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY entry_date ASC, id ASC`;
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
    INSERT INTO entries (entry_date, client_name, type, bill_no, weight, amount, from_bank, to_bank, note, items, labour_cost, transport_cost, created_by)
    VALUES (${entry.entry_date}, ${entry.client_name}, ${entry.type}, ${entry.bill_no || null},
            ${entry.weight ?? null}, ${entry.amount}, ${entry.from_bank || null},
            ${entry.to_bank || null}, ${entry.note || null}, ${itemsJson},
            ${entry.labour_cost ?? null}, ${entry.transport_cost ?? null}, ${entry.created_by || 'Admin'})`;
  return { ok: true };
}

export async function updateEntry(id, entry) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const numId = Number(id);
  const itemsJson = entry.items && entry.items.length > 0 ? JSON.stringify(entry.items) : null;
  const weight = entry.weight === "" || entry.weight == null ? null : Number(entry.weight);
  const labour_cost = entry.labour_cost === "" || entry.labour_cost == null ? null : Number(entry.labour_cost);
  const transport_cost = entry.transport_cost === "" || entry.transport_cost == null ? null : Number(entry.transport_cost);
  const amount = Number(entry.amount);

  await sql`
    UPDATE entries
    SET entry_date = ${entry.entry_date},
        bill_no = ${entry.bill_no || null},
        weight = ${weight},
        amount = ${amount},
        from_bank = ${entry.from_bank || null},
        to_bank = ${entry.to_bank || null},
        note = ${entry.note || null},
        items = ${itemsJson},
        labour_cost = ${labour_cost},
        transport_cost = ${transport_cost}
    WHERE id = ${numId}`;

  // If this entry was linked from an expense, also update the linked expense
  await sql`
    UPDATE expenses
    SET expense_date = ${entry.entry_date},
        amount = ${amount},
        from_bank = ${entry.from_bank || null},
        to_bank = ${entry.to_bank || null},
        note = ${entry.note || null}
    WHERE linked_entry_id = ${numId}`;

  return { ok: true };
}

export async function deleteEntry(id, permanent = false, deleted_by = 'Admin') {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const numId = Number(id);
  const [ent] = await sql`SELECT linked_expense_id FROM entries WHERE id = ${numId}`;

  if (permanent) {
    if (ent?.linked_expense_id) {
      await sql`DELETE FROM expenses WHERE id = ${ent.linked_expense_id}`;
    }
    await sql`DELETE FROM entries WHERE id = ${numId}`;
  } else {
    await sql`
      UPDATE entries
      SET is_deleted = true, deleted_at = now(), deleted_by = ${deleted_by || 'Admin'}
      WHERE id = ${numId}`;
    if (ent?.linked_expense_id) {
      await sql`
        UPDATE expenses
        SET is_deleted = true, deleted_at = now(), deleted_by = ${deleted_by || 'Admin'}
        WHERE id = ${ent.linked_expense_id}`;
    }
  }
  return true;
}

export async function restoreEntry(id) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const numId = Number(id);
  const [ent] = await sql`SELECT linked_expense_id FROM entries WHERE id = ${numId}`;
  await sql`
    UPDATE entries
    SET is_deleted = false, deleted_at = NULL, deleted_by = NULL
    WHERE id = ${numId}`;
  if (ent?.linked_expense_id) {
    await sql`
      UPDATE expenses
      SET is_deleted = false, deleted_at = NULL, deleted_by = NULL
      WHERE id = ${ent.linked_expense_id}`;
  }
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
      items, labour_charge, transport_cost, discount, total_bill, client_payment, due_advance, note,
      created_by
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
      ${data.note || null},
      ${data.created_by || 'Admin'}
    )
    RETURNING id`;
  return row;
}

export async function updateCustomerBill(id, data) {
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
    UPDATE customer_bills
    SET
      bill_no = ${data.bill_no || null},
      bill_date = ${data.bill_date || new Date().toISOString().slice(0, 10)},
      customer_name = ${data.customer_name},
      customer_address = ${data.customer_address || null},
      customer_mobile = ${data.customer_mobile || null},
      customer_id = ${data.customer_id || null},
      items = ${itemsJson},
      labour_charge = ${Number(data.labour_charge || 0)},
      transport_cost = ${Number(data.transport_cost || 0)},
      discount = ${Number(data.discount || 0)},
      total_bill = ${Number(data.total_bill || 0)},
      client_payment = ${Number(data.client_payment || 0)},
      due_advance = ${Number(data.due_advance || 0)},
      note = ${data.note || null}
    WHERE id = ${Number(id)}
    RETURNING id`;
  return row;
}

export async function deleteCustomerBill(id, permanent = false, deleted_by = 'Admin') {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  if (permanent) {
    await sql`DELETE FROM customer_bills WHERE id = ${Number(id)}`;
  } else {
    await sql`
      UPDATE customer_bills
      SET is_deleted = true, deleted_at = now(), deleted_by = ${deleted_by || 'Admin'}
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
    SET is_deleted = false, deleted_at = NULL, deleted_by = NULL
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

export async function deleteCustomerById(customerId, permanent = false, deleted_by = 'Admin') {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  if (permanent) {
    await sql`DELETE FROM customer_bills WHERE customer_id = ${customerId}`;
    await sql`DELETE FROM customers WHERE customer_id = ${customerId}`;
  } else {
    await sql`
      UPDATE customer_bills
      SET is_deleted = true, deleted_at = now(), deleted_by = ${deleted_by || 'Admin'}
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

export async function getExpenses() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const rows = await sql`
    SELECT id, to_char(expense_date, 'YYYY-MM-DD') AS expense_date,
           title, category, amount::float AS amount,
           payment_method, paid_to, phone, from_bank, to_bank,
           linked_client, linked_entry_id, note, created_at
    FROM expenses
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY expense_date DESC, id DESC`;
  return rows;
}

export async function createExpense(data) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);

  let linkedEntryId = null;
  const catLower = (data.category || "").trim().toLowerCase();
  const isStaffPay = catLower === "salary" || catLower === "overtime";
  const isLinked = Boolean(!isStaffPay && data.sync_to_ledger && data.paid_to && data.paid_to.trim());

  if (isLinked) {
    const clientName = data.paid_to.trim();
    const clientType = data.client_type === "supplier" || data.client_type === "client" ? "supplier" : "dealer";
    await sql`
      INSERT INTO clients (name, type)
      VALUES (${clientName}, ${clientType})
      ON CONFLICT (name) DO NOTHING`;

    let entryFromBank = null;
    let entryToBank = null;
    if (data.payment_method === "Bank") {
      entryFromBank = (data.from_bank || "").trim() || "Bank";
      entryToBank = (data.to_bank || "").trim() || "Bank";
    } else {
      entryFromBank = (data.payment_method || "").trim() || "Cash";
      entryToBank = null;
    }

    const noteCombined = [
      data.title ? `Expense: ${data.title.trim()}` : "",
      data.note ? data.note.trim() : ""
    ].filter(Boolean).join(" | ");

    const [entryRow] = await sql`
      INSERT INTO entries (entry_date, client_name, type, amount, from_bank, to_bank, note)
      VALUES (
        ${data.expense_date || new Date().toISOString().slice(0, 10)},
        ${clientName},
        'payment',
        ${Number(data.amount || 0)},
        ${entryFromBank},
        ${entryToBank},
        ${noteCombined || null}
      )
      RETURNING id`;
    if (entryRow) {
      linkedEntryId = entryRow.id;
    }
  }

  const [row] = await sql`
    INSERT INTO expenses (expense_date, title, category, amount, payment_method, paid_to, phone, from_bank, to_bank, linked_client, linked_entry_id, note, created_by)
    VALUES (
      ${data.expense_date || new Date().toISOString().slice(0, 10)},
      ${data.title},
      ${data.category || "Other"},
      ${Number(data.amount || 0)},
      ${data.payment_method || null},
      ${data.paid_to || null},
      ${data.phone || null},
      ${data.from_bank || null},
      ${data.to_bank || null},
      ${isLinked ? data.paid_to.trim() : null},
      ${linkedEntryId},
      ${data.note || null},
      ${data.created_by || 'Admin'}
    )
    RETURNING id`;

  if (linkedEntryId && row?.id) {
    await sql`UPDATE entries SET linked_expense_id = ${row.id} WHERE id = ${linkedEntryId}`;
  }

  return { ...row, linked_entry_id: linkedEntryId };
}

export async function createExpensesBulk(items) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  let importedCount = 0;
  let syncedCount = 0;

  for (const data of items) {
    if (!data.title || !data.amount || Number(data.amount) <= 0) continue;
    let linkedEntryId = null;
    const catLower = (data.category || "").trim().toLowerCase();
    const isStaffPay = catLower === "salary" || catLower === "overtime";
    const isLinked = Boolean(!isStaffPay && data.sync_to_ledger && data.paid_to && data.paid_to.trim());

    if (isLinked) {
      const clientName = data.paid_to.trim();
      const clientType = data.client_type === "dealer" ? "dealer" : "supplier";
      await sql`
        INSERT INTO clients (name, type)
        VALUES (${clientName}, ${clientType})
        ON CONFLICT (name) DO NOTHING`;

      let entryFromBank = null;
      let entryToBank = null;
      if (data.payment_method === "Bank") {
        entryFromBank = (data.from_bank || "").trim() || "Bank";
        entryToBank = (data.to_bank || "").trim() || "Bank";
      } else {
        entryFromBank = (data.payment_method || "").trim() || "Cash";
        entryToBank = null;
      }

      const noteCombined = [
        data.title ? `Expense: ${data.title.trim()}` : "",
        data.note ? data.note.trim() : ""
      ].filter(Boolean).join(" | ");

      const [entryRow] = await sql`
        INSERT INTO entries (entry_date, client_name, type, amount, from_bank, to_bank, note)
        VALUES (
          ${data.expense_date || new Date().toISOString().slice(0, 10)},
          ${clientName},
          'payment',
          ${Number(data.amount || 0)},
          ${entryFromBank},
          ${entryToBank},
          ${noteCombined || null}
        )
        RETURNING id`;
      if (entryRow) {
        linkedEntryId = entryRow.id;
        syncedCount++;
      }
    }

    const [row] = await sql`
      INSERT INTO expenses (expense_date, title, category, amount, payment_method, paid_to, phone, from_bank, to_bank, linked_client, linked_entry_id, note)
      VALUES (
        ${data.expense_date || new Date().toISOString().slice(0, 10)},
        ${data.title},
        ${data.category || "Other"},
        ${Number(data.amount || 0)},
        ${data.payment_method || null},
        ${data.paid_to || null},
        ${data.phone || null},
        ${data.from_bank || null},
        ${data.to_bank || null},
        ${isLinked ? data.paid_to.trim() : null},
        ${linkedEntryId},
        ${data.note || null}
      )
      RETURNING id`;

    if (linkedEntryId && row?.id) {
      await sql`UPDATE entries SET linked_expense_id = ${row.id} WHERE id = ${linkedEntryId}`;
    }
    importedCount++;
  }

  return { imported: importedCount, synced: syncedCount };
}

export async function deleteExpense(id, permanent = false, deleted_by = 'Admin') {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const numId = Number(id);
  const [existing] = await sql`SELECT linked_entry_id FROM expenses WHERE id = ${numId}`;

  if (permanent) {
    if (existing?.linked_entry_id) {
      await sql`DELETE FROM entries WHERE id = ${existing.linked_entry_id}`;
    }
    await sql`DELETE FROM expenses WHERE id = ${numId}`;
  } else {
    await sql`
      UPDATE expenses
      SET is_deleted = true, deleted_at = now(), deleted_by = ${deleted_by || 'Admin'}
      WHERE id = ${numId}`;
    if (existing?.linked_entry_id) {
      await sql`
        UPDATE entries
        SET is_deleted = true, deleted_at = now(), deleted_by = ${deleted_by || 'Admin'}
        WHERE id = ${existing.linked_entry_id}`;
    }
  }
  return true;
}

export async function restoreExpense(id) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const numId = Number(id);
  const [existing] = await sql`SELECT linked_entry_id FROM expenses WHERE id = ${numId}`;
  await sql`
    UPDATE expenses
    SET is_deleted = false, deleted_at = NULL, deleted_by = NULL
    WHERE id = ${numId}`;
  if (existing?.linked_entry_id) {
    await sql`
      UPDATE entries
      SET is_deleted = false, deleted_at = NULL, deleted_by = NULL
      WHERE id = ${existing.linked_entry_id}`;
  }
  return true;
}

export async function updateExpense(id, data) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const numId = Number(id);
  const [existing] = await sql`SELECT * FROM expenses WHERE id = ${numId}`;
  if (!existing) {
    throw new Error("Expense not found");
  }

  const expenseDate = data.expense_date || existing.expense_date;
  const title = (data.title || "").trim() || existing.title;
  const category = (data.category || "").trim() || existing.category;
  const amount = Number(data.amount != null ? data.amount : existing.amount);
  const paymentMethod = data.payment_method !== undefined ? data.payment_method : existing.payment_method;
  const paidTo = data.paid_to !== undefined ? (data.paid_to || "").trim() : existing.paid_to;
  const phone = data.phone !== undefined ? (data.phone || "").trim() : existing.phone;
  const fromBank = data.from_bank !== undefined ? (data.from_bank || "").trim() : existing.from_bank;
  const toBank = data.to_bank !== undefined ? (data.to_bank || "").trim() : existing.to_bank;
  const note = data.note !== undefined ? (data.note || "").trim() : existing.note;

  if (existing.linked_entry_id) {
    await sql`
      UPDATE entries SET
        entry_date = ${expenseDate},
        client_name = ${paidTo || existing.linked_client || 'General'},
        amount = ${amount},
        from_bank = ${fromBank || null},
        to_bank = ${toBank || null},
        note = ${note || null}
      WHERE id = ${existing.linked_entry_id}
    `;
  }

  const [updated] = await sql`
    UPDATE expenses SET
      expense_date = ${expenseDate},
      title = ${title},
      category = ${category},
      amount = ${amount},
      payment_method = ${paymentMethod || null},
      paid_to = ${paidTo || null},
      phone = ${phone || null},
      from_bank = ${fromBank || null},
      to_bank = ${toBank || null},
      note = ${note || null}
    WHERE id = ${numId}
    RETURNING *
  `;

  return updated;
}

export async function listUsers() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  return await sql`
    SELECT id, username, role, permissions, is_active, created_by, created_at
    FROM app_users ORDER BY id ASC`;
}

export async function getUserByUsername(username) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const [row] = await sql`SELECT * FROM app_users WHERE LOWER(username) = LOWER(${username}) LIMIT 1`;
  return row || null;
}

export async function getUserById(id) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const [row] = await sql`SELECT * FROM app_users WHERE id = ${Number(id)} LIMIT 1`;
  return row || null;
}

export async function createUser({ username, password_hash, role, permissions, created_by }) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const [row] = await sql`
    INSERT INTO app_users (username, password_hash, role, permissions, created_by)
    VALUES (${username}, ${password_hash}, ${role}, ${JSON.stringify(permissions || {})}, ${created_by || null})
    RETURNING id`;
  return row;
}

export async function updateUser(id, { role, permissions, is_active, password_hash }) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const n = Number(id);
  if (role !== undefined) await sql`UPDATE app_users SET role = ${role} WHERE id = ${n}`;
  if (permissions !== undefined) {
    await sql`UPDATE app_users SET permissions = ${JSON.stringify(permissions)} WHERE id = ${n}`;
  }
  if (is_active !== undefined) await sql`UPDATE app_users SET is_active = ${!!is_active} WHERE id = ${n}`;
  if (password_hash) await sql`UPDATE app_users SET password_hash = ${password_hash} WHERE id = ${n}`;
  return true;
}

export async function deleteUser(id) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  await sql`DELETE FROM app_users WHERE id = ${Number(id)}`;
  return true;
}

// -------------------------------------------------------------
// Unified System Entries (All Modules: Customer Bills, Ledger, Expenses)
// -------------------------------------------------------------
export async function getAllSystemEntries() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);

  const [customerBills, entriesRows, expenseRows] = await Promise.all([
    sql`
      SELECT id, to_char(bill_date, 'YYYY-MM-DD') AS entry_date,
             bill_no, customer_name, customer_mobile, customer_address, customer_id,
             items, labour_charge::float AS labour_charge, transport_cost::float AS transport_cost,
             discount::float AS discount,
             total_bill::float AS amount, client_payment::float AS payment,
             due_advance::float AS due,
             COALESCE(status, 'pending') AS status,
             approved_by, to_char(approved_at, 'YYYY-MM-DD HH24:MI') AS approved_at,
             note, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
             COALESCE(created_by, 'Admin') AS entry_by
      FROM customer_bills
      WHERE COALESCE(is_deleted, false) = false
      ORDER BY bill_date DESC, id DESC
    `,
    sql`
      SELECT id, to_char(entry_date, 'YYYY-MM-DD') AS entry_date,
             client_name, type, bill_no, weight::float AS weight,
             amount::float AS amount, from_bank, to_bank,
             items, labour_cost::float AS labour_cost, transport_cost::float AS transport_cost,
             linked_expense_id,
             COALESCE(status, 'pending') AS status,
             approved_by, to_char(approved_at, 'YYYY-MM-DD HH24:MI') AS approved_at,
             note, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
             COALESCE(created_by, 'Admin') AS entry_by
      FROM entries
      WHERE COALESCE(is_deleted, false) = false
      ORDER BY entry_date DESC, id DESC
    `,
    sql`
      SELECT id, to_char(expense_date, 'YYYY-MM-DD') AS entry_date,
             title, category, amount::float AS amount, payment_method,
             paid_to, phone, from_bank, to_bank,
             linked_entry_id, linked_client,
             COALESCE(status, 'pending') AS status,
             approved_by, to_char(approved_at, 'YYYY-MM-DD HH24:MI') AS approved_at,
             note, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
             COALESCE(created_by, 'Admin') AS entry_by
      FROM expenses
      WHERE COALESCE(is_deleted, false) = false
      ORDER BY expense_date DESC, id DESC
    `
  ]);

  // Set of entry IDs in 'entries' that were created by syncing an expense
  const linkedEntryIds = new Set(
    expenseRows.filter((x) => x.linked_entry_id).map((x) => x.linked_entry_id)
  );

  const all = [];

  customerBills.forEach((b) => {
    const isPaymentOnly = (Number(b.amount) || 0) === 0 && (Number(b.payment) || 0) > 0;
    const isPureBill = (Number(b.payment) || 0) === 0;
    const transAmount = isPaymentOnly ? Number(b.payment || 0) : Number(b.amount || 0);
    const flow = isPaymentOnly ? 'in' : isPureBill ? 'none' : 'in_bill';

    all.push({
      uid: `customer_bill_${b.id}`,
      id: b.id,
      source: 'customer_bill',
      sourceLabel: isPaymentOnly ? 'Customer Payment' : 'Customer Bill',
      date: b.entry_date,
      party: b.customer_name,
      customerName: b.customer_name,
      customerMobile: b.customer_mobile,
      customerAddress: b.customer_address,
      customerId: b.customer_id,
      items: b.items,
      labourCharge: Number(b.labour_charge || 0),
      transportCost: Number(b.transport_cost || 0),
      discount: Number(b.discount || 0),
      title: isPaymentOnly
        ? `Payment Received: ${b.customer_name}`
        : b.bill_no ? `Bill #${b.bill_no}` : `Invoice: ${b.customer_name}`,
      subType: isPaymentOnly ? 'Customer Payment' : 'Customer Invoice',
      billNo: b.bill_no || '—',
      amount: transAmount,
      totalBill: Number(b.amount || 0),
      payment: Number(b.payment || 0),
      due: Number(b.due || 0),
      flow,
      method: b.payment > 0 ? 'Received' : 'Billed',
      fromBank: null,
      toBank: null,
      status: b.status || 'pending',
      approvedBy: b.approved_by,
      approvedAt: b.approved_at,
      entryBy: b.entry_by || 'Admin',
      note: b.note || '',
      createdAt: b.created_at,
    });
  });

  entriesRows.forEach((e) => {
    // Deduplication: If this ledger entry is the synced shadow of an expense, skip it so it doesn't show twice
    if (e.linked_expense_id || linkedEntryIds.has(e.id)) {
      return;
    }

    const isBill = e.type === 'bill';
    all.push({
      uid: `dealer_supplier_${e.id}`,
      id: e.id,
      source: 'dealer_supplier',
      sourceLabel: 'Dealer / Supplier',
      date: e.entry_date,
      party: e.client_name,
      type: e.type,
      title: isBill ? `Bill from ${e.client_name}` : `Payment to ${e.client_name}`,
      subType: isBill ? 'Purchase Bill' : 'Payment',
      billNo: e.bill_no || '—',
      weight: e.weight || null,
      amount: e.amount || 0,
      payment: isBill ? 0 : e.amount || 0,
      due: isBill ? e.amount || 0 : 0,
      flow: isBill ? 'none' : 'out',
      items: e.items || null,
      labourCost: Number(e.labour_cost || 0),
      transportCost: Number(e.transport_cost || 0),
      method: isBill ? 'Bill' : (e.from_bank || 'Cash'),
      fromBank: e.from_bank || null,
      toBank: e.to_bank || null,
      status: e.status || 'pending',
      approvedBy: e.approved_by,
      approvedAt: e.approved_at,
      entryBy: e.entry_by || 'Admin',
      note: e.note || '',
      createdAt: e.created_at,
    });
  });

  expenseRows.forEach((x) => {
    const isSynced = Boolean(x.linked_entry_id || x.linked_client);
    all.push({
      uid: `expense_${x.id}`,
      id: x.id,
      source: 'expense',
      sourceLabel: 'Expense Tracker',
      isSynced,
      linkedClient: x.linked_client || x.paid_to || null,
      linkedEntryId: x.linked_entry_id || null,
      date: x.entry_date,
      expenseDate: x.entry_date,
      party: x.paid_to || x.title,
      paidTo: x.paid_to || '',
      paid_to: x.paid_to || '',
      phone: x.phone || '',
      title: x.title,
      category: x.category || 'Expense',
      subType: x.category || 'Expense',
      billNo: '—',
      amount: x.amount || 0,
      payment: x.amount || 0,
      due: 0,
      flow: 'out',
      method: x.payment_method || 'Cash',
      paymentMethod: x.payment_method || 'Cash',
      payment_method: x.payment_method || 'Cash',
      fromBank: x.from_bank || null,
      from_bank: x.from_bank || null,
      toBank: x.to_bank || null,
      to_bank: x.to_bank || null,
      status: x.status || 'pending',
      approvedBy: x.approved_by,
      approvedAt: x.approved_at,
      entryBy: x.entry_by || 'Admin',
      note: x.note || '',
      createdAt: x.created_at,
    });
  });

  all.sort((a, b) => {
    const dtDiff = (b.date || '').localeCompare(a.date || '');
    if (dtDiff !== 0) return dtDiff;
    return b.id - a.id;
  });

  return all;
}

export async function updateSystemEntryStatus(source, id, status, approvedBy = null) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const numId = Number(id);
  const approvedAt = status === 'approved' ? new Date().toISOString() : null;
  const approver = status === 'approved' ? (approvedBy || 'Admin') : null;

  if (source === 'customer_bill') {
    await sql`
      UPDATE customer_bills
      SET status = ${status}, approved_by = ${approver}, approved_at = ${approvedAt}
      WHERE id = ${numId}
    `;
    return true;
  }

  if (source === 'dealer_supplier') {
    const [ent] = await sql`SELECT linked_expense_id FROM entries WHERE id = ${numId}`;
    await sql`
      UPDATE entries
      SET status = ${status}, approved_by = ${approver}, approved_at = ${approvedAt}
      WHERE id = ${numId}
    `;
    if (ent?.linked_expense_id) {
      await sql`
        UPDATE expenses
        SET status = ${status}, approved_by = ${approver}, approved_at = ${approvedAt}
        WHERE id = ${ent.linked_expense_id}
      `;
    }
    return true;
  }

  if (source === 'expense') {
    const [exp] = await sql`SELECT linked_entry_id FROM expenses WHERE id = ${numId}`;
    await sql`
      UPDATE expenses
      SET status = ${status}, approved_by = ${approver}, approved_at = ${approvedAt}
      WHERE id = ${numId}
    `;
    if (exp?.linked_entry_id) {
      await sql`
        UPDATE entries
        SET status = ${status}, approved_by = ${approver}, approved_at = ${approvedAt}
        WHERE id = ${exp.linked_entry_id}
      `;
    }
    return true;
  }

  throw new Error("Unknown entry source: " + source);
}

export async function updateSystemEntry(source, id, data) {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  const numId = Number(id);

  if (source === 'customer_bill') {
    const totalBill = Number(data.amount || 0);
    const clientPay = Number(data.payment || 0);
    const dueAdv = totalBill - clientPay;
    await sql`
      UPDATE customer_bills
      SET bill_date = ${data.date || new Date().toISOString().slice(0, 10)},
          customer_name = ${data.party},
          bill_no = ${data.billNo || null},
          total_bill = ${totalBill},
          client_payment = ${clientPay},
          due_advance = ${dueAdv},
          note = ${data.note || null}
      WHERE id = ${numId}
    `;
    return true;
  }

  if (source === 'dealer_supplier') {
    const [ent] = await sql`SELECT linked_expense_id FROM entries WHERE id = ${numId}`;
    await sql`
      UPDATE entries
      SET entry_date = ${data.date || new Date().toISOString().slice(0, 10)},
          client_name = ${data.party},
          amount = ${Number(data.amount || 0)},
          bill_no = ${data.billNo || null},
          from_bank = ${data.fromBank || null},
          to_bank = ${data.toBank || null},
          note = ${data.note || null}
      WHERE id = ${numId}
    `;
    if (ent?.linked_expense_id) {
      await sql`
        UPDATE expenses
        SET expense_date = ${data.date || new Date().toISOString().slice(0, 10)},
            paid_to = ${data.party || null},
            amount = ${Number(data.amount || 0)},
            from_bank = ${data.fromBank || null},
            to_bank = ${data.toBank || null}
        WHERE id = ${ent.linked_expense_id}
      `;
    }
    return true;
  }

  if (source === 'expense') {
    const [exp] = await sql`SELECT linked_entry_id FROM expenses WHERE id = ${numId}`;
    await sql`
      UPDATE expenses
      SET expense_date = ${data.date || data.expense_date || new Date().toISOString().slice(0, 10)},
          title = ${data.title || data.party},
          category = ${data.category || data.subType || 'Other'},
          amount = ${Number(data.amount || 0)},
          paid_to = ${data.paid_to !== undefined ? (data.paid_to || null) : (data.party || null)},
          phone = ${data.phone || null},
          payment_method = ${data.payment_method || data.method || 'Cash'},
          from_bank = ${data.from_bank !== undefined ? (data.from_bank || null) : (data.fromBank || null)},
          to_bank = ${data.to_bank !== undefined ? (data.to_bank || null) : (data.toBank || null)},
          note = ${data.note || null}
      WHERE id = ${numId}
    `;
    if (exp?.linked_entry_id) {
      await sql`
        UPDATE entries
        SET entry_date = ${data.date || data.expense_date || new Date().toISOString().slice(0, 10)},
            client_name = ${data.paid_to || data.party},
            amount = ${Number(data.amount || 0)},
            from_bank = ${data.from_bank || data.fromBank || null},
            to_bank = ${data.to_bank || data.toBank || null},
            note = ${data.note ? `Expense: ${data.title || data.party} | ${data.note}` : `Expense: ${data.title || data.party}`}
        WHERE id = ${exp.linked_entry_id}
      `;
    }
    return true;
  }

  throw new Error("Unknown entry source: " + source);
}

export async function deleteSystemEntry(source, id, permanent = false, deleted_by = 'Admin') {
  if (source === 'customer_bill') {
    return await deleteCustomerBill(id, permanent, deleted_by);
  }
  if (source === 'dealer_supplier') {
    return await deleteEntry(id, permanent, deleted_by);
  }
  if (source === 'expense') {
    return await deleteExpense(id, permanent, deleted_by);
  }
  throw new Error("Unknown entry source: " + source);
}

export async function getUnifiedRecycleBin() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);

  const [customerBills, entriesRows, expenseRows] = await Promise.all([
    sql`
      SELECT id, to_char(bill_date, 'YYYY-MM-DD') AS entry_date,
             bill_no, customer_name, customer_mobile, customer_address, customer_id,
             items, labour_charge::float AS labour_charge, transport_cost::float AS transport_cost,
             discount::float AS discount,
             total_bill::float AS amount, client_payment::float AS payment,
             due_advance::float AS due,
             note,
             to_char(deleted_at, 'YYYY-MM-DD HH24:MI') AS deleted_at,
             COALESCE(deleted_by, 'Admin') AS deleted_by
      FROM customer_bills
      WHERE is_deleted = true
      ORDER BY deleted_at DESC NULLS LAST, id DESC
    `,
    sql`
      SELECT id, to_char(entry_date, 'YYYY-MM-DD') AS entry_date,
             client_name, type, bill_no, weight::float AS weight,
             amount::float AS amount, from_bank, to_bank,
             items, labour_cost::float AS labour_cost, transport_cost::float AS transport_cost,
             linked_expense_id,
             note,
             to_char(deleted_at, 'YYYY-MM-DD HH24:MI') AS deleted_at,
             COALESCE(deleted_by, 'Admin') AS deleted_by
      FROM entries
      WHERE is_deleted = true
      ORDER BY deleted_at DESC NULLS LAST, id DESC
    `,
    sql`
      SELECT id, to_char(expense_date, 'YYYY-MM-DD') AS entry_date,
             title, category, amount::float AS amount, payment_method,
             paid_to, phone, from_bank, to_bank,
             linked_entry_id, linked_client,
             note,
             to_char(deleted_at, 'YYYY-MM-DD HH24:MI') AS deleted_at,
             COALESCE(deleted_by, 'Admin') AS deleted_by
      FROM expenses
      WHERE is_deleted = true
      ORDER BY deleted_at DESC NULLS LAST, id DESC
    `
  ]);

  const items = [];

  customerBills.forEach((b) => {
    const isPaymentOnly = (Number(b.amount) || 0) === 0 && (Number(b.payment) || 0) > 0;
    const transAmount = isPaymentOnly ? Number(b.payment || 0) : Number(b.amount || 0);

    items.push({
      uid: `recycle_customer_bill_${b.id}`,
      id: b.id,
      source: 'customer_bill',
      sourceLabel: 'Sales',
      subType: isPaymentOnly ? 'Customer Payment' : 'Customer Bill',
      date: b.entry_date,
      party: b.customer_name,
      customerName: b.customer_name,
      customerMobile: b.customer_mobile,
      billNo: b.bill_no || '—',
      amount: transAmount,
      payment: Number(b.payment || 0),
      due: Number(b.due || 0),
      note: b.note || '',
      deletedAt: b.deleted_at || '—',
      deletedBy: b.deleted_by || 'Admin',
    });
  });

  entriesRows.forEach((e) => {
    const isBill = e.type === 'bill';
    items.push({
      uid: `recycle_dealer_supplier_${e.id}`,
      id: e.id,
      source: 'dealer_supplier',
      sourceLabel: 'Purchase',
      subType: isBill ? 'Bill' : 'Payment',
      date: e.entry_date,
      party: e.client_name,
      billNo: e.bill_no || '—',
      amount: Number(e.amount || 0),
      payment: isBill ? 0 : Number(e.amount || 0),
      due: 0,
      note: e.note || '',
      deletedAt: e.deleted_at || '—',
      deletedBy: e.deleted_by || 'Admin',
    });
  });

  expenseRows.forEach((x) => {
    items.push({
      uid: `recycle_expense_${x.id}`,
      id: x.id,
      source: 'expense',
      sourceLabel: 'Expense',
      subType: x.category || 'Expense',
      date: x.entry_date,
      party: x.paid_to || x.title,
      title: x.title,
      billNo: '—',
      amount: Number(x.amount || 0),
      payment: Number(x.amount || 0),
      due: 0,
      note: x.note || '',
      deletedAt: x.deleted_at || '—',
      deletedBy: x.deleted_by || 'Admin',
    });
  });

  items.sort((a, b) => {
    if (a.deletedAt && b.deletedAt && a.deletedAt !== b.deletedAt) {
      return b.deletedAt.localeCompare(a.deletedAt);
    }
    return (b.id || 0) - (a.id || 0);
  });

  return items;
}

export async function restoreUnifiedItem(source, id) {
  if (source === 'customer_bill') {
    return await restoreCustomerBill(id);
  }
  if (source === 'dealer_supplier') {
    return await restoreEntry(id);
  }
  if (source === 'expense') {
    return await restoreExpense(id);
  }
  throw new Error("Unknown source: " + source);
}

export async function permanentDeleteUnifiedItem(source, id) {
  if (source === 'customer_bill') {
    return await permanentDeleteCustomerBill(id);
  }
  if (source === 'dealer_supplier') {
    return await deleteEntry(id, true);
  }
  if (source === 'expense') {
    return await deleteExpense(id, true);
  }
  throw new Error("Unknown source: " + source);
}

export async function emptyAllRecycleBin() {
  const sql = neon(getDatabaseUrl());
  await initPg(sql);
  await Promise.all([
    sql`DELETE FROM customer_bills WHERE is_deleted = true`,
    sql`DELETE FROM entries WHERE is_deleted = true`,
    sql`DELETE FROM expenses WHERE is_deleted = true`,
  ]);
  await sql`
    DELETE FROM customers
    WHERE is_deleted = true
      AND customer_id NOT IN (SELECT customer_id FROM customer_bills WHERE customer_id IS NOT NULL)
  `;
  return true;
}