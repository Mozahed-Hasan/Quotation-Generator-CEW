import { NextResponse } from "next/server";
import { deleteCustomerBill, permanentDeleteCustomerBill } from "@/lib/db";

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true";
    if (permanent) {
      await permanentDeleteCustomerBill(id);
    } else {
      await deleteCustomerBill(id, false);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
