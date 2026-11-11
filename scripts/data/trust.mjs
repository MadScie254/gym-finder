const MONTH = 30.44 * 24 * 60 * 60 * 1000;

function monthsAgo(iso, months) {
  if (!iso) return false;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return false;
  return Date.now() - at <= months * MONTH;
}

export function computeTrust(venue, override) {
  const verifiedAt = override?.verifiedAt ?? null;
  const sources = [...new Set(venue.sources ?? [])];
  const lastSeen = venue.lastSeen ?? null;
  const stale = lastSeen ? !monthsAgo(lastSeen, 24) : true;
  const hasContact = Boolean((venue.phones ?? []).length || venue.website);
  const both = sources.includes("osm") && sources.includes("overture");
  const highOverture = (venue.overtureConfidence ?? 0) >= 0.85 && hasContact && monthsAgo(lastSeen, 24);
  const listedOk = (
    ((venue.overtureConfidence ?? 0) >= 0.5 || (sources.includes("osm") && venue.name))
    && monthsAgo(lastSeen, 36)
  );

  if (verifiedAt && monthsAgo(verifiedAt, 12) && !override?.closed) {
    return {
      tier: "verified",
      score: 95,
      reasons: ["Confirmed by a Find My Gym reviewer"],
      sources,
      lastSeen,
      stale,
      verifiedAt,
    };
  }

  if (both || highOverture) {
    const reasons = [];
    if (both) reasons.push("Seen in OpenStreetMap and Overture Maps");
    else reasons.push("High-confidence Overture listing with contact details");
    if (hasContact) reasons.push("Phone or website listed");
    if (lastSeen) reasons.push(`Updated ${lastSeen.slice(0, 7)}`);
    return { tier: "corroborated", score: 80, reasons, sources, lastSeen, stale, verifiedAt: null };
  }

  if (listedOk) {
    return {
      tier: "listed",
      score: 55,
      reasons: [
        sources.includes("osm") ? "Mapped in OpenStreetMap" : "Listed in Overture Maps",
        "Call to confirm hours and price",
      ],
      sources,
      lastSeen,
      stale,
      verifiedAt: null,
    };
  }

  return {
    tier: "unconfirmed",
    score: 20,
    reasons: ["Sparse or old source data — hidden from default browse"],
    sources,
    lastSeen,
    stale,
    verifiedAt: null,
  };
}
