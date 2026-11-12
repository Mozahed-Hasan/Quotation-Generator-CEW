import { NextResponse } from "next/server";
import { deleteCustomerBill, permanentDeleteCustomerBill } from "@/lib/db";
import { isStealthCloaked, getAuthUser } from "@/lib/serverAuth";

export async function DELETE(req, { params }) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ error: "System currently offline for maintenance" }, { status: 503 });
    }
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true";
    const actor = await getAuthUser(req);
    if (permanent && (!actor || actor.role !== "admin")) {
      return NextResponse.json({ error: "Only administrators can permanently delete records" }, { status: 403 });
    }
    if (permanent) {
      await permanentDeleteCustomerBill(id);
    } else {
      await deleteCustomerBill(id, false, actor?.username || "Admin");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
