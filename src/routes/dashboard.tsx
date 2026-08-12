import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  
  CheckCircle2,
  Clock,
  PlusCircle,
  Inbox,
  MessageCircle,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchSettings,
  fetchTickets,
  formatDate,
  statusStyles,
  waLink,
} from "@/lib/helpdesk";
import { useAuth, isStaff } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Tiket | Kino IT Helpdesk" },
      {
        name: "description",
        content:
          "Ringkasan tiket helpdesk IT Kino Cikembar: tiket terbuka, sedang dikerjakan, dan selesai.",
      },
      { property: "og:title", content: "Dashboard Tiket | Kino IT Helpdesk" },
      {
        property: "og:description",
        content: "Ringkasan status permintaan perbaikan IT Kino Cikembar.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, role } = useAuth();
  const { data: tickets = [] } = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const mine = tickets;

  const stats = [
    {
      label: "Total Tiket",
      value: mine.length,
      icon: Inbox,
      tone: "bg-secondary text-secondary-foreground",
    },
    {
      label: "Open",
      value: mine.filter((t) => t.status === "Open").length,
      icon: Clock,
      tone: "bg-info/12 text-info",
    },
    {
      label: "In Progress",
      value: mine.filter((t) => t.status === "In Progress").length,
      icon: Activity,
      tone: "bg-primary/12 text-primary",
    },
    {
      label: "Closed",
      value: mine.filter((t) => t.status === "Closed").length,
      icon: CheckCircle2,
      tone: "bg-success/12 text-success",
    },
  ];

  const byCategory = Object.entries(
    mine.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.kategori] = (acc[ticket.kategori] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const maxCategory = byCategory[0]?.[1] ?? 1;

  return (
    <AppShell
      title={`Halo, ${profile?.nama.split(" ")[0] ?? ""}`}
      description={isStaff(role) ? "Ringkasan seluruh tiket helpdesk" : "Ringkasan tiket Anda"}
      actions={
        <Button asChild>
          <Link to="/tickets/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Buat Tiket
          </Link>
        </Button>
      }
    >
      <div className="grid auto-rows-[minmax(0,auto)] gap-4 lg:grid-cols-4">
        <div className="brand-gradient relative overflow-hidden rounded-2xl p-6 text-primary-foreground shadow-[var(--shadow-elevated)] lg:col-span-2 lg:row-span-2">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-6 h-44 w-44 rounded-full bg-black/10" />
          <div className="relative">
            <p className="text-sm font-medium opacity-90">Total Tiket</p>
            <p className="mt-2 text-6xl font-extrabold tabular-nums leading-none">{mine.length}</p>
            <p className="mt-3 max-w-sm text-sm opacity-90">
              {isStaff(role)
                ? "Seluruh permintaan layanan IT Kino Cikembar."
                : "Semua tiket helpdesk yang tercatat."}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {stats.slice(1).map((stat) => (
                <div key={stat.label} className="rounded-xl bg-white/15 p-3 backdrop-blur">
                  <stat.icon className="h-4 w-4 opacity-90" />
                  <p className="mt-2 text-2xl font-bold tabular-nums leading-none">{stat.value}</p>
                  <p className="mt-1 text-[11px] font-medium opacity-90">{stat.label}</p>
                </div>
              ))}
            </div>
            <Button asChild variant="secondary" size="sm" className="mt-6">
              <Link to="/tickets">Lihat semua tiket</Link>
            </Button>
          </div>
        </div>

        {stats.slice(1).map((stat) => (
          <div key={stat.label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.tone}`}>
                <stat.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{stat.value}</p>
          </div>
        ))}

        <div className="surface-card p-5 lg:col-span-2 lg:row-span-2">
          <h2 className="text-base font-bold">Tiket per Kategori</h2>
          {byCategory.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Belum ada data.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byCategory.map(([category, count]) => (
                <li key={category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(count / maxCategory) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card overflow-hidden lg:col-span-2 lg:row-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-bold">Tiket Terbaru</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/tickets">Lihat semua</Link>
            </Button>
          </div>
          {mine.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Belum ada tiket. Buat tiket pertama Anda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {mine.slice(0, 6).map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    to="/tickets/$id"
                    params={{ id: ticket.id }}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{ticket.subject}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {ticket.ejob} · {ticket.departement} · {formatDate(ticket.tanggal)}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusStyles[ticket.status] ?? ""}>
                      {ticket.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="text-base font-bold">Butuh bantuan cepat?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hubungi tim IT Cikembar langsung melalui WhatsApp untuk kendala mendesak.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <a
              href={waLink(settings?.it_phone, "Halo Tim IT Kino Cikembar, saya butuh bantuan.")}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Chat Tim IT
            </a>
          </Button>
        </div>

      </div>

    </AppShell>
  );
}
