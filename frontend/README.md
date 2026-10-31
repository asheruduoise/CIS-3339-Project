# Frontend (Vue 3 + Vite)

## Requirements
- Node.js 18 or newer (tested on Node 22)

## Configuration (`frontend/.env`)
Vite reads these at **build time**, so rebuild after changing them.

| Variable | What it does |
| --- | --- |
| `VITE_ROOT_API` | Base URL of the backend API, no trailing slash (e.g. `http://localhost:3000`). |
| `VITE_USE_MOCKS` | `true` = use the in-browser mock API in `src/mock/` (no backend needed). `false` = call the real backend. |
| `VITE_BASE` | Optional. Only if the site is served from a sub-path such as `/app/`. Defaults to `/`. |

`.env.example` lists the same variables without project values.

## Run it

```bash
cd frontend
npm install
npm run dev        # dev server at http://localhost:5173
npm run lint       # ESLint on src/
npm run build      # production build -> frontend/dist
npm run preview    # serve the production build at http://localhost:4173
```

The demo should use `npm run build` + `npm run preview`, not the dev server.

## Demo accounts (mock mode)

| Role | Username | Password |
| --- | --- | --- |
| Viewer | `user` | `user` |
| Editor | `admin` | `admin` |

Mock data resets when the page is fully reloaded. To simulate the backend being down,
run `localStorage.setItem('mockOffline', '1')` in the browser console (remove the key to undo).

## Deploying `dist/` to a static host

1. Set `VITE_ROOT_API` in `.env` to the deployed backend URL and `VITE_USE_MOCKS=false`.
2. `npm run build`
3. Upload the `dist/` folder.
4. **SPA fallback (required):** every unknown path must serve `index.html`, otherwise refreshing a
   page like `/clientdetails/123` returns a 404 from the host.
   - Netlify / Render static sites: `public/_redirects` (copied into `dist/`) already does this.
   - Other hosts: add a rewrite rule `/* -> /index.html (200)`.
5. The backend's `CORS_ORIGIN` must be set to the frontend's deployed URL.

## Cross-platform notes
- Import paths match file-name case exactly (Linux and macOS build servers are case-sensitive).
- Assets are imported as modules (no Windows `\` paths), so they work in the build on any OS.
