import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchSettings, generateEjob, splitList, TICKET_TYPES } from "@/lib/helpdesk";

export const Route = createFileRoute("/tickets/new")({
  head: () => ({
    meta: [
      { title: "Buat Tiket Baru | Kino IT Helpdesk" },
      {
        name: "description",
        content:
          "Ajukan permintaan perbaikan hardware, software, jaringan, atau sistem ke tim IT Kino Cikembar.",
      },
      { property: "og:title", content: "Buat Tiket Baru | Kino IT Helpdesk" },
      {
        property: "og:description",
        content: "Form pengajuan permintaan perbaikan IT Kino Cikembar.",
      },
    ],
  }),
  component: NewTicketPage,
});

function NewTicketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    nama: "",
    no_wa: "",
    departement: "",
    lokasi: "",
    kategori: "",
    type_ticket: "Request",
    subject: "",
    description: "",
    tanggal: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (profile?.nama && !form.nama) setForm((f) => ({ ...f, nama: profile.nama }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.nama]);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    if (!form.departement || !form.kategori) {
      toast.error("Departemen dan kategori wajib dipilih.");
      return;
    }
    setBusy(true);
    try {
      const ejob = await generateEjob();
      const { error } = await supabase.from("tickets").insert({
        ejob,
        tanggal: form.tanggal,
        nama: form.nama.trim(),
        no_wa: form.no_wa.trim() || null,
        departement: form.departement,
        lokasi: form.lokasi.trim() || null,
        kategori: form.kategori,
        type_ticket: form.type_ticket,
        subject: form.subject.trim(),
        description: form.description.trim(),
        status: "Open",
        creator: profile.username,
        created_by: profile.id,
      });
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success(`Tiket ${ejob} berhasil dibuat.`);
      void navigate({ to: "/tickets" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat tiket.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="Buat Tiket Baru"
      description="Lengkapi detail permintaan agar tim IT dapat menindaklanjuti lebih cepat"
    >
      <form onSubmit={handleSubmit} className="surface-card mx-auto max-w-3xl p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Pemohon</Label>
            <Input
              id="nama"
              required
              value={form.nama}
              onChange={(e) => set("nama")(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="no_wa">No. WhatsApp</Label>
            <Input
              id="no_wa"
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              value={form.no_wa}
              onChange={(e) => set("no_wa")(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Departemen</Label>
            <Select value={form.departement} onValueChange={set("departement")}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih departemen" />
              </SelectTrigger>
              <SelectContent>
                {splitList(settings?.departments).map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lokasi">Lokasi</Label>
            <Input
              id="lokasi"
              placeholder="Gedung / lantai / area"
              value={form.lokasi}
              onChange={(e) => set("lokasi")(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={form.kategori} onValueChange={set("kategori")}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {splitList(settings?.categories).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipe Tiket</Label>
            <Select value={form.type_ticket} onValueChange={set("type_ticket")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tanggal">Tanggal</Label>
            <Input
              id="tanggal"
              type="date"
              required
              value={form.tanggal}
              onChange={(e) => set("tanggal")(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Label htmlFor="subject">Subjek</Label>
          <Input
            id="subject"
            required
            maxLength={200}
            placeholder="Ringkasan singkat masalah"
            value={form.subject}
            onChange={(e) => set("subject")(e.target.value)}
          />
        </div>

        <div className="mt-5 space-y-2">
          <Label htmlFor="description">Deskripsi</Label>
          <Textarea
            id="description"
            required
            rows={6}
            placeholder="Jelaskan detail kendala, kapan terjadi, dan dampaknya."
            value={form.description}
            onChange={(e) => set("description")(e.target.value)}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/tickets" })}>
            Batal
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Kirim Tiket
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
