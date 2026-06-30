# SWNZ Content

A Content-Snare-style content-collection tool in the **School Websites New Zealand** brand,
built as a single-page **React + Vite + TypeScript** app.

It recreates the design prototype in `project/SWNZ Content.dc.html`. Screens:

- **Requests board** — Kanban columns with featured (gradient) request cards and white
  progress/stats cards, status badges, owners, and due dates.
- **Request detail** — Oranga School (empty "submit for review" state) and Ross School
  (submitted/approved welcome text with a rich-text editor), each with a page/section checklist.
- **Add Request wizard** — Templates → Essentials → Builder → Preview → Finalize, including a
  working page/section/field builder and a field-type picker modal.
- **Quick Actions** dropdown.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build

```bash
npm run build      # type-checks then bundles to dist/
npm run preview    # serve the production build locally
```

The build is a fully static bundle in `dist/` — no server runtime required.

## Deploy to Render

This repo includes a [`render.yaml`](./render.yaml) blueprint that provisions a **Static Site**.

1. Push this repo to GitHub.
2. In the [Render dashboard](https://dashboard.render.com/): **New → Blueprint**, then connect this
   repository. Render reads `render.yaml` and creates the static site automatically.
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - SPA rewrite (`/* → /index.html`) is preconfigured so the app's client-side navigation works.
3. Render builds and gives you a live `*.onrender.com` URL. Every push to the connected branch
   redeploys automatically.

> Prefer manual setup? **New → Static Site** with the same build command and publish directory.

## Project layout

```
src/
  App.tsx              # single state store + screen routing
  types.ts             # shared types
  data.ts              # board/template/field data + colour helpers
  styles.css           # global styles, scrollbars, hover affordances
  components/          # TopChrome, Board, OrangaDetail, RossDetail, Wizard, FieldModal
public/assets/         # SWNZ logo / icon
project/               # original design prototype (reference)
docs/DESIGN_HANDOFF.md # original Claude Design handoff notes
```
