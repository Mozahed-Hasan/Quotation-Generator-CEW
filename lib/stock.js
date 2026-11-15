import { getSql } from "./db.js";

/**
 * Categorize a material by its name and unit.
 */
export function getMaterialCategory(name, unit) {
  const n = (name || "").toLowerCase().trim();
  const u = (unit || "").toLowerCase().trim();
  if (
    u === "kg" ||
    u === "ton" ||
    n.includes("angle") ||
    n.includes("pipe") ||
    (n.includes("sheet") && !n.includes("profile")) ||
    n.includes("iron") ||
    n.includes("steel") ||
    n.includes("rod") ||
    n.includes("plate") ||
    n.includes("shutter")
  ) {
    return "Steel & Metal (KG)";
  }
  if (u === "sft" || n.includes("profile") || n.includes("insulation") || n.includes("cork")) {
    return "Roofing & Panels (SFT)";
  }
  if (u === "rft" || n.includes("tua") || n.includes("drain") || n.includes("gutter") || n.includes("side cap") || n.includes("channel")) {
    return "Flashing & Gutters (RFT)";
  }
  return "Hardware & Accessories (PCS)";
}

/**
 * Get comprehensive multi-unit stock summary & itemized inventory.
 * Covers:
 *  - Weight (KG / Tons) for Steel, Angles, Metal Sheets
 *  - Area (SFT) for Profile Sheets & Insulation
 *  - Length (RFT) for Tua, Drains & Gutters
 *  - Count (PCS) for Hardware & Accessories
 */
