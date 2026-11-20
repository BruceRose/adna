"use server";

import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { createAudienceReport, deleteAudienceReport, resetShareToken } from "@/lib/reports";
import { deleteResponse, filtersFromParams, idsMatching, purgeExpiredResponses } from "@/lib/responses";

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

/** Run the retention job now (admin banner). */
export async function purgeNow() {
  await requireAdmin();
  await purgeExpiredResponses(new Date());
  redirect("/admin");
}

export async function removeResponse(formData: FormData) {
  await requireAdmin();
  await deleteResponse(String(formData.get("id") ?? ""));
  redirect("/admin");
}

/**
 * Create an audience report from ticked responses, or from every response
 * matching the current filters when scope = "all".
 */
export async function createReport(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120) || "Untitled audience";
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  let ids: string[];
  if (formData.get("scope") === "all") {
    const filters = filtersFromParams(Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)])));
    ids = await idsMatching(filters);
  } else {
    ids = formData.getAll("ids").map(String);
  }
  if (ids.length === 0) redirect("/admin");
  const id = await createAudienceReport({ name, note, responseIds: ids });
  redirect(`/admin/reports/${id}`);
}

export async function removeReport(formData: FormData) {
  await requireAdmin();
  await deleteAudienceReport(String(formData.get("id") ?? ""));
  redirect("/admin/reports");
}

export async function resetReportLink(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await resetShareToken(id);
  redirect(`/admin/reports/${id}`);
}
