import { NextResponse } from "next/server";
import { getCustomerBills, createCustomerBill, updateCustomerBill, getCustomers, deleteCustomerById, getRecycleBinItems } from "@/lib/db";
import { isStealthCloaked, getAuthUser } from "@/lib/serverAuth";
import { validateAndComputeBillTotals } from "@/lib/billEntryValidation";

export async function GET(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ bills: [], customers: [], recycleBinItems: [], stealth_locked: true });
    }
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const [bills, customers, recycleBinItems] = await Promise.all([
      getCustomerBills(search),
      getCustomers(),
      getRecycleBinItems(),
    ]);
    return NextResponse.json({ bills, customers, recycleBinItems });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ error: "System currently offline for maintenance" }, { status: 503 });
    }
    const body = await req.json();
    const {
      bill_date,
      bill_no,
      customer_name,
      customer_address,
      customer_mobile,
      customer_id,
      items,
      labour_charge,
      transport_cost,
      discount,
      total_bill,
      client_payment,
      due_advance,
      note,
      is_opening_balance,
    } = body;

    if (!customer_name || !customer_name.trim()) {
      return NextResponse.json({ error: "Customer Name is required" }, { status: 400 });
    }

    if (!customer_mobile || !customer_mobile.trim()) {
      return NextResponse.json({ error: "Customer Mobile number is required" }, { status: 400 });
    }

    const computed = validateAndComputeBillTotals(body);
    if (computed.error) {
      return NextResponse.json({ error: computed.error }, { status: 400 });
    }

    const actor = await getAuthUser(req);
    const billPayload = {
      bill_date,
      bill_no,
      customer_name: customer_name.trim(),
      customer_address: customer_address ? customer_address.trim() : "",
      customer_mobile: customer_mobile ? customer_mobile.trim() : "",
      customer_id: customer_id ? customer_id.trim() : "",
      items: computed.items,
      labour_charge: computed.labour_charge,
      transport_cost: computed.transport_cost,
      discount: computed.discount,
      total_bill: computed.total_bill,
      client_payment: computed.client_payment,
      due_advance: computed.due_advance,
      note: note ? note.trim() : "",
      created_by: actor?.username || "Admin",
      is_opening_balance: is_opening_balance === true,
    };
    const saved = await createCustomerBill(billPayload);

    return NextResponse.json({ ok: true, id: saved.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ error: "System currently offline for maintenance" }, { status: 503 });
    }
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");
    const permanent = searchParams.get("permanent") === "true";
    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }
    const actor = await getAuthUser(req);
    if (permanent && (!actor || actor.role !== "admin")) {
      return NextResponse.json({ error: "Only administrators can permanently delete records" }, { status: 403 });
    }
    await deleteCustomerById(customerId, permanent, actor?.username || "Admin");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ error: "System currently offline for maintenance" }, { status: 503 });
    }
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "Bill ID is required" }, { status: 400 });
    }
    if (!data.customer_name || !data.customer_name.trim()) {
      return NextResponse.json({ error: "Customer Name is required" }, { status: 400 });
    }
    if (!data.customer_mobile || !data.customer_mobile.trim()) {
      return NextResponse.json({ error: "Customer Mobile number is required" }, { status: 400 });
    }

    const computed = validateAndComputeBillTotals(data);
    if (computed.error) {
      return NextResponse.json({ error: computed.error }, { status: 400 });
    }

    const actor = await getAuthUser(req);
    const updatedPayload = {
      bill_date: data.bill_date,
      bill_no: data.bill_no,
      customer_name: data.customer_name.trim(),
      customer_address: data.customer_address ? data.customer_address.trim() : "",
      customer_mobile: data.customer_mobile ? data.customer_mobile.trim() : "",
      customer_id: data.customer_id ? data.customer_id.trim() : "",
      items: computed.items,
      labour_charge: computed.labour_charge,
      transport_cost: computed.transport_cost,
      discount: computed.discount,
      total_bill: computed.total_bill,
      client_payment: computed.client_payment,
      due_advance: computed.due_advance,
      note: data.note ? data.note.trim() : "",
      is_opening_balance: data.is_opening_balance === true,
    };
    await updateCustomerBill(id, updatedPayload);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

