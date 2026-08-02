const BASE = "https://equran.id/api/v2";

export type SuratRingkas = {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
};

export type Ayat = {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: Record<string, string>;
};

export type SuratDetail = SuratRingkas & {
  audioFull: Record<string, string>;
  ayat: Ayat[];
  suratSelanjutnya: SuratRingkas | false;
  suratSebelumnya: SuratRingkas | false;
};

export type TafsirItem = { ayat: number; teks: string };

export type TafsirDetail = SuratRingkas & {
  audioFull: Record<string, string>;
  tafsir: TafsirItem[];
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Gagal memuat data Quran (${res.status})`);
  const json = (await res.json()) as { code: number; message: string; data: T };
  return json.data;
}

export const fetchSuratList = () => get<SuratRingkas[]>("/surat");
export const fetchSurat = (nomor: number) => get<SuratDetail>(`/surat/${nomor}`);
export const fetchTafsir = (nomor: number) => get<TafsirDetail>(`/tafsir/${nomor}`);

export const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");
