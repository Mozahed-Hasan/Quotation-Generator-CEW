import { NextResponse } from "next/server";
import { mergeCustomers } from "@/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const { sourceCustomerId, targetCustomerId, targetName, targetMobile, targetAddress } = body;

    if (!sourceCustomerId || !targetCustomerId) {
      return NextResponse.json(
        { error: "Both source and target customer accounts are required" },
        { status: 400 }
      );
    }

    const result = await mergeCustomers({
      sourceCustomerId,
      targetCustomerId,
      targetName,
      targetMobile,
      targetAddress,
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("Customer merge error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to merge customer accounts" },
      { status: 500 }
    );
  }
}
