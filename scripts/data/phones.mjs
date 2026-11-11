import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhones(values) {
  const phones = [];
  const dropped = [];
  for (const raw of values ?? []) {
    if (!raw) continue;
    const parsed = parsePhoneNumberFromString(String(raw), "KE");
    if (!parsed?.isValid() || parsed.country !== "KE") {
      dropped.push(String(raw));
      continue;
    }
    phones.push(parsed.number);
  }
  return { phones: [...new Set(phones)], dropped };
}

export function whatsappFrom(phones, osmWhatsapp) {
  if (osmWhatsapp) {
    const parsed = parsePhoneNumberFromString(String(osmWhatsapp), "KE");
    if (parsed?.isValid()) return parsed.number;
  }
  for (const phone of phones) {
    const parsed = parsePhoneNumberFromString(phone, "KE");
    if (parsed?.getType() === "MOBILE") return parsed.number;
  }
  return null;
}
