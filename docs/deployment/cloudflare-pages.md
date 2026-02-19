# Cloudflare Pages Deployment

## Build Configuration
- Framework preset: `React (Vite)`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

## Required Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_DEFAULT_ROUTE_SLUG`
- `VITE_DEVICE_ID_STORAGE_KEY`

Use the same variables in both `Production` and `Preview` environments.

## SPA Routing
This project includes `public/_redirects`:

```txt
/* /index.html 200
```

That enables direct navigation to dynamic quest URLs such as:

`/r/:routeSlug/l/:locationSlug`

## Cache Strategy
This project includes `public/_headers`:

- `/assets/*`: immutable long-term cache
- `/*`: revalidated app shell

## Security Notes
- Do not expose Supabase service role keys in Cloudflare environment variables.
- Keep only the anonymous/publishable key in frontend runtime variables.
- Enforce RLS policies in Supabase for all runtime tables.

## PWA Notes
- `vite-plugin-pwa` is enabled in `vite.config.ts`.
- Service worker is registered in `src/main.tsx`.
- Manifest is generated during build.