export async function getStockSummary() {
  const sql = getSql();

  // 1. Fetch all purchase bills
  const purchaseEntries = await sql`
    SELECT id, entry_date, client_name, bill_no, weight, amount, items, note
    FROM entries 
    WHERE type = 'bill' 
      AND COALESCE(is_deleted, false) = false
  `;

  // 2. Fetch all sales bills
  const salesBills = await sql`
    SELECT id, bill_date, customer_name, bill_no, items, total_bill, note
    FROM customer_bills 
    WHERE COALESCE(is_deleted, false) = false
  `;

  // 3. Fetch adjustments / scrap
  const adjustments = await sql`
    SELECT id, adjustment_date, type, item_name, weight_kg, rate_per_kg, notes, COALESCE(unit, 'kg') as unit
    FROM stock_adjustments 
    WHERE COALESCE(is_deleted, false) = false
  `;

  // 4. Fetch Work Orders (Option 3 Job Costing)
  const [wos] = await sql`
    SELECT 
      COALESCE(SUM(raw_weight_issued), 0)::float AS wo_raw_issued_kg,
      COALESCE(SUM(finished_weight), 0)::float AS wo_finished_kg,
      COALESCE(SUM(scrap_weight), 0)::float AS wo_scrap_kg,
      COUNT(id)::int AS wo_count
    FROM work_orders 
    WHERE COALESCE(is_deleted, false) = false
  `;

  const itemsMap = {};

  function getOrCreateItem(name, unit) {
    const cleanName = (name || "General Raw Material").trim();
    let cleanUnit = (unit || "pcs").toLowerCase().trim();
    if (cleanUnit === "ton") cleanUnit = "kg";

    const key = `${cleanName.toLowerCase()}____${cleanUnit}`;
    if (!itemsMap[key]) {
      itemsMap[key] = {
        name: cleanName,
        category: getMaterialCategory(cleanName, cleanUnit),
        unit: cleanUnit,
        purchasedQty: 0,
        purchasedCost: 0,
        soldQty: 0,
        scrapQty: 0,
        adjustmentsQty: 0,
        currentStock: 0,
        avgRate: 0,
        stockValue: 0,
      };
    }
    return itemsMap[key];
  }

  // 1. Process Purchases IN
  let totalPurchasedKgLegacy = 0;
  let totalPurchaseAmountAll = 0;
  let purchaseBillsCount = purchaseEntries.length;

  purchaseEntries.forEach((p) => {
    totalPurchaseAmountAll += Number(p.amount || 0);
    const pWeight = Number(p.weight || 0);
    if (pWeight > 0) {
      totalPurchasedKgLegacy += pWeight;
    }

    let its = p.items;
    if (typeof its === "string") {
      try {
        its = JSON.parse(its);
      } catch (e) {}
    }

    if (Array.isArray(its) && its.length > 0) {
      its.forEach((it) => {
        const rawName = (it.name || "Raw Material").trim();
        let u = (it.unit || "").toLowerCase().trim();
        let q = it.quantity != null && it.quantity !== "" ? parseFloat(it.quantity) : null;
        let sub = parseFloat(it.subtotal) || 0;
        let r = parseFloat(it.rate) || 0;

        if (q == null && r > 0 && sub > 0) {
          q = Math.round((sub / r) * 1000) / 1000;
        }

        if (!u) {
          const nLower = rawName.toLowerCase();
          if (nLower.includes("profile") || nLower.includes("insulation") || nLower.includes("cork")) u = "sft";
          else if (nLower.includes("tua") || nLower.includes("drain") || nLower.includes("gutter") || nLower.includes("side cap")) u = "rft";
          else if (nLower.includes("sheet") || nLower.includes("iron") || nLower.includes("angle") || it.weight) u = "kg";
          else u = "pcs";
        }

        if (q == null && it.weight) q = parseFloat(it.weight);
        if (u === "ton") {
          u = "kg";
          if (q) q *= 1000;
        }

        const itemRecord = getOrCreateItem(rawName, u);
        itemRecord.purchasedQty += q || 0;
        itemRecord.purchasedCost += sub;
      });
    } else if (pWeight > 0) {
      const itemRecord = getOrCreateItem("General MS Raw Steel", "kg");
      itemRecord.purchasedQty += pWeight;
      itemRecord.purchasedCost += Number(p.amount || 0);
    }
  });

  // 2. Process Sales OUT
  let totalSoldKgLegacy = 0;
  let salesItemsCount = 0;

  salesBills.forEach((s) => {
    let its = s.items;
    if (typeof its === "string") {
      try {
        its = JSON.parse(its);
      } catch (e) {}
    }

    if (Array.isArray(its)) {
      its.forEach((it) => {
        salesItemsCount++;
        const rawName = (it.item_name || it.name || "Sold Item").trim();
        let u = (it.unit || "pcs").toLowerCase().trim();
        let q = parseFloat(it.quantity) || 0;

        if (u === "ton") {
          u = "kg";
          q *= 1000;
        }

        if (u === "kg") {
          totalSoldKgLegacy += q;
          // Match with known metal raw materials or record under Fabricated Metal Goods
          const nLower = rawName.toLowerCase();
          let matchedKey = null;
          for (const k of Object.keys(itemsMap)) {
            if (itemsMap[k].unit === "kg" && nLower.includes(itemsMap[k].name.toLowerCase())) {
              matchedKey = k;
              break;
            }
          }
          if (matchedKey) {
            itemsMap[matchedKey].soldQty += q;
          } else {
            const itemRecord = getOrCreateItem("Fabricated Metal Output", "kg");
            itemRecord.soldQty += q;
          }
        } else if (u === "sft") {
          const nLower = rawName.toLowerCase();
          if (nLower.includes("profile")) {
            const itemRecord = getOrCreateItem("Profile Sheet", "sft");
            itemRecord.soldQty += q;
          } else if (nLower.includes("insulation")) {
            const itemRecord = getOrCreateItem("Insulation", "sft");
            itemRecord.soldQty += q;
          } else {
            const itemRecord = getOrCreateItem(rawName, "sft");
            itemRecord.soldQty += q;
          }
        } else if (u === "rft") {
          const nLower = rawName.toLowerCase();
          if (nLower.includes("tua")) {
            const itemRecord = getOrCreateItem("Tua", "rft");
            itemRecord.soldQty += q;
          } else {
            const itemRecord = getOrCreateItem(rawName, "rft");
            itemRecord.soldQty += q;
          }
        } else if (u === "pcs" || u === "pac" || u === "box" || u === "bundle") {
          const nLower = rawName.toLowerCase();
          if (nLower.includes("cap") || nLower.includes("l cap") || nLower.includes("l-cap")) {
            const itemRecord = getOrCreateItem("L Cap", "pcs");
            itemRecord.soldQty += q;
          }
        }
      });
    }
  });

  // 3. Process Adjustments and Scrap
  let totalScrapKgLegacy = 0;
  let totalAdjustmentsKgLegacy = 0;

  adjustments.forEach((a) => {
    const u = (a.unit || "kg").toLowerCase().trim();
    const w = Number(a.weight_kg || 0);
    const isAddition = a.type === "correction_add" || a.type === "initial_stock";

    if (u === "kg") {
      if (a.type === "scrap" || a.type === "wastage") {
        totalScrapKgLegacy += w;
      } else if (a.type === "correction_add") {
        totalAdjustmentsKgLegacy += w;
      } else if (a.type === "correction_sub") {
        totalAdjustmentsKgLegacy -= w;
      }
    }

    const itemRecord = getOrCreateItem(a.item_name || "General Raw Material", u);
    if (a.type === "scrap" || a.type === "wastage") {
      itemRecord.scrapQty += w;
    } else if (isAddition) {
      itemRecord.adjustmentsQty += w;
    } else {
      itemRecord.adjustmentsQty -= w;
    }
  });

  // 4. Compute Unit Summaries & Items Inventory
  const unitsSummary = {
    kg: {
      key: "kg",
      label: "Steel & Metal Raw Materials",
      unit: "KG",
      purchasedQty: 0,
      soldQty: 0,
      scrapQty: 0,
      currentStock: 0,
      currentStockTons: 0,
      purchasedCost: 0,
      avgRate: 0,
      estimatedValue: 0,
      isLowStock: false,
    },
    sft: {
      key: "sft",
      label: "Roofing & Panels",
      unit: "SFT",
      purchasedQty: 0,
      soldQty: 0,
      scrapQty: 0,
      currentStock: 0,
      purchasedCost: 0,
      avgRate: 0,
      estimatedValue: 0,
      isLowStock: false,
    },
    rft: {
      key: "rft",
      label: "Flashing, Gutters & Caps",
      unit: "RFT",
      purchasedQty: 0,
      soldQty: 0,
      scrapQty: 0,
      currentStock: 0,
      purchasedCost: 0,
      avgRate: 0,
      estimatedValue: 0,
      isLowStock: false,
    },
    pcs: {
      key: "pcs",
      label: "Hardware & Accessories",
      unit: "PCS",
      purchasedQty: 0,
      soldQty: 0,
      scrapQty: 0,
      currentStock: 0,
      purchasedCost: 0,
      avgRate: 0,
      estimatedValue: 0,
      isLowStock: false,
    },
  };

  const itemsInventory = Object.values(itemsMap).map((it) => {
    it.avgRate = it.purchasedQty > 0 ? it.purchasedCost / it.purchasedQty : 0;
    it.currentStock = it.purchasedQty - it.soldQty - it.scrapQty + it.adjustmentsQty;
    it.stockValue = Math.max(0, it.currentStock) * it.avgRate;

    // Determine status badge
    if (it.currentStock <= 0) {
      it.status = "Out of Stock";
    } else if (it.unit === "kg" && it.currentStock < 500) {
      it.status = "Low Stock";
    } else if (it.unit === "sft" && it.currentStock < 200) {
      it.status = "Low Stock";
    } else {
      it.status = "In Stock";
    }

    const uKey = it.unit;
    if (unitsSummary[uKey]) {
      unitsSummary[uKey].purchasedQty += it.purchasedQty;
      unitsSummary[uKey].soldQty += it.soldQty;
      unitsSummary[uKey].scrapQty += it.scrapQty;
      unitsSummary[uKey].currentStock += it.currentStock;
      unitsSummary[uKey].purchasedCost += it.purchasedCost;
      unitsSummary[uKey].estimatedValue += it.stockValue;
    }

    return it;
  });

  // Calculate unit rates & statuses
  for (const u of Object.keys(unitsSummary)) {
    const s = unitsSummary[u];
    s.avgRate = s.purchasedQty > 0 ? s.purchasedCost / s.purchasedQty : 0;
    if (u === "kg") {
      s.currentStockTons = s.currentStock / 1000;
      s.isLowStock = s.currentStock < 2000;
    } else {
      s.isLowStock = s.currentStock < 100;
    }
  }

  // Legacy weight values
  const currentStockKgLegacy = totalPurchasedKgLegacy - totalSoldKgLegacy - totalScrapKgLegacy + totalAdjustmentsKgLegacy;
  const avgPurchaseRatePerKgLegacy = totalPurchasedKgLegacy > 0 ? totalPurchaseAmountAll / totalPurchasedKgLegacy : 0;
  const estimatedStockValueLegacy = Math.max(0, currentStockKgLegacy) * avgPurchaseRatePerKgLegacy;

  // Total valuation across ALL units
  const totalValuationAllUnits = Object.values(unitsSummary).reduce((acc, u) => acc + (u.estimatedValue || 0), 0);

  // Sort itemsInventory: items with positive stock and higher value first
  itemsInventory.sort((a, b) => {
    if (b.stockValue !== a.stockValue) return b.stockValue - a.stockValue;
    return b.currentStock - a.currentStock;
  });

  return {
    unitsSummary,
    itemsInventory,
    totalValuation: totalValuationAllUnits,

    // Legacy fields for backward compatibility
    totalPurchasedKg: totalPurchasedKgLegacy,
    totalPurchasedTons: totalPurchasedKgLegacy / 1000,
    totalPurchaseAmount: totalPurchaseAmountAll,
    purchaseCount: purchaseBillsCount,
    totalSoldKg: totalSoldKgLegacy,
    totalSoldTons: totalSoldKgLegacy / 1000,
    itemsSoldKgCount: salesItemsCount,
    totalScrapKg: totalScrapKgLegacy,
    totalScrapTons: totalScrapKgLegacy / 1000,
    totalAdjustmentsKg: totalAdjustmentsKgLegacy,
    currentStockKg: currentStockKgLegacy,
    currentStockTons: currentStockKgLegacy / 1000,
    avgPurchaseRatePerKg: avgPurchaseRatePerKgLegacy,
    estimatedStockValue: estimatedStockValueLegacy,
    lowStockThresholdKg: 2000,
    isLowStock: currentStockKgLegacy < 2000,
    workOrdersSummary: {
      rawIssuedKg: Number(wos.wo_raw_issued_kg || 0),
      finishedKg: Number(wos.wo_finished_kg || 0),
      scrapKg: Number(wos.wo_scrap_kg || 0),
      activeCount: Number(wos.wo_count || 0),
    },
  };
}

