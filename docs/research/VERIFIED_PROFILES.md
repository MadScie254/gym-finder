# Verified profiles: own-website checks, 11 Nov 2026

Plan reference: REVAMP_PLAN D7, 5.4 and 6.3. Raw log: `data/research/site-checks-2026-11-11.json`. One override per verified venue: `data/overrides/venues/<slug>.json`.

## Method

- **Selection.** From the built catalogue, I took venues with tier `corroborated`, at least one phone, and their own website (not a social, Google or link-shortener URL). That gave 92 venues: 65 in Nairobi and 27 elsewhere. I took all 26 non-Nairobi venues except Physiq & Tone, whose "website" is a YouTube link, plus 14 in Nairobi. That makes 40 venues across all 14 counties that had any eligible venue.
- **Check.** I opened each gym's own site the way a reader would: the homepage plus at most three pages (contact, rates, facilities). For a site that did not load, I checked DNS with both Google and Cloudflare DNS-over-HTTPS, and I retried the site through Firecrawl from a second network. Prices that only appear once the page runs in a browser were read with Firecrawl. Maps, Facebook, Instagram, directories, listicles and guest reviews were never used as evidence.
- **Operating rule.** A venue counts as operating only if its site shows one of these: a current-year copyright, content dated in the last 12 months, or a dated notice that is still current. A site that is up but shows nothing dated recently is **not** verified.
- **Field rules.**
  - Every field has a source URL and a verbatim quote under 200 characters.
  - A price is recorded only when its currency and period are written in the same statement. `asOf` is the date the price was read on a page with current content, and `null` when the page is undated.
  - Hours are always copied word for word. They are also turned into OSM `opening_hours` only when the mapping needs no guess. Hours that do not say which days stay as text, so they never drive "open now".
  - A steam room is not counted as a sauna.
- **Second pass.** I re-fetched every evidence URL and searched for every quote word for word.
  - 71 of 74 quotes were found in the page HTML.
  - The other 3 (the Tumaini and InShape prices) only appear in the rendered page. A fresh Firecrawl render confirmed them.
  - smartgyms.co.ke sometimes serves a bot-check page instead of the site. A retry, and the render, both showed the quoted text.
- **Fields dropped on review:**
  - InShape sauna: the FAQ says yes, but the homepage says the spa is "Coming Soon".
  - Mnarani classes: the only mention is an undated "starting September".
  - All Dojo prices: the rates table has no currency.
  - All Level 24 prices: the site says "Rates on request".
  - The Banana House booking-desk hours: they are reception hours, not gym hours.
- **Trust label.** These venues show the reason "Details confirmed on the gym's own website on 11 Nov 2026" and a score of 90 (95 is kept for phone or visit checks). Nothing says a person visited.

## Results

| Name | County | Result | Fields obtained |
|---|---|---|---|
| Tumaini Fitness Centre | Kiambu | Verified | hours (OSM); day pass; monthly; amenities: classes; address; phone |
| Mnarani Gym | Kilifi | Verified | hours (OSM); day pass; monthly; address |
| Health Hub Oasis | Kisumu | Verified | amenities: classes; address; instagram |
| Banana House And Wellness Centre | Lamu | Verified | phone; whatsapp; instagram |
| InShape Fitness | Mombasa | Verified | monthly; amenities: classes, showers, women-only; address; phone |
| Dojo | Nairobi | Verified | hours (OSM); amenities: classes, sauna; address; phone; instagram |
| Level 24 | Nairobi | Verified | hours (OSM); amenities: classes, parking, pool, showers, weights; address; phone; whatsapp |
| Parklands Sports Club | Nairobi | Verified | hours (text); amenities: classes, pool, weights; address; phone; instagram |
| Smart Gyms Junction | Nairobi | Verified | hours (text); day pass; monthly; amenities: classes, parking, showers; address; phone |
| SmashFit Gym Sarit | Nairobi | Verified | day pass; monthly; amenities: classes, showers, weights; address; phone; instagram |
| PowerZone GYM & Fitness | Garissa | Dead domain | — |
| Ongata Rongai Boxing Club | Kajiado | Live, nothing current | — |
| Flora Health & Fitness Centre | Kakamega | Dead domain | — |
| CrossFit Boveda | Kiambu | Dead domain | — |
| EasyGym Kenya | Kiambu | Dead domain | — |
| Millennium Gyms and Studios | Kiambu | Site error | — |
| RUAKA GYM&AEROBICS,Spa | Kiambu | Dead domain | — |
| Sweat Hot Yoga & Pilates Studio | Kiambu | Dead domain | — |
| Warriors Playground Fitness Centre | Kiambu | Dead domain | — |
| ReshapeMe Gym Watamu | Kilifi | Dead domain | — |
| Lifestyle Spa and Fitness Center | Kisumu | Dead domain | — |
| Bold Gym International | Kwale | Dead domain | — |
| Mount Kenya Climbing Gym | Laikipia | Dead domain | — |
| Curlture fitness | Meru | Dead domain | — |
| Legacy Fitness Club | Mombasa | Parked domain | — |
| Step 'n' Step Gym | Mombasa | Dead domain | — |
| Tiger Fitness Gym | Mombasa | Different business | — |
| Times Health & Fitness Centre | Mombasa | Dead domain | — |
| K-Fitness | Nakuru | Live, nothing current | — |
| Pivot Hotel and Fitness Centre | Nakuru | Different business | — |
| Alpha Cross Body Fitness Center | Nyeri | Dead domain | — |
| CrossFit Kwetu | Nairobi | Site error | — |
| Fahari Gym and Sports | Nairobi | Different business | — |
| FirstPower CrossFit | Nairobi | Maintenance page | — |
| Fitness Empire | Nairobi | Dead domain | — |
| Hyat Fitness | Nairobi | Live, nothing current | — |
| Pent Hse Gymnasium | Nairobi | Dead domain | — |
| Racing Sport Gym | Nairobi | Dead domain | — |
| The Colosseum Fitness Centre | Nairobi | Live, nothing current | — |
| Zeal Fitness | Nairobi | Dead domain | — |

