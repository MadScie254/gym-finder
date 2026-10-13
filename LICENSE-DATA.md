# Find My Gym: data licence

The merged venue dataset in `public/data/` (`gyms.<hash>.json`, `manifest.json`,
`landmarks.json`) is published as an **ODbL 1.0** derivative: OpenStreetMap
attributes are mixed with non-OSM fields, so the whole database is offered under the
Open Database Licence (https://opendatacommons.org/licenses/odbl/1-0/).

## Sources and their licences

| Source | Licence | Used for |
| --- | --- | --- |
| © OpenStreetMap contributors | ODbL 1.0 | venue locations, names, tags |
| Overture Maps Foundation, Places (Meta and Microsoft business data) | CDLA-Permissive-2.0 | venues, phones, websites, landmarks |
| Foursquare Open Source Places, transformed to the Overture schema | Apache-2.0 | records Overture sources from Foursquare |
| AllThePlaces, via Overture | CC0 1.0 | records Overture sources from AllThePlaces (no attribution required; listed for transparency) |
| GeoNames gazetteer | CC BY 4.0 | neighbourhood and town names (`data/kenya-places.json`) |
| geoBoundaries gbOpen / RCMRD, Kenya ADM0 | confirm with counsel (commonly CC BY or public domain) | the inside-Kenya polygon check |
| Public web pages (web research) | facts only | a venue's name, phone, address and hours text; the evidence URLs are kept in each venue's `provenance.evidence`. No page text, photos, ratings or reviews are copied. |

`manifest.json` lists the licences that apply to the data in that build, the Overture
release id, the OSM snapshot date (and whether it is stale) and the build date.
`NOTICE` carries the copyright notices.

## What the trust labels mean for licensing

"Verified" is produced only by a human-edited file in `data/overrides/venues/`; the
override text is Find My Gym's own contribution. "Corroborated" and "Listed" come from
the open datasets above and from web research and are not confirmations of opening hours.

This is not legal advice. Have counsel review the ODbL/CDLA/Apache/CC mix, the
Foursquare notice wording and the boundary-file licence before a commercial launch.
