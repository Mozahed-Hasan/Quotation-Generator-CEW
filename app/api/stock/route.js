import { NextResponse } from "next/server";
import { getStockSummary, getStockMovements, createStockAdjustment, deleteStockAdjustment } from "@/lib/stock";
import { isStealthCloaked } from "@/lib/serverAuth";

export async function GET(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({
        summary: {
          totalPurchasedKg: 0,
          totalPurchasedTons: 0,
          totalPurchaseAmount: 0,
          purchaseCount: 0,
          totalSoldKg: 0,
          totalSoldTons: 0,
          itemsSoldKgCount: 0,
          totalScrapKg: 0,
          totalScrapTons: 0,
          totalAdjustmentsKg: 0,
          currentStockKg: 0,
          currentStockTons: 0,
          avgPurchaseRatePerKg: 0,
          estimatedStockValue: 0,
          lowStockThresholdKg: 2000,
          isLowStock: false,
          workOrdersSummary: { rawIssuedKg: 0, finishedKg: 0, scrapKg: 0, activeCount: 0 },
        },
        movements: [],
        adjustments: [],
      });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "250", 10);

    const [summary, movementsData] = await Promise.all([
      getStockSummary(),
      getStockMovements({ limit, type, search }),
    ]);

    return NextResponse.json({
      summary,
      movements: movementsData.movements,
      adjustments: movementsData.adjustmentsList,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ error: "System currently offline for maintenance" }, { status: 503 });
    }

    const b = await req.json();
    const qty = parseFloat(b.weight_kg);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: "Valid quantity is required (greater than 0)" }, { status: 400 });
    }

    const created = await createStockAdjustment({
      adjustment_date: b.adjustment_date,
      type: b.type || "scrap",
      item_name: (b.item_name || "Scrap / Cut Pieces").trim(),
      weight_kg: qty,
      unit: (b.unit || "kg").toLowerCase().trim(),
      rate_per_kg: parseFloat(b.rate_per_kg) || 0,
      notes: (b.notes || "").trim(),
    });

    return NextResponse.json({ ok: true, adjustment: created });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await deleteStockAdjustment(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
