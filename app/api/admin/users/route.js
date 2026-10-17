import { NextResponse } from "next/server";
import { getAuthUser, hashPassword, ownerCredentials } from "@/lib/serverAuth";
import { sanitizePermissions } from "@/lib/auth";
import { listUsers, getUserByUsername, getUserById, createUser, updateUser, deleteUser } from "@/lib/db";

export const dynamic = "force-dynamic";

async function requireAdmin(req) {
  const me = await getAuthUser(req);
  if (!me || me.role !== "admin") return null;
  return me;
}

const forbidden = () => NextResponse.json({ error: "Admin access required" }, { status: 403 });

export async function GET(req) {
  try {
    const me = await requireAdmin(req);
    if (!me) return forbidden();
    const users = await listUsers();
    return NextResponse.json({ users, owner: ownerCredentials().username, me: { id: me.id, username: me.username } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const me = await requireAdmin(req);
    if (!me) return forbidden();
    const b = await req.json();
    const username = String(b.username || "").trim();
    const password = String(b.password || "");
    const role = b.role === "admin" ? "admin" : "moderator";

    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-32 characters (letters, numbers, . _ -)" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    if (username.toLowerCase() === ownerCredentials().username.toLowerCase() || (await getUserByUsername(username))) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const saved = await createUser({
      username,
      password_hash: hashPassword(password),
      role,
      permissions: role === "admin" ? {} : sanitizePermissions(b.permissions),
      created_by: me.username,
    });
    return NextResponse.json({ ok: true, id: saved.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const me = await requireAdmin(req);
    if (!me) return forbidden();
    const b = await req.json();
    const target = await getUserById(b.id);
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isSelf = me.id === target.id;
    const patch = {};
    if (b.role !== undefined) {
      if (isSelf && b.role !== "admin") {
        return NextResponse.json({ error: "You cannot remove your own admin role" }, { status: 400 });
      }
      patch.role = b.role === "admin" ? "admin" : "moderator";
    }
    if (b.permissions !== undefined) patch.permissions = sanitizePermissions(b.permissions);
    if (b.is_active !== undefined) {
      if (isSelf && !b.is_active) {
        return NextResponse.json({ error: "You cannot disable your own account" }, { status: 400 });
      }
      patch.is_active = !!b.is_active;
    }
    if (b.password !== undefined && b.password !== "") {
      if (String(b.password).length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      patch.password_hash = hashPassword(String(b.password));
    }
    await updateUser(target.id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const me = await requireAdmin(req);
    if (!me) return forbidden();
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    if (id === me.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
