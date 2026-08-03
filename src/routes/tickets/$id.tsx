import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useAuth, isStaff } from "@/lib/auth";
import {
  fetchSettings,
  fetchTicketContact,
  formatDate,
  statusStyles,
  typeStyles,
  waLink,
  TICKET_COLUMNS,
  TICKET_STATUSES,
  type Ticket,
} from "@/lib/helpdesk";

export const Route = createFileRoute("/tickets/$id")({
  head: () => ({
    meta: [
      { title: "Detail Tiket | Kino IT Helpdesk" },
      {
        name: "description",
        content:
          "Lihat detail tiket, riwayat penanganan, dan perbarui status permintaan perbaikan IT Kino Cikembar.",
      },
      { property: "og:title", content: "Detail Tiket | Kino IT Helpdesk" },
      {
        property: "og:description",
        content: "Detail dan penanganan tiket helpdesk IT Kino Cikembar.",
      },
    ],
  }),
  component: TicketDetailPage,
});

async function fetchTicket(id: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Ticket) ?? null;
}

function TicketDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id),
  });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: contact } = useQuery({
    queryKey: ["ticket-contact", id],
    queryFn: () => fetchTicketContact(id),
    enabled: isStaff(role),
  });

  const [busy, setBusy] = useState(false);
  const [handling, setHandling] = useState({
    status: "Open",
    action: "",
    keterangan: "",
    tanggal_selesai: "",
  });

  useEffect(() => {
    if (ticket) {
      setHandling({
        status: ticket.status,
        action: ticket.action ?? "",
        keterangan: ticket.keterangan ?? "",
        tanggal_selesai: ticket.tanggal_selesai ?? "",
      });
    }
  }, [ticket]);

  const staff = isStaff(role);
  const canEdit = staff;

  const handleSave = async () => {
    if (!ticket) return;
    setBusy(true);
    const { error } = await supabase
      .from("tickets")
      .update({
        status: handling.status,
        action: handling.action.trim() || null,
        keterangan: handling.keterangan.trim() || null,
        tanggal_selesai: handling.tanggal_selesai || null,
      })
      .eq("id", ticket.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    toast.success("Tiket diperbarui.");
  };

  const handleDelete = async () => {
    if (!ticket) return;
    const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    toast.success("Tiket dihapus.");
    void navigate({ to: "/tickets" });
  };

  return (
    <AppShell
      title="Detail Tiket"
      description={ticket?.ejob}
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/tickets">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Link>
          </Button>
          {staff && ticket ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus tiket ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tiket {ticket.ejob} akan dihapus permanen dan tidak dapat dikembalikan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </>
      }
    >
      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Memuat tiket…</p>
      ) : !ticket ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Tiket tidak ditemukan.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="surface-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={statusStyles[ticket.status] ?? ""}>
                {ticket.status}
              </Badge>
              <Badge variant="outline" className={typeStyles[ticket.type_ticket] ?? ""}>
                {ticket.type_ticket}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{ticket.ejob}</span>
            </div>

            <h2 className="mt-4 text-2xl font-extrabold">{ticket.subject}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {ticket.description}
            </p>

            <dl className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
              {[
                ["Pemohon", ticket.nama],
                ["No. WhatsApp", staff ? (contact ?? "-") : "Hanya tim IT"],
                ["Departemen", ticket.departement],
                ["Lokasi", ticket.lokasi ?? "-"],
                ["Kategori", ticket.kategori],
                ["Tanggal Lapor", formatDate(ticket.tanggal)],
                ["Tanggal Selesai", formatDate(ticket.tanggal_selesai)],
                ["Dibuat oleh", ticket.creator ?? "-"],
              ].map(([term, value]) => (
                <div key={term}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {term}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            {ticket.action ? (
              <div className="mt-6 rounded-xl bg-accent p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                  Tindakan Tim IT
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{ticket.action}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            {canEdit ? (
              <div className="surface-card p-6">
                <h3 className="text-base font-bold">
                  {staff ? "Penanganan Tiket" : "Perbarui Tiket"}
                </h3>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={handling.status}
                      onValueChange={(value) => setHandling((h) => ({ ...h, status: value }))}
                      disabled={!staff}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {staff ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="action">Tindakan / Solusi</Label>
                        <Textarea
                          id="action"
                          rows={4}
                          value={handling.action}
                          onChange={(e) =>
                            setHandling((h) => ({ ...h, action: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="selesai">Tanggal Selesai</Label>
                        <Input
                          id="selesai"
                          type="date"
                          value={handling.tanggal_selesai}
                          onChange={(e) =>
                            setHandling((h) => ({ ...h, tanggal_selesai: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="keterangan">Keterangan</Label>
                    <Textarea
                      id="keterangan"
                      rows={3}
                      value={handling.keterangan}
                      onChange={(e) =>
                        setHandling((h) => ({ ...h, keterangan: e.target.value }))
                      }
                    />
                  </div>

                  <Button className="w-full" onClick={handleSave} disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Simpan Perubahan
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="surface-card p-6">
              <h3 className="text-base font-bold">Kontak</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Butuh koordinasi cepat terkait tiket ini?
              </p>
              <div className="mt-4 grid gap-2">
                <Button asChild variant="outline">
                  <a
                    href={waLink(
                      settings?.it_phone,
                      `Halo Tim IT, saya ingin menanyakan tiket ${ticket.ejob}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> Chat Tim IT
                  </a>
                </Button>
                {staff && contact ? (
                  <Button asChild variant="outline">
                    <a
                      href={waLink(
                        contact.startsWith("0") ? `62${contact.slice(1)}` : contact,
                        `Halo ${ticket.nama}, terkait tiket ${ticket.ejob}.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" /> Chat Pemohon
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
