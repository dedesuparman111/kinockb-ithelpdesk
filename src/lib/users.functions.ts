import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertAdmin,
  countProfiles,
  createAccount,
  deleteAccount,
  updateAccount,
} from "./users.server";

const roleSchema = z.enum(["Administrator", "Petugas IT", "User Biasa", "User Public"]);

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, garis bawah."),
  nama: z.string().min(2).max(100),
  password: z.string().min(6).max(72),
});

export const registerUser = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data }) => {
    const total = await countProfiles();
    return createAccount({
      username: data.username,
      nama: data.nama,
      password: data.password,
      role: total === 0 ? "Administrator" : "User Biasa",
    });
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => registerSchema.extend({ role: roleSchema }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return createAccount({
      username: data.username,
      nama: data.nama,
      password: data.password,
      role: data.role,
      mustChangePassword: true,
    });
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        nama: z.string().min(2).max(100).optional(),
        role: roleSchema.optional(),
        status: z.enum(["Active", "Inactive"]).optional(),
        password: z.string().min(6).max(72).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return updateAccount(data);
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("Tidak dapat menghapus akun sendiri.");
    }
    return deleteAccount(data.userId);
  });
