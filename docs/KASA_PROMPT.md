# KASA prompt — Find My Gym (Kenya gym finder, React/Vite rebuild)

Self-contained resume file. Written 2026-10-11 against Overture 2026-09-23.1.
Owner override: product name is **Find My Gym**; palette unchanged.

## How to work

Decisions in this file + `docs/DECISIONS.md` are final. Ledger is `docs/PROGRESS.md` (≤150 lines). One slice = one commit. Never force-push main. Tag `legacy-next` is the Next.js snapshot. Honesty beats a fuller UI. Token discipline: do not cat datasets; targeted tests; components < 250 lines.

## Mission

Static React (Vite) PWA. No DB, no app server, no runtime API keys. Anyone in Kenya can find a real gym (typo-tolerant), see trust/provenance, reach it (call/WhatsApp/directions/website), and report errors via WhatsApp/email. Data is JSON in Git, rebuilt monthly.

Measurable done: D1 ≥400 default-visible; D2 golden set; D3 ≥75% with a contact; D4 no fake Verified/ratings/prices/hours/photos, address never “Kenya”; D5 static only; D6 Lighthouse budgets; D7 offline after one visit; D8 check + Playwright + axe + CI.

## Stack

Vite 8 + React 19.2 + TS strict + React Router 7 library/data mode + Tailwind 4 + Radix + lucide + vaul + Zustand + MiniSearch + MapLibre GeoJSON clusters + OpenFreeMap + vite-plugin-pwa + DuckDB extract + Zod gates + Vitest + Playwright + Cloudflare static.

## Data (heart)

Overture Places (taxonomy/basic_category; gym/yoga/pilates/martial_arts/boxing/gymnastics/boot_camp/fitness_studio) ∪ OSM Overpass (extended tags) ∪ GeoNames places ∪ human overrides. Merge: same phone, same website host, or ≤150 m + name-token Jaccard ≥0.5, or `merge.json`. Never proximity-only. Trust tiers: verified (override only) / corroborated / listed / unconfirmed. Address null when unknown.

Gates: Zod, Kenya polygon, unique id/slug, E.164 +254, https/http URLs, address ≠ Kenya, total ≥350, Nairobi ≥150, every county listed, golden set, payload budget, licence notices.

## Features

P0 F-00…F-03. P1 F-10…F-17. P2 MUST F-22, F-23, F-26, F-27 then SHOULD F-20, F-21, F-24, F-25. P3 COULD. P4 launch.

## UI

KAYA Trust UI tokens in the original brief §7 (now branded Find My Gym). Trust badge on every card. Map+list one control. Honest empties.

## Anti-goals

Next.js, any DB/BaaS, server code, Google Places/Maps JS, scraping, fake ratings/photos, numeric trust scores, components >250 lines, skipping tests.

## Execution order

Tag → branch → PROGRESS + DECISIONS → F-00 (Next alive until Vite `/`) → F-01 (report D1/D3) → F-02 → F-03 → delete Next → CI → draft PR → P1…P4.

Full original brief (sections 0–16) was pasted 2026-10-11. Do not re-research decisions. If a rule conflicts with a fuller UI, honesty wins.
