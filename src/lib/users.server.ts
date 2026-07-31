import type { SupabaseClient } from "@supabase/supabase-js";
import { USERNAME_DOMAIN } from "./username";

export type AppRoleName = "Administrator" | "Petugas IT" | "User Biasa" | "User Public";

export const emailFor = (username: string) =>
  `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;

export async function assertAdmin(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "Administrator")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Hanya Administrator yang dapat melakukan aksi ini.");
}

export async function createAccount(input: {
  username: string;
  nama: string;
  password: string;
  role: AppRoleName;
  mustChangePassword?: boolean;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const username = input.username.trim().toLowerCase();

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existing) throw new Error("Username sudah digunakan.");

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: emailFor(username),
    password: input.password,
    email_confirm: true,
    user_metadata: { username, nama: input.nama },
  });
  if (createError || !created?.user) {
    throw new Error(createError?.message ?? "Gagal membuat akun.");
  }

  const userId = created.user.id;

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    username,
    nama: input.nama.trim(),
    must_change_password: input.mustChangePassword ?? false,
    status: "Active",
  });
  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId, role: input.role });
  if (roleError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(roleError.message);
  }

  return { userId, username };
}

export async function countProfiles() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function updateAccount(input: {
  userId: string;
  nama?: string;
  role?: AppRoleName;
  status?: string;
  password?: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const patch: { nama?: string; status?: string; must_change_password?: boolean } = {};
  if (input.nama !== undefined) patch.nama = input.nama.trim();
  if (input.status !== undefined) patch.status = input.status;
  if (input.password) patch.must_change_password = true;


  if (Object.keys(patch).length > 0) {
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", input.userId);
    if (error) throw new Error(error.message);
  }

  if (input.role) {
    await supabaseAdmin.from("user_roles").delete().eq("user_id", input.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: input.userId, role: input.role });
    if (error) throw new Error(error.message);
  }

  if (input.password) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(input.userId, {
      password: input.password,
    });
    if (error) throw new Error(error.message);
  }

  return { ok: true as const };
}

export async function deleteAccount(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