## Totals

| Measure | Count |
|---|---|
| Venues checked | 40 |
| Verified (website) | 10 |
| With hours | 6 (4 in OSM syntax; Mnarani's split day does not parse in the app, so 3 drive "open now": Tumaini, Dojo, Level 24) |
| With day-pass price | 4 (Tumaini, Mnarani, Smart Gyms Junction, SmashFit) |
| With monthly price | 5 (Tumaini, Mnarani, InShape, Smart Gyms Junction, SmashFit) |
| With amenities | 8 |
| Prices with `asOf: null` (undated page) | 2 (both Mnarani) |
| Not verified | 30 |

Catalogue before and after (manifest): verified went from 0 to 10 and corroborated from 149 to 139. Listed (348) and unconfirmed (69) did not change. The total is still 566, with 497 visible by default. Venues with hours went from 0 to 6, with amenities from 0 to 8, and with any price from 0 to 5. The committed catalogue had no venue with hours before this work, not the "about 9" mentioned in the brief.

## Failures, plainly

- **Dead domains (19).** These domains do not resolve on either resolver:
  - PowerZone (Garissa), Flora Health & Fitness (Kakamega), CrossFit Boveda, EasyGym Kenya, RUAKA Gym, Sweat Hot Yoga, Warriors Playground (Kiambu)
  - ReshapeMe Watamu (Kilifi), Lifestyle Spa (Kisumu), Bold Gym International (Kwale), Mount Kenya Climbing Gym (Laikipia), Curlture Fitness (Meru)
  - Step 'n' Step, Times Health & Fitness (Mombasa), Alpha Cross Body Fitness (Nyeri)
  - Fitness Empire, Pent Hse Gymnasium, Racing Sport Gym, Zeal Fitness (Nairobi)
- **Parked (1).** Legacy Fitness Club (Mombasa): the domain redirects to a HugeDomains sale page.
- **Different business (3):**
  - Tiger Fitness Gym: the link goes to an online supplements shop.
  - Pivot Hotel and Fitness Centre: the link goes to a South African spa chain.
  - Fahari Gym and Sports: the link goes to a gym equipment shop at the same address. Fahari was not excluded, because the site does not show whether a gym also runs there, and it is a golden seed name.
- **Site error (2).**
  - Millennium Gyms: the site returns HTTP 500.
  - CrossFit Kwetu: the HTTPS certificate does not match the host, and HTTP returns 500.
- **Maintenance (1).** FirstPower CrossFit shows a "Maintenance Mode" page.
- **Live, nothing current (4):**
  - Ongata Rongai Boxing Club: the site is undated.
  - K-Fitness: © 2023, rates without a currency.
  - Hyat Fitness: © 2019.
  - The Colosseum: © 2021.
  These may well be open, but their sites do not show it, so they get no badge.
- **No venue was marked closed.** No site said a gym had closed. A dead domain is not evidence of closure.
- **Not done.**
  - The 30 failures still show their dead or wrong website link in the catalogue. The override mechanism cannot clear a field. Removing those links is a follow-up.
  - Nobody has phoned any of these venues.
  - The 10% human spot-check in plan 6.3 is still owed.
