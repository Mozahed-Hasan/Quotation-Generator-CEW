import postgres from "postgres";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("npg_xxxx") || url.includes("host/db")) {
    throw new Error("DATABASE_URL is missing or invalid. Please configure it in .env.local");
  }
  return url;
}


let _sqlInstance = null;
function getSql() {
  if (!_sqlInstance) {
    const url = getDatabaseUrl();
    _sqlInstance = postgres(url, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      transform: {
        value: (val) => {
          if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try {
              return JSON.parse(val);
            } catch (e) {
              return val;
            }
          }
          return val;
        }
      }
    });
  }
  return _sqlInstance;
}

let pgReady = false;
let initPromise = null;

async function initPg(sql) {
  if (pgReady) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Fast check: If system_settings already exists, all tables & schema are fully migrated
      try {
        await sql`SELECT 1 FROM system_settings LIMIT 1`;
        pgReady = true;
        return;
      } catch (checkErr) {
        // Schema missing or needs initial migration, run full DDL below
      }

      await sql.unsafe(`
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
        );
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS items JSONB;
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS labour_cost NUMERIC;
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS transport_cost NUMERIC;
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS deleted_by TEXT;
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS linked_expense_id INTEGER;
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS approved_by TEXT;
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS created_by TEXT;

        CREATE TABLE IF NOT EXISTS clients (
          name TEXT PRIMARY KEY,
          type TEXT NOT NULL DEFAULT 'dealer',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

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
        );
        ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
        ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
        ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS deleted_by TEXT;
        ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
        ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS approved_by TEXT;
        ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
        ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS created_by TEXT;
        ALTER TABLE customer_bills ADD COLUMN IF NOT EXISTS is_opening_balance BOOLEAN DEFAULT FALSE;

        CREATE TABLE IF NOT EXISTS customers (
          customer_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          mobile TEXT,
          address TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS alt_mobile TEXT;

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
        );
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_by TEXT;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS from_bank TEXT;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS to_bank TEXT;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS linked_client TEXT;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS linked_entry_id INTEGER;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by TEXT;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by TEXT;

        CREATE TABLE IF NOT EXISTS app_users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'moderator',
          permissions JSONB NOT NULL DEFAULT '{}',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS staff_profiles (
          staff_name TEXT PRIMARY KEY,
          monthly_salary NUMERIC NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

        CREATE TABLE IF NOT EXISTS staff_monthly_records (
          staff_name TEXT NOT NULL,
          month_key TEXT NOT NULL,
          attendance JSONB NOT NULL DEFAULT '{}',
          overtime JSONB NOT NULL DEFAULT '{}',
          prev_balance NUMERIC NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (staff_name, month_key)
        );

        CREATE TABLE IF NOT EXISTS work_orders (
          id SERIAL PRIMARY KEY,
          work_order_no TEXT UNIQUE,
          bill_id INT REFERENCES customer_bills(id) ON DELETE SET NULL,
          bill_no TEXT,
          order_date DATE NOT NULL DEFAULT CURRENT_DATE,
          target_delivery_date DATE,
          customer_name TEXT NOT NULL,
          customer_mobile TEXT,
          customer_address TEXT,
          site_location TEXT,
          items JSONB NOT NULL DEFAULT '[]',
          production_notes TEXT,
          priority TEXT NOT NULL DEFAULT 'Normal',
          status TEXT NOT NULL DEFAULT 'Pending',
          total_amount NUMERIC DEFAULT 0,
          advance_paid NUMERIC DEFAULT 0,
          due_amount NUMERIC DEFAULT 0,
          created_by TEXT DEFAULT 'Admin',
          is_deleted BOOLEAN DEFAULT FALSE,
          deleted_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL DEFAULT '{}',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT
        );

        CREATE TABLE IF NOT EXISTS bill_audit_logs (
          id SERIAL PRIMARY KEY,
          bill_id INTEGER,
          customer_id TEXT,
          action TEXT NOT NULL,
          actor_username TEXT NOT NULL DEFAULT 'Admin',
          actor_role TEXT NOT NULL DEFAULT 'admin',
          before_data JSONB,
          after_data JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_bill_audit_logs_bill ON bill_audit_logs(bill_id);
        CREATE INDEX IF NOT EXISTS idx_bill_audit_logs_created ON bill_audit_logs(created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_customer_bills_date ON customer_bills(bill_date DESC);
        CREATE INDEX IF NOT EXISTS idx_customer_bills_cid ON customer_bills(customer_id);
        CREATE INDEX IF NOT EXISTS idx_customer_bills_mobile ON customer_bills(customer_mobile);
        CREATE INDEX IF NOT EXISTS idx_customer_bills_deleted ON customer_bills(is_deleted);
        CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
        CREATE INDEX IF NOT EXISTS idx_customers_alt_mobile ON customers(alt_mobile);
        CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(entry_date DESC);
        CREATE INDEX IF NOT EXISTS idx_entries_deleted ON entries(is_deleted);
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
        CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(is_deleted);
        CREATE INDEX IF NOT EXISTS idx_work_orders_date ON work_orders(order_date DESC);
        CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
        CREATE INDEX IF NOT EXISTS idx_work_orders_deleted ON work_orders(is_deleted);
      `);
      pgReady = true;
    } catch (err) {
      console.error("initPg error:", err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

let cachedLock = null;
let lastLockCheck = 0;

export async function getSystemSetting(key, defaultValue = null) {
  const sql = getSql();
  await initPg(sql);
  const [row] = await sql`
    SELECT value
    FROM system_settings
    WHERE key = ${key}
  `;
  if (!row) return defaultValue;
  return row.value;
}

export async function setSystemSetting(key, value, updatedBy = "admin") {
  const sql = getSql();
  await initPg(sql);
  const valJson = JSON.stringify(value);
  await sql`
    INSERT INTO system_settings (key, value, updated_at, updated_by)
    VALUES (${key}, ${valJson}::jsonb, now(), ${updatedBy})
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now(),
        updated_by = EXCLUDED.updated_by
  `;
  cachedLock = null;
  lastLockCheck = 0;
  return true;
}

export async function isDatabaseStealthLocked() {
  const now = Date.now();
  if (cachedLock !== null && now - lastLockCheck < 4000) {
    return cachedLock;
  }
  try {
    const lock = await getSystemSetting("database_stealth_lock", { locked: false });
    cachedLock = Boolean(lock?.locked);
    lastLockCheck = now;
    return cachedLock;
  } catch {
    return false;
  }
}

export function invalidateLockCache() {
  cachedLock = null;
  lastLockCheck = 0;
}

export async function getClients() {
  const sql = getSql();
  await initPg(sql);
  const rows = await sql`
    SELECT name, type
    FROM clients
    ORDER BY name ASC`;
  return rows;
}

export async function upsertClient(name, type = "dealer") {
  const sql = getSql();
  await initPg(sql);
  await sql`
    INSERT INTO clients (name, type)
    VALUES (${name}, ${type})
    ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type`;
  return { ok: true };
}

export async function getEntries() {
  const sql = getSql();
  await initPg(sql);
  const rows = await sql`
    SELECT id, to_char(entry_date,'YYYY-MM-DD') AS entry_date, client_name, type,
           bill_no, weight::float AS weight, amount::float AS amount,
           from_bank, to_bank, note, items,
           labour_cost::float AS labour_cost, transport_cost::float AS transport_cost,
           created_at
    FROM entries
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY entry_date ASC, id ASC`;
  return rows;
}

export async function createEntry(entry) {
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
  await initPg(sql);
  await sql`DELETE FROM entries WHERE client_name = ${clientName}`;
  await sql`DELETE FROM clients WHERE name = ${clientName}`;
  return true;
}

export async function getCustomerBills(search = "") {
  const sql = getSql();
  await initPg(sql);
  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    const rows = await sql`
      SELECT id, to_char(bill_date, 'YYYY-MM-DD') AS bill_date,
             bill_no, customer_name, customer_address, customer_mobile, customer_id,
             items, labour_charge::float AS labour_charge, transport_cost::float AS transport_cost,
             discount::float AS discount,
             total_bill::float AS total_bill, client_payment::float AS client_payment,
             due_advance::float AS due_advance, note, created_at,
             COALESCE(is_opening_balance, false) AS is_opening_balance
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
           due_advance::float AS due_advance, note, created_at,
           COALESCE(is_opening_balance, false) AS is_opening_balance
    FROM customer_bills
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY bill_date DESC, id DESC`;
  return rows;
}

export async function createCustomerBill(data) {
  const sql = getSql();
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
      created_by, is_opening_balance
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
      ${data.created_by || 'Admin'},
      ${data.is_opening_balance === true}
    )
    RETURNING id`;
  return row;
}

export async function updateCustomerBill(id, data) {
  const sql = getSql();
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
      note = ${data.note || null},
      is_opening_balance = ${data.is_opening_balance === true}
    WHERE id = ${Number(id)}
    RETURNING id`;
  return row;
}

export async function deleteCustomerBill(id, permanent = false, deleted_by = 'Admin') {
  const sql = getSql();
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

export async function getCustomerBillById(id) {
  const sql = getSql();
  await initPg(sql);
  const [row] = await sql`
    SELECT id, bill_no, bill_date, customer_name, customer_mobile, customer_id,
           items, labour_charge, transport_cost, discount, total_bill, client_payment, due_advance,
           note, is_opening_balance, is_deleted, created_by, deleted_by
    FROM customer_bills
    WHERE id = ${Number(id)}
    LIMIT 1`;
  return row || null;
}

let auditTableReady = false;
async function ensureBillAuditTable(sql) {
  if (auditTableReady) return;
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS bill_audit_logs (
      id SERIAL PRIMARY KEY,
      bill_id INTEGER,
      customer_id TEXT,
      action TEXT NOT NULL,
      actor_username TEXT NOT NULL DEFAULT 'Admin',
      actor_role TEXT NOT NULL DEFAULT 'admin',
      before_data JSONB,
      after_data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_bill_audit_logs_bill ON bill_audit_logs(bill_id);
    CREATE INDEX IF NOT EXISTS idx_bill_audit_logs_created ON bill_audit_logs(created_at DESC);
  `);
  auditTableReady = true;
}

export async function recordBillAuditLog({
  bill_id = null,
  customer_id = null,
  action,
  actor_username = "Admin",
  actor_role = "admin",
  before_data = null,
  after_data = null,
}) {
  try {
    const sql = getSql();
    await initPg(sql);
    await ensureBillAuditTable(sql);
    await sql`
      INSERT INTO bill_audit_logs (
        bill_id, customer_id, action, actor_username, actor_role, before_data, after_data
      )
      VALUES (
        ${bill_id !== null && bill_id !== undefined ? Number(bill_id) : null},
        ${customer_id || null},
        ${String(action)},
        ${String(actor_username || "Admin")},
        ${String(actor_role || "admin")},
        ${before_data ? JSON.stringify(before_data) : null},
        ${after_data ? JSON.stringify(after_data) : null}
      )`;
  } catch (err) {
    console.error("Failed to record bill audit log:", err);
  }
}

export async function getBillAuditLogs(limit = 100) {
  const sql = getSql();
  await initPg(sql);
  await ensureBillAuditTable(sql);
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return await sql`
    SELECT id, bill_id, customer_id, action, actor_username, actor_role, before_data, after_data, created_at
    FROM bill_audit_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ${safeLimit}`;
}

export async function restoreCustomerBill(id) {
  const sql = getSql();
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
  const sql = getSql();
  await initPg(sql);
  const rows = await sql`
    SELECT customer_id, name, mobile, alt_mobile, address
    FROM customers
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY updated_at DESC, name ASC`;
  return rows;
}

export async function mergeCustomers({ sourceCustomerId, targetCustomerId, targetName, targetMobile, targetAddress }) {
  const sql = getSql();
  await initPg(sql);

  if (!sourceCustomerId || !targetCustomerId) {
    throw new Error("Both source and target customer IDs are required");
  }

  const sCid = String(sourceCustomerId).trim();
  const tCid = String(targetCustomerId).trim();

  if (sCid.toLowerCase() === tCid.toLowerCase()) {
    throw new Error("Source and target customer cannot be the same account");
  }

  // 1. Get source and target customers
  const [sourceCustomer] = await sql`
    SELECT customer_id, name, mobile, alt_mobile, address
    FROM customers
    WHERE customer_id = ${sCid}
  `;

  const [targetCustomer] = await sql`
    SELECT customer_id, name, mobile, alt_mobile, address
    FROM customers
    WHERE customer_id = ${tCid}
  `;

  if (!sourceCustomer) {
    throw new Error(`Source customer (${sCid}) not found`);
  }
  if (!targetCustomer) {
    throw new Error(`Target customer (${tCid}) not found`);
  }

  // 2. Combine mobile numbers
  const sMobile = (sourceCustomer.mobile || "").trim();
  const tMobile = (targetMobile || targetCustomer.mobile || "").trim();
  let combinedAlt = (targetCustomer.alt_mobile || "").trim();

  const altList = combinedAlt ? combinedAlt.split(",").map((m) => m.trim()).filter(Boolean) : [];
  if (sourceCustomer.alt_mobile) {
    sourceCustomer.alt_mobile.split(",").forEach((m) => {
      const clean = m.trim();
      if (clean && !altList.includes(clean) && clean !== tMobile) {
        altList.push(clean);
      }
    });
  }
  if (sMobile && sMobile !== tMobile && !altList.includes(sMobile)) {
    altList.push(sMobile);
  }
  combinedAlt = altList.join(", ");

  const finalName = (targetName || targetCustomer.name || sourceCustomer.name).trim();
  const finalAddress = (targetAddress !== undefined && targetAddress !== "" ? targetAddress : (targetCustomer.address || sourceCustomer.address || "")).trim();

  // 3. Update target customer profile
  await sql`
    UPDATE customers
    SET name = ${finalName},
        mobile = ${tMobile},
        alt_mobile = ${combinedAlt || null},
        address = ${finalAddress || null},
        updated_at = now()
    WHERE customer_id = ${tCid}
  `;

  // 4. Update all bills belonging to source customer
  const updatedBills = await sql`
    UPDATE customer_bills
    SET customer_id = ${tCid},
        customer_name = ${finalName}
    WHERE customer_id = ${sCid}
    RETURNING id
  `;

  // 5. Update work orders
  await sql`
    UPDATE work_orders
    SET customer_name = ${finalName}
    WHERE customer_name = ${sourceCustomer.name}
       OR bill_id IN (
         SELECT id FROM customer_bills WHERE customer_id = ${tCid}
       )
  `;

  // 6. Soft delete source customer
  await sql`
    UPDATE customers
    SET is_deleted = true,
        deleted_at = now()
    WHERE customer_id = ${sCid}
  `;

  return {
    sourceCustomerId: sCid,
    sourceCustomerName: sourceCustomer.name,
    targetCustomerId: tCid,
    targetCustomerName: finalName,
    targetMobile: tMobile,
    altMobile: combinedAlt,
    billsTransferred: updatedBills.length,
  };
}

export async function deleteCustomerById(customerId, permanent = false, deleted_by = 'Admin') {
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
  await initPg(sql);
  await sql`DELETE FROM customer_bills WHERE is_deleted = true`;
  await sql`
    DELETE FROM customers
    WHERE is_deleted = true
      AND customer_id NOT IN (SELECT customer_id FROM customer_bills WHERE customer_id IS NOT NULL)`;
  return true;
}

export async function restoreAllRecycleBin() {
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
  await initPg(sql);
  const rows = await sql`
    SELECT id, username, role, permissions, is_active, created_by, created_at
    FROM app_users ORDER BY id ASC`;
  return rows.map((r) => {
    if (typeof r.permissions === "string") {
      try {
        r.permissions = JSON.parse(r.permissions);
      } catch {
        r.permissions = {};
      }
    }
    return r;
  });
}

export async function getUserByUsername(username) {
  const sql = getSql();
  await initPg(sql);
  const [row] = await sql`SELECT * FROM app_users WHERE LOWER(username) = LOWER(${username}) LIMIT 1`;
  if (row && typeof row.permissions === "string") {
    try {
      row.permissions = JSON.parse(row.permissions);
    } catch {
      row.permissions = {};
    }
  }
  return row || null;
}

export async function getUserById(id) {
  const sql = getSql();
  await initPg(sql);
  const [row] = await sql`SELECT * FROM app_users WHERE id = ${Number(id)} LIMIT 1`;
  if (row && typeof row.permissions === "string") {
    try {
      row.permissions = JSON.parse(row.permissions);
    } catch {
      row.permissions = {};
    }
  }
  return row || null;
}

export async function createUser({ username, password_hash, role, permissions, created_by }) {
  const sql = getSql();
  await initPg(sql);
  const [row] = await sql`
    INSERT INTO app_users (username, password_hash, role, permissions, created_by)
    VALUES (${username}, ${password_hash}, ${role}, ${JSON.stringify(permissions || {})}, ${created_by || null})
    RETURNING id`;
  return row;
}

export async function updateUser(id, { role, permissions, is_active, password_hash }) {
  const sql = getSql();
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
  const sql = getSql();
  await initPg(sql);
  await sql`DELETE FROM app_users WHERE id = ${Number(id)}`;
  return true;
}

// -------------------------------------------------------------
// Unified System Entries (All Modules: Customer Bills, Ledger, Expenses)
// -------------------------------------------------------------
export async function getAllSystemEntries() {
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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
  const sql = getSql();
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

function parseJsonObj(val) {
  if (!val) return {};
  if (typeof val === "string") {
    try {
      const p = JSON.parse(val);
      return p && typeof p === "object" ? p : {};
    } catch {
      return {};
    }
  }
  return typeof val === "object" ? val : {};
}

export async function getStaffMonthData(monthKey) {
  const sql = getSql();
  await initPg(sql);

  const [profileRows, recordRows, expenseRows] = await Promise.all([
    sql`
      SELECT staff_name, monthly_salary::float AS monthly_salary,
             COALESCE(is_deleted, false) AS is_deleted
      FROM staff_profiles
      ORDER BY staff_name ASC
    `,
    sql`
      SELECT staff_name, month_key, attendance, overtime,
             prev_balance::float AS prev_balance
      FROM staff_monthly_records
      WHERE month_key = ${monthKey}
    `,
    sql`
      SELECT id, to_char(expense_date, 'YYYY-MM-DD') AS expense_date,
             EXTRACT(DAY FROM expense_date)::int AS day_num,
             title, category, amount::float AS amount,
             payment_method, paid_to, note
      FROM expenses
      WHERE COALESCE(is_deleted, false) = false
        AND to_char(expense_date, 'YYYY-MM') = ${monthKey}
        AND LOWER(COALESCE(category, '')) IN ('salary', 'overtime')
      ORDER BY expense_date ASC, id ASC
    `,
  ]);

  const profiles = {};
  const deletedStaff = [];
  for (const p of profileRows) {
    if (p.is_deleted) {
      deletedStaff.push(p.staff_name);
    } else {
      profiles[p.staff_name] = {
        staff_name: p.staff_name,
        monthly_salary: Number(p.monthly_salary || 0),
      };
    }
  }

  const records = {};
  for (const r of recordRows) {
    records[r.staff_name] = {
      staff_name: r.staff_name,
      month_key: r.month_key,
      attendance: parseJsonObj(r.attendance),
      overtime: parseJsonObj(r.overtime),
      prev_balance: Number(r.prev_balance || 0),
    };
  }

  return {
    monthKey,
    profiles,
    records,
    deletedStaff,
    expenses: expenseRows,
  };
}

export async function saveStaffAttendanceEntry({ staff_name, month_key, day, attendance, overtime }) {
  const sql = getSql();
  await initPg(sql);

  const name = String(staff_name || "").trim();
  const mKey = String(month_key || "").trim();
  const dKey = String(Number(day));
  if (!name || !mKey || !day) {
    throw new Error("Staff name, month, and day are required");
  }

  const [existing] = await sql`
    SELECT attendance, overtime, prev_balance
    FROM staff_monthly_records
    WHERE staff_name = ${name} AND month_key = ${mKey}
  `;

  const attObj = parseJsonObj(existing?.attendance);
  const otObj = parseJsonObj(existing?.overtime);

  if (attendance === "" || attendance === null || attendance === undefined) {
    delete attObj[dKey];
  } else {
    attObj[dKey] = Number(attendance);
  }

  if (overtime === "" || overtime === null || overtime === undefined || Number(overtime) === 0) {
    delete otObj[dKey];
  } else {
    otObj[dKey] = Number(overtime);
  }

  const [row] = await sql`
    INSERT INTO staff_monthly_records (staff_name, month_key, attendance, overtime, prev_balance, updated_at)
    VALUES (
      ${name},
      ${mKey},
      ${JSON.stringify(attObj)},
      ${JSON.stringify(otObj)},
      ${Number(existing?.prev_balance || 0)},
      now()
    )
    ON CONFLICT (staff_name, month_key) DO UPDATE
    SET attendance = EXCLUDED.attendance,
        overtime = EXCLUDED.overtime,
        updated_at = now()
    RETURNING staff_name, month_key, attendance, overtime, prev_balance::float AS prev_balance
  `;

  return {
    ...row,
    attendance: parseJsonObj(row.attendance),
    overtime: parseJsonObj(row.overtime),
  };
}

export async function saveStaffSetup({ staff_name, month_key, monthly_salary, prev_balance }) {
  const sql = getSql();
  await initPg(sql);

  const name = String(staff_name || "").trim();
  const mKey = String(month_key || "").trim();
  if (!name) throw new Error("Staff name is required");

  if (monthly_salary !== undefined) {
    await sql`
      INSERT INTO staff_profiles (staff_name, monthly_salary, updated_at)
      VALUES (${name}, ${Number(monthly_salary || 0)}, now())
      ON CONFLICT (staff_name) DO UPDATE
      SET monthly_salary = EXCLUDED.monthly_salary,
          updated_at = now()
    `;
  }

  if (mKey && prev_balance !== undefined) {
    await sql`
      INSERT INTO staff_monthly_records (staff_name, month_key, prev_balance, updated_at)
      VALUES (${name}, ${mKey}, ${Number(prev_balance || 0)}, now())
      ON CONFLICT (staff_name, month_key) DO UPDATE
      SET prev_balance = EXCLUDED.prev_balance,
          updated_at = now()
    `;
  }

  return { ok: true };
}

export async function saveBulkStaffAttendance({ month_key, day, entries }) {
  const sql = getSql();
  await initPg(sql);

  const mKey = String(month_key || "").trim();
  const dKey = String(Number(day));
  if (!mKey || !day || !Array.isArray(entries)) {
    throw new Error("month_key, day, and entries array are required");
  }

  for (const item of entries) {
    const name = String(item.staff_name || "").trim();
    if (!name) continue;
    await saveStaffAttendanceEntry({
      staff_name: name,
      month_key: mKey,
      day: dKey,
      attendance: item.attendance,
      overtime: item.overtime,
    });
  }

  return { ok: true };
}

export async function deleteStaffProfile(staff_name) {
  const sql = getSql();
  await initPg(sql);
  const name = String(staff_name || "").trim();
  if (!name) throw new Error("Staff name is required");

  await sql`
    INSERT INTO staff_profiles (staff_name, monthly_salary, is_deleted, updated_at)
    VALUES (${name}, 0, true, now())
    ON CONFLICT (staff_name) DO UPDATE
    SET is_deleted = true, updated_at = now()
  `;
  return { ok: true };
}

export async function updateStaffProfile({ old_name, new_name, monthly_salary }) {
  const sql = getSql();
  await initPg(sql);
  const oldName = String(old_name || "").trim();
  const newName = String(new_name || "").trim();
  const salary = Number(monthly_salary || 0);
  if (!oldName) throw new Error("Current staff name is required");
  if (!newName) throw new Error("New staff name is required");

  if (oldName !== newName) {
    const [exists] = await sql`
      SELECT staff_name FROM staff_profiles
      WHERE staff_name = ${newName} AND COALESCE(is_deleted, false) = false
    `;
    if (exists) {
      throw new Error(`A staff member named "${newName}" already exists`);
    }

    await sql`
      INSERT INTO staff_profiles (staff_name, monthly_salary, is_deleted, updated_at)
      VALUES (${newName}, ${salary}, false, now())
      ON CONFLICT (staff_name) DO UPDATE
      SET monthly_salary = ${salary}, is_deleted = false, updated_at = now()
    `;
    await sql`UPDATE staff_profiles SET is_deleted = true WHERE staff_name = ${oldName}`;
    await sql`UPDATE staff_monthly_records SET staff_name = ${newName} WHERE staff_name = ${oldName}`;
    await sql`UPDATE expenses SET paid_to = ${newName} WHERE paid_to = ${oldName}`;
  } else {
    await sql`
      INSERT INTO staff_profiles (staff_name, monthly_salary, is_deleted, updated_at)
      VALUES (${oldName}, ${salary}, false, now())
      ON CONFLICT (staff_name) DO UPDATE
      SET monthly_salary = ${salary}, is_deleted = false, updated_at = now()
    `;
  }

  return { ok: true, staff_name: newName, monthly_salary: salary };
}

// -------------------------------------------------------------
// WORK ORDERS (কারখানা ও প্রোডাকশন অর্ডার ট্র্যাকিং)
// -------------------------------------------------------------
export async function generateNextWorkOrderNo() {
  const sql = getSql();
  await initPg(sql);
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `WO-${ym}-`;
  const [row] = await sql`
    SELECT work_order_no
    FROM work_orders
    WHERE work_order_no LIKE ${prefix + '%'}
    ORDER BY id DESC
    LIMIT 1
  `;
  if (row && row.work_order_no) {
    const parts = row.work_order_no.split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) {
      return `${prefix}${String(num + 1).padStart(3, "0")}`;
    }
  }
  return `${prefix}001`;
}

export async function getWorkOrders({ status, search, from, to } = {}) {
  const sql = getSql();
  await initPg(sql);

  let query = sql`
    SELECT
      id,
      work_order_no,
      bill_id,
      bill_no,
      to_char(order_date, 'YYYY-MM-DD') AS order_date,
      to_char(target_delivery_date, 'YYYY-MM-DD') AS target_delivery_date,
      customer_name,
      customer_mobile,
      customer_address,
      site_location,
      items,
      production_notes,
      priority,
      status,
      total_amount::float AS total_amount,
      advance_paid::float AS advance_paid,
      due_amount::float AS due_amount,
      created_by,
      to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
      to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
    FROM work_orders
    WHERE COALESCE(is_deleted, false) = false
  `;

  if (status && status !== "all") {
    query = sql`${query} AND LOWER(status) = LOWER(${status})`;
  }

  if (search && search.trim()) {
    const s = `%${search.trim().toLowerCase()}%`;
    query = sql`${query} AND (
      LOWER(work_order_no) LIKE ${s}
      OR LOWER(customer_name) LIKE ${s}
      OR LOWER(customer_mobile) LIKE ${s}
      OR LOWER(COALESCE(bill_no, '')) LIKE ${s}
      OR LOWER(COALESCE(site_location, '')) LIKE ${s}
      OR LOWER(COALESCE(production_notes, '')) LIKE ${s}
    )`;
  }

  if (from) {
    query = sql`${query} AND order_date >= ${from}`;
  }
  if (to) {
    query = sql`${query} AND order_date <= ${to}`;
  }

  query = sql`${query} ORDER BY order_date DESC, id DESC`;

  const rows = await query;

  // Compute status summary counts
  const [countsRow] = await sql`
    SELECT
      COUNT(*)::int AS total_count,
      COUNT(*) FILTER (WHERE LOWER(status) = 'pending')::int AS pending_count,
      COUNT(*) FILTER (WHERE LOWER(status) = 'in production')::int AS in_production_count,
      COUNT(*) FILTER (WHERE LOWER(status) = 'ready')::int AS ready_count,
      COUNT(*) FILTER (WHERE LOWER(status) = 'delivered')::int AS delivered_count
    FROM work_orders
    WHERE COALESCE(is_deleted, false) = false
  `;

  return {
    workOrders: rows.map(r => ({
      ...r,
      items: (typeof r.items === 'string' ? parseJsonObj(r.items) : r.items) || [],
    })),
    counts: countsRow || {
      total_count: 0,
      pending_count: 0,
      in_production_count: 0,
      ready_count: 0,
      delivered_count: 0,
    },
  };
}

export async function getWorkOrderById(id) {
  const sql = getSql();
  await initPg(sql);
  const [row] = await sql`
    SELECT
      id,
      work_order_no,
      bill_id,
      bill_no,
      to_char(order_date, 'YYYY-MM-DD') AS order_date,
      to_char(target_delivery_date, 'YYYY-MM-DD') AS target_delivery_date,
      customer_name,
      customer_mobile,
      customer_address,
      site_location,
      items,
      production_notes,
      priority,
      status,
      total_amount::float AS total_amount,
      advance_paid::float AS advance_paid,
      due_amount::float AS due_amount,
      created_by,
      created_at,
      updated_at
    FROM work_orders
    WHERE id = ${Number(id)} AND COALESCE(is_deleted, false) = false
  `;
  if (!row) return null;
  return {
    ...row,
    items: (typeof row.items === 'string' ? parseJsonObj(row.items) : row.items) || [],
  };
}

export async function createWorkOrder(data) {
  const sql = getSql();
  await initPg(sql);

  const woNo = data.work_order_no || (await generateNextWorkOrderNo());
  const itemsJson = JSON.stringify(Array.isArray(data.items) ? data.items : []);

  const [row] = await sql`
    INSERT INTO work_orders (
      work_order_no,
      bill_id,
      bill_no,
      order_date,
      target_delivery_date,
      customer_name,
      customer_mobile,
      customer_address,
      site_location,
      items,
      production_notes,
      priority,
      status,
      total_amount,
      advance_paid,
      due_amount,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      ${woNo},
      ${data.bill_id ? Number(data.bill_id) : null},
      ${data.bill_no || null},
      ${data.order_date || new Date().toISOString().slice(0, 10)},
      ${data.target_delivery_date || null},
      ${String(data.customer_name || "").trim()},
      ${data.customer_mobile ? String(data.customer_mobile).trim() : null},
      ${data.customer_address ? String(data.customer_address).trim() : null},
      ${data.site_location ? String(data.site_location).trim() : null},
      ${itemsJson},
      ${data.production_notes ? String(data.production_notes).trim() : null},
      ${data.priority || 'Normal'},
      ${data.status || 'Pending'},
      ${Number(data.total_amount || 0)},
      ${Number(data.advance_paid || 0)},
      ${Number(data.due_amount || 0)},
      ${data.created_by || 'Admin'},
      now(),
      now()
    )
    RETURNING id, work_order_no, status
  `;

  return row;
}

export async function updateWorkOrder(id, data) {
  const sql = getSql();
  await initPg(sql);

  const itemsJson = data.items !== undefined ? JSON.stringify(Array.isArray(data.items) ? data.items : []) : null;

  const [row] = await sql`
    UPDATE work_orders
    SET
      customer_name = COALESCE(${data.customer_name ? String(data.customer_name).trim() : null}, customer_name),
      customer_mobile = COALESCE(${data.customer_mobile !== undefined ? String(data.customer_mobile).trim() : null}, customer_mobile),
      customer_address = COALESCE(${data.customer_address !== undefined ? String(data.customer_address).trim() : null}, customer_address),
      site_location = COALESCE(${data.site_location !== undefined ? String(data.site_location).trim() : null}, site_location),
      target_delivery_date = COALESCE(${data.target_delivery_date || null}, target_delivery_date),
      production_notes = COALESCE(${data.production_notes !== undefined ? String(data.production_notes).trim() : null}, production_notes),
      priority = COALESCE(${data.priority || null}, priority),
      status = COALESCE(${data.status || null}, status),
      items = COALESCE(${itemsJson}, items),
      total_amount = COALESCE(${data.total_amount !== undefined ? Number(data.total_amount) : null}, total_amount),
      advance_paid = COALESCE(${data.advance_paid !== undefined ? Number(data.advance_paid) : null}, advance_paid),
      due_amount = COALESCE(${data.due_amount !== undefined ? Number(data.due_amount) : null}, due_amount),
      updated_at = now()
    WHERE id = ${Number(id)}
    RETURNING id, work_order_no, status
  `;
  return row;
}

export async function updateWorkOrderStatus(id, status) {
  const sql = getSql();
  await initPg(sql);
  const [row] = await sql`
    UPDATE work_orders
    SET status = ${status}, updated_at = now()
    WHERE id = ${Number(id)}
    RETURNING id, work_order_no, status
  `;
  return row;
}

export async function deleteWorkOrder(id) {
  const sql = getSql();
  await initPg(sql);
  await sql`
    UPDATE work_orders
    SET is_deleted = true, deleted_at = now()
    WHERE id = ${Number(id)}
  `;
  return { ok: true };
}
