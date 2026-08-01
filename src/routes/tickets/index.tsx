import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchSettings,
  fetchTickets,
  formatDate,
  splitList,
  statusStyles,
  typeStyles,
  TICKET_STATUSES,
} from "@/lib/helpdesk";
import { useAuth, isStaff } from "@/lib/auth";

export const Route = createFileRoute("/tickets/")({
  head: () => ({
    meta: [
      { title: "Daftar Tiket | Kino IT Helpdesk" },
      {
        name: "description",
        content:
          "Telusuri dan filter seluruh tiket permintaan perbaikan IT Kino Cikembar berdasarkan status, departemen, dan kategori.",
      },
      { property: "og:title", content: "Daftar Tiket | Kino IT Helpdesk" },
      {
        property: "og:description",
        content: "Telusuri seluruh tiket permintaan perbaikan IT Kino Cikembar.",
      },
    ],
  }),
  component: TicketListPage,
});

const ALL = "__all__";

function TicketListPage() {
  const { profile, role } = useAuth();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [department, setDepartment] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [scope, setScope] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (scope === "mine" && ticket.created_by !== profile?.id) return false;
      if (status !== ALL && ticket.status !== status) return false;
      if (department !== ALL && ticket.departement !== department) return false;
      if (category !== ALL && ticket.kategori !== category) return false;
      if (!q) return true;
      return [ticket.ejob, ticket.nama, ticket.subject, ticket.description, ticket.lokasi ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [tickets, search, status, department, category, scope, profile?.id]);

  return (
    <AppShell
      title="Daftar Tiket"
      description={`${filtered.length} tiket ditampilkan`}
      actions={
        <Button asChild>
          <Link to="/tickets/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Buat Tiket
          </Link>
        </Button>
      }
    >
      <div className="surface-card p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari e-job, nama, subjek…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Status</SelectItem>
              {TICKET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger>
              <SelectValue placeholder="Departemen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Departemen</SelectItem>
              {splitList(settings?.departments).map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Kategori</SelectItem>
              {splitList(settings?.categories).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex gap-2">
          {[
            { key: "mine", label: "Tiket Saya" },
            { key: "all", label: "Semua Tiket" },
          ].map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={scope === tab.key ? "default" : "outline"}
              onClick={() => setScope(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="surface-card mt-6 overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">Memuat tiket…</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            Tidak ada tiket yang cocok dengan filter.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">E-Job</th>
                    <th className="px-5 py-3 font-semibold">Subjek</th>
                    <th className="px-5 py-3 font-semibold">Pemohon</th>
                    <th className="px-5 py-3 font-semibold">Kategori</th>
                    <th className="px-5 py-3 font-semibold">Tipe</th>
                    <th className="px-5 py-3 font-semibold">Tanggal</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((ticket) => (
                    <tr key={ticket.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-5 py-3">
                        <Link
                          to="/tickets/$id"
                          params={{ id: ticket.id }}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {ticket.ejob}
                        </Link>
                      </td>
                      <td className="max-w-xs px-5 py-3">
                        <p className="truncate font-medium">{ticket.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ticket.departement}
                          {ticket.lokasi ? ` · ${ticket.lokasi}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3">{ticket.nama}</td>
                      <td className="px-5 py-3">{ticket.kategori}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={typeStyles[ticket.type_ticket] ?? ""}>
                          {ticket.type_ticket}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                        {formatDate(ticket.tanggal)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={statusStyles[ticket.status] ?? ""}>
                          {ticket.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border lg:hidden">
              {filtered.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    to="/tickets/$id"
                    params={{ id: ticket.id }}
                    className="block px-4 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-xs font-semibold text-primary">{ticket.ejob}</p>
                      <Badge variant="outline" className={statusStyles[ticket.status] ?? ""}>
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="mt-2 font-semibold">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ticket.nama} · {ticket.departement} · {formatDate(ticket.tanggal)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AppShell>
  );
}
