# Photos

The photographs in `public/photos` are free stock pictures from Pexels, used under the Pexels License: free to use and change, no attribution required. We credit the photographers anyway (`docs/PHOTO_CREDITS.md` and the About page).

They are illustrations. None shows a gym in the list, a meal from a store, or anyone connected to this app. Do not caption one as if it did, and do not put one on a page about a specific gym or store (the demo store pages have none, on purpose).

## What is in this folder

- `sources.json`: one entry per picture. The Pexels id, title, photographer, page URL, a description for screen readers, the point to keep in frame when it is cropped (`focus`), and where it is used. An entry may also set `crop` (fractions of the original: left, top, right, bottom), `widths` and `quality`.
- `process.py`: turns the originals into WebP files and writes the typed catalogue and the credits.

## Rebuild the files

1. Download each original at 1600 px wide, into an empty directory outside the repository. The ids are the `pexelsId` fields.

   ```bash
   mkdir -p /tmp/photo-originals
   curl -L -o /tmp/photo-originals/<id>.jpg "https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=1600"
   ```

2. Run the script in isolated mode, because the directory holds files from the internet. It needs Python 3 with Pillow built with WebP support.

   ```bash
   python3 -I scripts/photos/process.py --raw /tmp/photo-originals
   ```

   It writes `public/photos/<slug>-<width>-<hash>.webp` (480, 800 and 1200 px wide, with the hash of the file's bytes in the name), `src/assets/photos.ts` and `docs/PHOTO_CREDITS.md`. It removes the older files of each picture. Camera and location data in the originals is dropped.

3. Run `npm run check`, then commit the new files with `sources.json`.

## Add a picture

1. Find it on Pexels. Read the photographer's name and the page URL from the photo's page; do not guess them.
2. Add an entry to `sources.json` and run the steps above.
3. Use it through `Photo`, `Poster` or `EmptyState` (`src/ui`), so it is lazy-loaded, sized, and an illustration for screen readers (empty `alt`) unless the page needs it described.

## How the app serves them

The files are static and have content hashes in their names, so `vercel.json` and `public/_headers` let a browser keep them for a year. They are not in the service worker's install list, which holds only the app's own scripts and styles: a picture is cached the first time it is shown, and until then offline shows the picture's average colour where it would be.
