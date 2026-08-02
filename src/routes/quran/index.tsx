import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchSuratList } from "@/lib/quran";

export const Route = createFileRoute("/quran/")({
  head: () => ({
    meta: [
      { title: "Baca Al-Quran | Kino IT Helpdesk" },
      {
        name: "description",
        content:
          "Baca 114 surat Al-Quran lengkap dengan teks Arab, latin, terjemahan, dan tafsir bahasa Indonesia.",
      },
      { property: "og:title", content: "Baca Al-Quran | Kino IT Helpdesk" },
      {
        property: "og:description",
        content: "Daftar 114 surat Al-Quran dengan terjemahan dan tafsir Indonesia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuranPage,
});

function QuranPage() {
  const [q, setQ] = useState("");
  const { data: surat = [], isLoading, error } = useQuery({
    queryKey: ["quran", "surat"],
    queryFn: fetchSuratList,
    staleTime: 1000 * 60 * 60,
  });

  const filtered = surat.filter((s) =>
    `${s.nomor} ${s.namaLatin} ${s.arti} ${s.nama}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell title="Baca Al-Quran" description="114 surat lengkap dengan terjemahan dan tafsir">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari surat…"
          className="pl-9"
        />
      </div>

      {error ? (
        <p className="mt-6 text-sm text-destructive">{(error as Error).message}</p>
      ) : isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat daftar surat…</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <Link
              key={s.nomor}
              to="/quran/$nomor"
              params={{ nomor: String(s.nomor) }}
              className="surface-card flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-elevated)]"
            >
              <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground">
                {s.nomor}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{s.namaLatin}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.arti} · {s.jumlahAyat} ayat
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg leading-tight">{s.nama}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {s.tempatTurun}
                </Badge>
              </div>
            </Link>
          ))}
          {filtered.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              <BookOpen className="mx-auto mb-2 h-5 w-5" /> Surat tidak ditemukan.
            </p>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
