import { NextResponse } from "next/server";
import {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  updateWorkOrderStatus,
  deleteWorkOrder,
} from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const order = await getWorkOrderById(id);
      if (!order) {
        return NextResponse.json({ error: "Work Order not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, workOrder: order });
    }

    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const data = await getWorkOrders({ status, search, from, to });
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error("GET /api/work-orders error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const action = body.action || "create";

    if (action === "update_status") {
      if (!body.id || !body.status) {
        return NextResponse.json(
          { error: "Work Order ID and status are required" },
          { status: 400 }
        );
      }
      const res = await updateWorkOrderStatus(body.id, body.status);
      return NextResponse.json({ ok: true, ...res });
    }

    if (action === "update") {
      if (!body.id) {
        return NextResponse.json({ error: "Work Order ID is required" }, { status: 400 });
      }
      const res = await updateWorkOrder(body.id, body);
      return NextResponse.json({ ok: true, ...res });
    }

    // Default: create
    if (!body.customer_name || !body.customer_name.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const res = await createWorkOrder(body);
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    console.error("POST /api/work-orders error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Work Order ID is required" }, { status: 400 });
    }
    await deleteWorkOrder(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/work-orders error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

