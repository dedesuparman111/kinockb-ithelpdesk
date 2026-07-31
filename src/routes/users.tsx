import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, KeyRound, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { adminCreateUser, adminDeleteUser, adminUpdateUser } from "@/lib/users.functions";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Manajemen User | Kino IT Helpdesk" },
      {
        name: "description",
        content:
          "Kelola akun pengguna helpdesk Kino Cikembar: tambah user, atur role Administrator/Petugas IT/User, dan reset password.",
      },
      { property: "og:title", content: "Manajemen User | Kino IT Helpdesk" },
      {
        property: "og:description",
        content: "Kelola akun dan hak akses pengguna helpdesk Kino Cikembar.",
      },
    ],
  }),
  component: UsersPage,
});

const ROLES: AppRole[] = ["Administrator", "Petugas IT", "User Biasa", "User Public"];

const roleStyles: Record<string, string> = {
  Administrator: "bg-primary/12 text-primary border-primary/30",
  "Petugas IT": "bg-info/12 text-info border-info/30",
  "User Biasa": "bg-secondary text-secondary-foreground border-border",
  "User Public": "bg-muted text-muted-foreground border-border",
};

type Row = {
  id: string;
  username: string;
  nama: string;
  status: string;
  created_at: string;
  role: AppRole | null;
};

async function fetchUsers(): Promise<Row[]> {
  const [{ data: profiles, error }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, nama, status, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (error) throw new Error(error.message);
  const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
  return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? null }) as Row);
}

function UsersPage() {
  const queryClient = useQueryClient();
  const { role: myRole, profile } = useAuth();
  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    nama: "",
    password: "",
    role: "User Biasa" as AppRole,
  });
  const [resetTarget, setResetTarget] = useState<Row | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  if (myRole && myRole !== "Administrator") {
    return (
      <AppShell title="Manajemen User">
        <div className="surface-card mx-auto max-w-md p-8 text-center">
          <h2 className="text-lg font-bold">Akses ditolak</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hanya Administrator yang dapat mengelola pengguna.
          </p>
        </div>
      </AppShell>
    );
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await adminCreateUser({ data: newUser });
      toast.success("User berhasil dibuat.");
      setCreateOpen(false);
      setNewUser({ username: "", nama: "", password: "", role: "User Biasa" });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat user.");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (userId: string, data: Partial<{ role: AppRole; status: string }>) => {
    try {
      await adminUpdateUser({ data: { userId, ...data } });
      toast.success("User diperbarui.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui user.");
    }
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    setBusy(true);
    try {
      await adminUpdateUser({ data: { userId: resetTarget.id, password: newPassword } });
      toast.success(`Password ${resetTarget.username} telah direset.`);
      setResetTarget(null);
      setNewPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mereset password.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await adminDeleteUser({ data: { userId } });
      toast.success("User dihapus.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus user.");
    }
  };

  return (
    <AppShell
      title="Manajemen User"
      description={`${users.length} akun terdaftar`}
      actions={
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Tambah User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Tambah User Baru</DialogTitle>
                <DialogDescription>
                  User akan diminta mengganti password saat pertama kali masuk.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-nama">Nama Lengkap</Label>
                  <Input
                    id="new-nama"
                    required
                    value={newUser.nama}
                    onChange={(e) => setNewUser((u) => ({ ...u, nama: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-username">Username</Label>
                  <Input
                    id="new-username"
                    required
                    minLength={3}
                    pattern="[a-zA-Z0-9._\-]+"
                    value={newUser.username}
                    onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password Awal</Label>
                  <Input
                    id="new-password"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) =>
                      setNewUser((u) => ({ ...u, role: value as AppRole }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">Memuat user…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nama</th>
                  <th className="px-5 py-3 font-semibold">Username</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{user.nama}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {user.username}
                    </td>
                    <td className="px-5 py-3">
                      <Select
                        value={user.role ?? undefined}
                        onValueChange={(value) => patch(user.id, { role: value as AppRole })}
                        disabled={user.id === profile?.id}
                      >
                        <SelectTrigger className="h-8 w-[150px]">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() =>
                          patch(user.id, {
                            status: user.status === "Active" ? "Inactive" : "Active",
                          })
                        }
                      >
                        <Badge
                          variant="outline"
                          className={
                            user.status === "Active"
                              ? "bg-success/12 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {user.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResetTarget(user);
                            setNewPassword("");
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {user.id !== profile?.id ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus {user.nama}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Akun dan akses akan dihapus permanen.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(user.id)}>
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Badge variant="outline" className={roleStyles[user.role ?? ""] ?? ""}>
                            Anda
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Atur password baru untuk {resetTarget?.nama}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-password">Password Baru</Label>
            <Input
              id="reset-password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleReset} disabled={busy || newPassword.length < 6}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
