/**
 * Autocomplete against public Nominatim is intentionally disabled.
 * Place searches are performed only after an explicit form submission.
 */
export async function GET() {
  return Response.json(
    { error: "Remote autocomplete is disabled; submit a place search instead." },
    {
      status: 410,
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
