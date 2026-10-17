import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ user: null, error: err.message }, { status: 500 });
  }
}
