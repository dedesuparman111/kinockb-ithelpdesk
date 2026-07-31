import { supabase } from "@/integrations/supabase/client";

export const TICKET_STATUSES = [
  "Open",
  "In Progress",
  "Pending",
  "Closed",
  "Cancelled",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_TYPES = ["Request", "Incident", "Complaint"] as const;

export type Ticket = {
  id: string;
  ejob: string;
  tanggal: string;
  nama: string;
  no_wa: string | null;
  departement: string;
  lokasi: string | null;
  kategori: string;
  type_ticket: string;
  subject: string;
  description: string;
  status: string;
  tanggal_selesai: string | null;
  action: string | null;
  keterangan: string | null;
  creator: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  id: number;
  departments: string;
  categories: string;
  login_bg_url: string | null;
  it_phone: string | null;
};

export const splitList = (value: string | null | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const statusStyles: Record<string, string> = {
  Open: "bg-info/12 text-info border-info/30",
  "In Progress": "bg-primary/12 text-primary border-primary/30",
  Pending: "bg-warning/20 text-warning-foreground border-warning/40",
  Closed: "bg-success/12 text-success border-success/30",
  Cancelled: "bg-muted text-muted-foreground border-border",
};

export const typeStyles: Record<string, string> = {
  Request: "bg-secondary text-secondary-foreground border-border",
  Incident: "bg-destructive/10 text-destructive border-destructive/30",
  Complaint: "bg-warning/20 text-warning-foreground border-warning/40",
};

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function fetchSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("id, departments, categories, login_bg_url, it_phone")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Settings) ?? null;
}

export async function fetchTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Ticket[];
}

export async function generateEjob(): Promise<string> {
  const now = new Date();
  const prefix = `EJOB/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/`;
  const { data, error } = await supabase
    .from("tickets")
    .select("ejob")
    .like("ejob", `${prefix}%`)
    .order("ejob", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const last = data?.[0]?.ejob as string | undefined;
  const next = last ? Number(last.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(Number.isFinite(next) ? next : 1).padStart(3, "0")}`;
}

export const waLink = (phone: string | null | undefined, message: string) => {
  const clean = (phone ?? "").replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
};
