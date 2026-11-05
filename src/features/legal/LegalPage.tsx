export function LegalPage() {
  const googleMap = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_MAPS_MAP_ID);
  return (
    <section className="page">
      <h1>Legal</h1>
      <p>Find My Gym does not send your location to a server we run, and this app sets no cookies. If you choose to share location, the map moves to that area and its provider receives map requests for that area.</p>
      <p>Reports you send by WhatsApp or email are your own message to the support contact. They are not stored in this app.</p>
      <p>Listing data is an ODbL derivative of OpenStreetMap mixed with Overture Maps (CDLA-Permissive-2.0), Foursquare via Overture (Apache-2.0), and GeoNames (CC BY 4.0). See LICENSE-DATA.md. This page is not a claim that a lawyer has signed off, and it is not a Data Protection Act registration.</p>
      {googleMap ? <p>The map comes from Google Maps. Its attribution stays on the map. Use of Google Maps features is subject to the <a href="https://maps.google.com/help/terms_maps/">Google Maps Additional Terms</a> and <a href="https://policies.google.com/privacy">Google Privacy Policy</a>.</p>
        : <p>Map tiles come from OpenFreeMap. Attribution stays on the map.</p>}
    </section>
  );
}
