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
Cloudflare Pages already supports SPA fallback by default when there is no top-level
`404.html`. This project relies on that default behavior for dynamic quest URLs such as:

`/r/:routeSlug/l/:locationSlug`

Do **not** add a catch-all `_redirects` rule like `/* / 200` because it rewrites JS/CSS
asset requests to HTML and breaks app boot.

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
