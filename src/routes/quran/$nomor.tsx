import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchSurat, fetchTafsir, stripHtml } from "@/lib/quran";

export const Route = createFileRoute("/quran/$nomor")({
  head: () => ({
    meta: [
      { title: "Detail Surat Al-Quran | Kino IT Helpdesk" },
      {
        name: "description",
        content:
          "Baca ayat per ayat dengan teks Arab, latin, terjemahan Indonesia, audio murottal, dan tafsir.",
      },
      { property: "og:title", content: "Detail Surat Al-Quran | Kino IT Helpdesk" },
      {
        property: "og:description",
        content: "Ayat, terjemahan, audio murottal, dan tafsir surat pilihan.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuratPage,
});

function SuratPage() {
  const { nomor } = useParams({ from: "/quran/$nomor" });
  const num = Number(nomor);
  const [tab, setTab] = useState<"ayat" | "tafsir">("ayat");

  const { data: surat, isLoading, error } = useQuery({
    queryKey: ["quran", "surat", num],
    queryFn: () => fetchSurat(num),
    staleTime: 1000 * 60 * 60,
  });

  const { data: tafsir } = useQuery({
    queryKey: ["quran", "tafsir", num],
    queryFn: () => fetchTafsir(num),
    enabled: tab === "tafsir",
    staleTime: 1000 * 60 * 60,
  });

  return (
    <AppShell
      title={surat ? `${surat.nomor}. ${surat.namaLatin}` : "Memuat surat…"}
      description={surat ? `${surat.arti} · ${surat.jumlahAyat} ayat · ${surat.tempatTurun}` : undefined}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/quran">
            <ArrowLeft className="mr-2 h-4 w-4" /> Daftar Surat
          </Link>
        </Button>
      }
    >
      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Memuat…</p> : null}

      {surat ? (
        <div className="space-y-6">
          <div className="surface-card p-5">
            <p className="text-center text-3xl leading-relaxed">{surat.nama}</p>
            <p
              className="mt-3 text-sm leading-relaxed text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: surat.deskripsi }}
            />
            <audio controls src={surat.audioFull["05"] ?? surat.audioFull["01"]} className="mt-4 w-full" />
          </div>

          <div className="flex gap-2">
            {(["ayat", "tafsir"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tab === t ? "default" : "outline"}
                onClick={() => setTab(t)}
              >
                {t === "ayat" ? "Ayat" : "Tafsir"}
              </Button>
            ))}
          </div>

          {tab === "ayat" ? (
            <ul className="space-y-3">
              {surat.ayat.map((a) => (
                <li key={a.nomorAyat} className="surface-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <Badge variant="outline">{surat.nomor}:{a.nomorAyat}</Badge>
                    <p className="flex-1 text-right text-2xl leading-[2.4]">{a.teksArab}</p>
                  </div>
                  <p className="mt-3 text-sm italic text-primary">{a.teksLatin}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{a.teksIndonesia}</p>
                  <audio controls src={a.audio["05"] ?? a.audio["01"]} className="mt-3 h-9 w-full" />
                </li>
              ))}
            </ul>
          ) : tafsir ? (
            <ul className="space-y-3">
              {tafsir.tafsir.map((t) => (
                <li key={t.ayat} className="surface-card p-5">
                  <Badge variant="outline">Ayat {t.ayat}</Badge>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {stripHtml(t.teks)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Memuat tafsir…</p>
          )}

          <div className="flex justify-between gap-3">
            {surat.suratSebelumnya ? (
              <Button asChild variant="outline">
                <Link to="/quran/$nomor" params={{ nomor: String(surat.suratSebelumnya.nomor) }}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> {surat.suratSebelumnya.namaLatin}
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {surat.suratSelanjutnya ? (
              <Button asChild variant="outline">
                <Link to="/quran/$nomor" params={{ nomor: String(surat.suratSelanjutnya.nomor) }}>
                  {surat.suratSelanjutnya.namaLatin} <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
