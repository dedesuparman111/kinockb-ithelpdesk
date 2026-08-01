import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchSettings, splitList } from "@/lib/helpdesk";
import { ensurePublicAccountFn } from "@/lib/users.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan Helpdesk | Kino IT Helpdesk" },
      {
        name: "description",
        content:
          "Atur daftar departemen, kategori tiket, nomor WhatsApp tim IT, dan latar halaman login helpdesk Kino Cikembar.",
      },
      { property: "og:title", content: "Pengaturan Helpdesk | Kino IT Helpdesk" },
      {
        property: "og:description",
        content: "Konfigurasi departemen, kategori, dan kontak tim IT Kino Cikembar.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const [form, setForm] = useState({
    departments: "",
    categories: "",
    it_phone: "",
    login_bg_url: "",
  });
  const [busy, setBusy] = useState(false);
  const [publicPassword, setPublicPassword] = useState("kino26");
  const [publicBusy, setPublicBusy] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        departments: settings.departments ?? "",
        categories: settings.categories ?? "",
        it_phone: settings.it_phone ?? "",
        login_bg_url: settings.login_bg_url ?? "",
      });
    }
  }, [settings]);

  if (role && role !== "Administrator") {
    return (
      <AppShell title="Pengaturan">
        <div className="surface-card mx-auto max-w-md p-8 text-center">
          <h2 className="text-lg font-bold">Akses ditolak</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hanya Administrator yang dapat mengubah pengaturan.
          </p>
        </div>
      </AppShell>
    );
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("settings")
      .update({
        departments: form.departments,
        categories: form.categories,
        it_phone: form.it_phone || null,
        login_bg_url: form.login_bg_url || null,
      })
      .eq("id", 1);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Pengaturan tersimpan.");
  };

  return (
    <AppShell
      title="Pengaturan"
      description="Konfigurasi master data helpdesk dan kontak tim IT"
    >
      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Memuat pengaturan…</p>
      ) : (
        <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-6">
          <div className="surface-card p-6">
            <h3 className="text-base font-bold">Master Data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pisahkan setiap item dengan tanda koma.
            </p>

            <div className="mt-5 space-y-2">
              <Label htmlFor="departments">Daftar Departemen</Label>
              <Textarea
                id="departments"
                rows={3}
                value={form.departments}
                onChange={(e) => setForm((f) => ({ ...f, departments: e.target.value }))}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {splitList(form.departments).map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="categories">Daftar Kategori</Label>
              <Textarea
                id="categories"
                rows={3}
                value={form.categories}
                onChange={(e) => setForm((f) => ({ ...f, categories: e.target.value }))}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {splitList(form.categories).map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="surface-card p-6">
            <h3 className="text-base font-bold">Kontak & Tampilan</h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="it_phone">No. WhatsApp Tim IT</Label>
                <Input
                  id="it_phone"
                  placeholder="628xxxxxxxxxx"
                  value={form.it_phone}
                  onChange={(e) => setForm((f) => ({ ...f, it_phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login_bg_url">URL Latar Halaman Login</Label>
                <Input
                  id="login_bg_url"
                  placeholder="https://…"
                  value={form.login_bg_url}
                  onChange={(e) => setForm((f) => ({ ...f, login_bg_url: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="surface-card p-6">
            <h3 className="text-base font-bold">Akun Public Bersama</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Satu akun bersama (username <span className="font-semibold">user</span>) agar
              karyawan tidak perlu membuat banyak akun. Akun ini hanya bisa{" "}
              <span className="font-semibold">membuat tiket dan melihat</span> — tidak bisa
              mengubah tiket, mengelola user, atau mengubah pengaturan.
            </p>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <div className="w-full max-w-xs space-y-2">
                <Label htmlFor="public_password">Password akun public</Label>
                <Input
                  id="public_password"
                  type="text"
                  value={publicPassword}
                  onChange={(e) => setPublicPassword(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={publicBusy}
                onClick={async () => {
                  if (publicPassword.trim().length < 6) {
                    toast.error("Password minimal 6 karakter.");
                    return;
                  }
                  setPublicBusy(true);
                  try {
                    const res = await ensurePublicAccountFn({
                      data: { password: publicPassword.trim() },
                    });
                    toast.success(
                      res.created
                        ? "Akun public dibuat (username: user)."
                        : "Password akun public diperbarui.",
                    );
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Gagal menyiapkan akun public.",
                    );
                  } finally {
                    setPublicBusy(false);
                  }
                }}
              >
                {publicBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Buat / Perbarui Akun Public
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan Pengaturan
            </Button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
