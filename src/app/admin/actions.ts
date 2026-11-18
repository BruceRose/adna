"use server";

import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { deleteResponse } from "@/lib/responses";

export async function login(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  // Small fixed delay to slow down password guessing.
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(password)) return { error: "Incorrect password." };
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

export async function removeResponse(formData: FormData) {
  await requireAdmin();
  await deleteResponse(String(formData.get("id") ?? ""));
  redirect("/admin");
}
