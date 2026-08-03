import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LockKeyhole, User2 } from "lucide-react";

const LOGO_URL =
  "https://res.cloudinary.com/dedtb3vnj/image/upload/v1782568576/kino_yrhkmc.png";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, usernameToEmail } from "@/lib/auth";
import { fetchPublicSettings } from "@/lib/helpdesk";
import { registerUser } from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Masuk | Kino IT Helpdesk Cikembar" },
      {
        name: "description",
        content:
          "Masuk ke Kino IT Helpdesk Cikembar untuk mengajukan dan memantau permintaan perbaikan hardware, software, dan jaringan.",
      },
      { property: "og:title", content: "Masuk | Kino IT Helpdesk Cikembar" },
      {
        property: "og:description",
        content: "Layanan mandiri & support IT Kino Cikembar.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { profile, loading, refresh } = useAuth();
  const [busy, setBusy] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: fetchPublicSettings,
  });

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", nama: "", password: "" });

  useEffect(() => {
    if (!loading && profile) void navigate({ to: "/dashboard" });
  }, [loading, profile, navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(loginForm.username),
      password: loginForm.password,
    });
    setBusy(false);
    if (error) {
      toast.error("Username atau password salah.");
      return;
    }
    await refresh();
    toast.success("Selamat datang kembali!");
    void navigate({ to: "/dashboard" });
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await registerUser({ data: registerForm });
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(registerForm.username),
        password: registerForm.password,
      });
      if (error) throw new Error(error.message);
      await refresh();
      toast.success("Akun berhasil dibuat.");
      void navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pendaftaran gagal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden lg:block">
        {settings?.login_bg_url ? (
          <img
            src={settings.login_bg_url}
            alt="Fasilitas produksi Kino Cikembar"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="brand-gradient absolute inset-0 opacity-90 mix-blend-multiply" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/95 p-2 backdrop-blur">
              <img src={LOGO_URL} alt="Logo Kino Indonesia" className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-base font-extrabold">Kino IT Helpdesk</p>
              <p className="text-sm opacity-80">Plant Cikembar</p>
            </div>
          </div>


          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold leading-tight">
              Layanan Mandiri &amp; Support IT dalam satu tempat.
            </h2>
            <p className="mt-4 text-sm leading-relaxed opacity-90">
              Ajukan perbaikan hardware, software, jaringan, dan sistem. Pantau progres tiket
              Anda secara real time bersama tim IT Kino Cikembar.
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-4 text-sm">
            {[
              ["Hardware", "PC, printer, perangkat"],
              ["Software", "Aplikasi & ERP"],
              ["Network", "Jaringan & akses"],
            ].map(([term, detail]) => (
              <div key={term} className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur">
                <dt className="font-bold">{term}</dt>
                <dd className="mt-1 text-xs opacity-80">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="brand-gradient flex h-11 w-11 items-center justify-center rounded-xl">
              <Headset className="h-5 w-5 text-primary-foreground" />
            </span>
            <div>
              <p className="text-base font-extrabold">Kino IT Helpdesk</p>
              <p className="text-xs text-muted-foreground">Plant Cikembar</p>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold">Masuk ke akun Anda</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gunakan username yang diberikan tim IT, atau daftar bila belum punya akun.
          </p>

          <Tabs defaultValue="login" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="register">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="surface-card mt-4 space-y-4 p-6">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <div className="relative">
                    <User2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-username"
                      className="pl-9"
                      autoComplete="username"
                      required
                      value={loginForm.username}
                      onChange={(e) =>
                        setLoginForm((f) => ({ ...f, username: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      className="pl-9"
                      autoComplete="current-password"
                      required
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((f) => ({ ...f, password: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Masuk
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="surface-card mt-4 space-y-4 p-6">
                <div className="space-y-2">
                  <Label htmlFor="reg-nama">Nama Lengkap</Label>
                  <Input
                    id="reg-nama"
                    required
                    minLength={2}
                    value={registerForm.nama}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, nama: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Username</Label>
                  <Input
                    id="reg-username"
                    required
                    minLength={3}
                    pattern="[a-zA-Z0-9._\-]+"
                    value={registerForm.username}
                    onChange={(e) =>
                      setRegisterForm((f) => ({ ...f, username: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">Minimal 6 karakter.</p>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Daftar Akun
                </Button>
                <p className="text-xs text-muted-foreground">
                  Akun pertama yang didaftarkan otomatis menjadi Administrator.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
