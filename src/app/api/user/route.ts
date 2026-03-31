import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-helpers";
import { getUserById, updateUser, deleteUser } from "@/lib/queries";

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(authUser.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      creditsBalance: user.creditsBalance,
      creditsLimit: user.creditsLimit,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("[API] GET /api/user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateUser(authUser.id, parsed.data);
    return NextResponse.json({ user: updated[0] });
  } catch (error) {
    console.error("[API] PATCH /api/user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteUser(authUser.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
