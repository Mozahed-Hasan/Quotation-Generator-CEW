import { NextResponse } from "next/server";
import {
  getStaffMonthData,
  saveStaffAttendanceEntry,
  saveBulkStaffAttendance,
  saveStaffSetup,
  updateStaffProfile,
  deleteStaffProfile,
} from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthKey = (searchParams.get("month") || defaultMonth).trim();

    const data = await getStaffMonthData(monthKey);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const action = body.action || "save_attendance";

    if (action === "save_setup") {
      await saveStaffSetup(body);
      return NextResponse.json({ ok: true });
    }

    if (action === "bulk_save_attendance") {
      await saveBulkStaffAttendance(body);
      return NextResponse.json({ ok: true });
    }

    if (action === "update_staff") {
      const res = await updateStaffProfile(body);
      return NextResponse.json({ ok: true, ...res });
    }

    if (action === "delete_staff") {
      await deleteStaffProfile(body.staff_name);
      return NextResponse.json({ ok: true });
    }

    const record = await saveStaffAttendanceEntry(body);
    return NextResponse.json({ ok: true, record });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const staffName = searchParams.get("name");
    if (!staffName) {
      return NextResponse.json({ error: "Staff name is required" }, { status: 400 });
    }
    await deleteStaffProfile(staffName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
