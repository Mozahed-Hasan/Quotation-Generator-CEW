import { NextResponse } from "next/server";
import {
  getRecycleBinItems,
  restoreCustomerBill,
  permanentDeleteCustomerBill,
  restoreAllRecycleBin,
  emptyRecycleBin,
  restoreCustomerById,
  permanentDeleteCustomerById,
} from "@/lib/db";

export async function GET() {
  try {
    const items = await getRecycleBinItems();
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, id, customer_id } = body || {};

    if (action === "restore") {
      if (!id && !customer_id) {
        return NextResponse.json({ error: "Missing ID or Customer ID to restore" }, { status: 400 });
      }
      if (id) {
        await restoreCustomerBill(id);
      } else if (customer_id) {
        await restoreCustomerById(customer_id);
      }
      return NextResponse.json({ ok: true, message: "Item restored successfully" });
    }

    if (action === "restore_all") {
      await restoreAllRecycleBin();
      return NextResponse.json({ ok: true, message: "All items restored successfully" });
    }

    if (action === "permanent_delete") {
      if (!id && !customer_id) {
        return NextResponse.json({ error: "Missing ID or Customer ID to delete" }, { status: 400 });
      }
      if (id) {
        await permanentDeleteCustomerBill(id);
      } else if (customer_id) {
        await permanentDeleteCustomerById(customer_id);
      }
      return NextResponse.json({ ok: true, message: "Item permanently deleted" });
    }

    if (action === "empty") {
      await emptyRecycleBin();
      return NextResponse.json({ ok: true, message: "Recycle bin emptied successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const customerId = searchParams.get("customer_id");
    const all = searchParams.get("all") === "true" || searchParams.get("empty") === "true";

    if (all) {
      await emptyRecycleBin();
      return NextResponse.json({ ok: true, message: "Recycle bin emptied" });
    }
    if (id) {
      await permanentDeleteCustomerBill(id);
      return NextResponse.json({ ok: true, message: "Bill permanently deleted" });
    }
    if (customerId) {
      await permanentDeleteCustomerById(customerId);
      return NextResponse.json({ ok: true, message: "Customer bills permanently deleted" });
    }

    return NextResponse.json({ error: "Missing target ID or empty flag" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