/**
 * Get chronological stock movements with proper native units.
 */
export async function getStockMovements({ limit = 250, type = "all", search = "" } = {}) {
  const sql = getSql();
  const movements = [];

  // 1. Fetch Purchase bills
  const purchases = await sql`
    SELECT id, entry_date, client_name, bill_no, weight, amount, note, items
    FROM entries 
    WHERE type = 'bill' 
      AND COALESCE(is_deleted, false) = false
    ORDER BY entry_date DESC, id DESC
    LIMIT 250
  `;

  purchases.forEach((p) => {
    let its = p.items;
    if (typeof its === "string") {
      try {
        its = JSON.parse(its);
      } catch (e) {}
    }

    if (Array.isArray(its) && its.length > 0) {
      its.forEach((it, idx) => {
        const rawName = (it.name || "Raw Material").trim();
        let u = (it.unit || "").toLowerCase().trim();
        let q = it.quantity != null && it.quantity !== "" ? parseFloat(it.quantity) : null;
        let sub = parseFloat(it.subtotal) || 0;
        let r = parseFloat(it.rate) || 0;

        if (q == null && r > 0 && sub > 0) {
          q = Math.round((sub / r) * 1000) / 1000;
        }

        if (!u) {
          const nLower = rawName.toLowerCase();
          if (nLower.includes("profile") || nLower.includes("insulation") || nLower.includes("cork")) u = "sft";
          else if (nLower.includes("tua") || nLower.includes("drain") || nLower.includes("side cap")) u = "rft";
          else if (nLower.includes("sheet") || nLower.includes("iron") || it.weight) u = "kg";
          else u = "pcs";
        }

        if (q == null && it.weight) q = parseFloat(it.weight);
        if (u === "ton") {
          u = "kg";
          if (q) q *= 1000;
        }

        const qtyVal = Number(q || 0);
        if (qtyVal > 0) {
          movements.push({
            uid: `pur_${p.id}_${idx}`,
            id: p.id,
            date: p.entry_date,
            type: "purchase_in",
            category: "Raw Material Purchase",
            item_name: rawName,
            materialCategory: getMaterialCategory(rawName, u),
            refNo: p.bill_no ? `Bill #${p.bill_no}` : `Purchase #${p.id}`,
            partyName: p.client_name || "Supplier",
            quantityIn: qtyVal,
            quantityOut: 0,
            unit: u,
            weightIn: u === "kg" ? qtyVal : 0,
            weightOut: 0,
            amount: sub || Number(p.amount || 0),
            note: p.note || "",
          });
        }
      });
    } else {
      const w = Number(p.weight || 0);
      if (w > 0) {
        movements.push({
          uid: `pur_${p.id}`,
          id: p.id,
          date: p.entry_date,
          type: "purchase_in",
          category: "Raw Material Purchase",
          item_name: "General MS Raw Steel",
          materialCategory: "Steel & Metal (KG)",
          refNo: p.bill_no ? `Bill #${p.bill_no}` : `Purchase #${p.id}`,
          partyName: p.client_name || "Supplier",
          quantityIn: w,
          quantityOut: 0,
          unit: "kg",
          weightIn: w,
          weightOut: 0,
          amount: Number(p.amount || 0),
          note: p.note || "",
        });
      }
    }
  });

  // 2. Fetch Sales bills
  const sales = await sql`
    SELECT id, bill_no, bill_date, customer_name, items, total_bill, note
    FROM customer_bills 
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY bill_date DESC, id DESC
    LIMIT 250
  `;

  sales.forEach((s) => {
    let its = s.items;
    if (typeof its === "string") {
      try {
        its = JSON.parse(its);
      } catch (e) {}
    }

    if (Array.isArray(its)) {
      its.forEach((it, idx) => {
        const rawName = (it.item_name || it.name || "Sold Item").trim();
        let u = (it.unit || "pcs").toLowerCase().trim();
        let q = parseFloat(it.quantity) || 0;
        if (u === "ton") {
          u = "kg";
          q *= 1000;
        }

        if (q > 0) {
          movements.push({
            uid: `sale_${s.id}_${idx}`,
            id: s.id,
            date: s.bill_date,
            type: "sales_out",
            category: "Fabricated Goods Sale",
            item_name: rawName,
            materialCategory: getMaterialCategory(rawName, u),
            refNo: s.bill_no ? `Invoice #${s.bill_no}` : `Sale #${s.id}`,
            partyName: s.customer_name || "Customer",
            quantityIn: 0,
            quantityOut: q,
            unit: u,
            weightIn: 0,
            weightOut: u === "kg" ? q : 0,
            amount: Number(it.subtotal || 0),
            note: s.note || "",
          });
        }
      });
    }
  });

  // 3. Fetch Scrap and Adjustments
  const adjustments = await sql`
    SELECT id, adjustment_date, type, item_name, weight_kg, rate_per_kg, notes, created_at, COALESCE(unit, 'kg') as unit
    FROM stock_adjustments 
    WHERE COALESCE(is_deleted, false) = false
    ORDER BY adjustment_date DESC, id DESC
    LIMIT 100
  `;

  adjustments.forEach((a) => {
    const isAddition = a.type === "correction_add" || a.type === "initial_stock";
    const w = Number(a.weight_kg || 0);
    const u = (a.unit || "kg").toLowerCase().trim();

    movements.push({
      uid: `adj_${a.id}`,
      id: a.id,
      date: a.adjustment_date,
      type: a.type,
      category:
        a.type === "scrap"
          ? "Metal Scrap / Cut Pieces"
          : a.type === "wastage"
            ? "Fabrication Wastage"
            : isAddition
              ? "Stock Adjustment (Add)"
              : "Stock Adjustment (Subtract)",
      item_name: a.item_name || "Workshop Floor",
      materialCategory: getMaterialCategory(a.item_name, u),
      refNo: `ADJ-${a.id}`,
      partyName: a.item_name || "Workshop Floor",
      quantityIn: isAddition ? w : 0,
      quantityOut: !isAddition ? w : 0,
      unit: u,
      weightIn: isAddition && u === "kg" ? w : 0,
      weightOut: !isAddition && u === "kg" ? w : 0,
      amount: w * Number(a.rate_per_kg || 0),
      note: a.notes || "",
    });
  });

  // Sort movements by date descending
  movements.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter if requested
  let filtered = movements;
  if (type !== "all") {
    filtered = filtered.filter((m) => m.type === type);
  }
  if (search) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (m) =>
        (m.refNo && m.refNo.toLowerCase().includes(q)) ||
        (m.partyName && m.partyName.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.item_name && m.item_name.toLowerCase().includes(q)) ||
        (m.note && m.note.toLowerCase().includes(q))
    );
  }

  return {
    movements: filtered.slice(0, limit),
    adjustmentsList: adjustments,
  };
}

/**
 * Record a new Scrap or Stock Adjustment with custom unit.
 */
export async function createStockAdjustment({
  adjustment_date,
  type = "scrap",
  item_name = "Metal Scrap / Cut Pieces",
  weight_kg,
  unit = "kg",
  rate_per_kg = 0,
  notes = "",
}) {
  const sql = getSql();
  const date = adjustment_date || new Date().toISOString().slice(0, 10);
  const qty = parseFloat(weight_kg);

  if (isNaN(qty) || qty <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  const [row] = await sql`
    INSERT INTO stock_adjustments (adjustment_date, type, item_name, weight_kg, unit, rate_per_kg, notes)
    VALUES (${date}, ${type}, ${item_name.trim()}, ${qty}, ${(unit || "kg").toLowerCase().trim()}, ${parseFloat(rate_per_kg) || 0}, ${notes.trim()})
    RETURNING id, adjustment_date, type, item_name, weight_kg, unit, rate_per_kg, notes
  `;

  return row;
}

/**
 * Delete a Stock Adjustment
 */
export async function deleteStockAdjustment(id) {
  const sql = getSql();
  await sql`
    UPDATE stock_adjustments 
    SET is_deleted = true 
    WHERE id = ${Number(id)}
  `;
  return { success: true };
}
