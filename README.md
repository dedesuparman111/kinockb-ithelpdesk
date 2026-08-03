# Remix Studio

remix

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kinockb-ithelpdesk.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/33924f86-1833-4479-9883-f076452ae335).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploy ke Vercel

Project ini sudah siap dideploy ke Vercel (Nitro preset `vercel`, Build Output API v3).

1. Import repo ke Vercel — `vercel.json` sudah mengatur build command (`npm run build:vercel`).
2. Tambahkan Environment Variables di project Vercel:

| Variable | Keterangan |
| --- | --- |
| `VITE_SUPABASE_URL` | URL project Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key |
| `VITE_SUPABASE_PROJECT_ID` | Project ref Supabase |
| `SUPABASE_URL` | Sama dengan di atas (dipakai server function) |
| `SUPABASE_PUBLISHABLE_KEY` | Sama dengan publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, jangan diberi prefix `VITE_`) |

3. Deploy. Untuk database baru di supabase.com, jalankan `supabase_schema.sql` lebih dulu di SQL Editor.
