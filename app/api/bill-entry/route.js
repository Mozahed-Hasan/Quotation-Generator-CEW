import { NextResponse } from "next/server";
import { getCustomerBills, createCustomerBill, updateCustomerBill, getCustomers, deleteCustomerById, getRecycleBinItems } from "@/lib/db";

export async function GET(req) {
  try {
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
    } = body;

    if (!customer_name || !customer_name.trim()) {
      return NextResponse.json({ error: "Customer Name is required" }, { status: 400 });
    }

    if (!customer_mobile || !customer_mobile.trim()) {
      return NextResponse.json({ error: "Customer Mobile number is required" }, { status: 400 });
    }

    const saved = await createCustomerBill({
      bill_date,
      bill_no,
      customer_name: customer_name.trim(),
      customer_address: customer_address ? customer_address.trim() : "",
      customer_mobile: customer_mobile ? customer_mobile.trim() : "",
      customer_id: customer_id ? customer_id.trim() : "",
      items: Array.isArray(items) ? items : [],
      labour_charge: Number(labour_charge) || 0,
      transport_cost: Number(transport_cost) || 0,
      discount: Number(discount) || 0,
      total_bill: Number(total_bill) || 0,
      client_payment: Number(client_payment) || 0,
      due_advance: Number(due_advance) || 0,
      note: note ? note.trim() : "",
    });

    return NextResponse.json({ ok: true, id: saved.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");
    const permanent = searchParams.get("permanent") === "true";
    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }
    await deleteCustomerById(customerId, permanent);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
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

    await updateCustomerBill(id, {
      bill_date: data.bill_date,
      bill_no: data.bill_no,
      customer_name: data.customer_name.trim(),
      customer_address: data.customer_address ? data.customer_address.trim() : "",
      customer_mobile: data.customer_mobile ? data.customer_mobile.trim() : "",
      customer_id: data.customer_id ? data.customer_id.trim() : "",
      items: Array.isArray(data.items) ? data.items : [],
      labour_charge: Number(data.labour_charge || 0),
      transport_cost: Number(data.transport_cost || 0),
      discount: Number(data.discount || 0),
      total_bill: Number(data.total_bill || 0),
      client_payment: Number(data.client_payment || 0),
      due_advance: Number(data.due_advance || 0),
      note: data.note ? data.note.trim() : "",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

