// Browser geolocation + reverse geocoding for the delivery-address form.
//
// This is a convenience prefill only: it reads the device's coordinates and
// asks OpenStreetMap's public Nominatim service to turn them into a street,
// city, state and PIN code. The result is dropped straight into editable form
// fields and is validated server-side by lib/orders/delivery.ts like any
// hand-typed address — the network response is never trusted or persisted on
// its own, and coordinates are not stored.

export type DetectedAddress = {
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

/**
 * Why a detection attempt produced nothing. Each maps to its own user-facing
 * message so "you denied permission" never reads the same as "the lookup
 * service timed out" or "this page isn't allowed to ask for location".
 */
export type LocationFailure =
  /** The page is not a secure context (http:// on a device/host) — the API is
   *  blocked before it can even prompt. Fix by serving over https or localhost. */
  | "insecure-context"
  /** No geolocation API on this browser. */
  | "unsupported"
  /** The user (or their browser policy) refused the permission prompt. */
  | "denied"
  /** The device couldn't produce a fix in time (weak/no GPS, indoors). */
  | "unavailable"
  /** Coordinates came back but the reverse-geocode lookup failed or was blocked. */
  | "lookup-failed"
  /** A lookup succeeded but returned no address we could use to prefill. */
  | "no-address";

export type LocationDetection =
  | { ok: true; address: DetectedAddress }
  | { ok: false; reason: LocationFailure };

export type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  quarter?: string;
  suburb?: string;
  city_district?: string;
  hamlet?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  state_district?: string;
  region?: string;
  postcode?: string;
};

type NominatimResponse = { address?: NominatimAddress };

// Nominatim's public policy requires a descriptive User-Agent and forbids
// heavy traffic; the browser sets its own UA, so we just keep the request
// single, on-demand and lightly rate-limited by the button's disabled state.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

// Indian administrative naming varies wildly per OSM trace: a place may be a
// "city", "town" or "village", and the district may be a "city_district",
// "municipality" or "county". Fall through every plausible key before giving
// up, so a rural or ambiguously-tagged fix still prefills something.
const firstString = (...values: Array<string | undefined>): string =>
  values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";

// "Kundapura taluk" -> "Kundapura": OSM names Indian sub-districts with a suffix.
const withoutAdminSuffix = (value: string | undefined): string | undefined =>
  value?.replace(/\s+(taluka?|tehsil|tahsil|mandal|block|district)$/i, "");

const PIN_RE = /^[1-9][0-9]{5}$/;

/**
 * Turn a Nominatim address into form fields. The city is the real town (or
 * the taluk town for a village), never a hobli or ward; those, the village and
 * the locality go into address line 1 instead so nothing detected is lost.
 */
export function buildDetectedAddress(address: NominatimAddress): DetectedAddress {
  const city = firstString(
    address.city,
    address.town,
    withoutAdminSuffix(address.county),
    withoutAdminSuffix(address.state_district),
    address.municipality,
    address.city_district,
    address.village,
  );
  const street = [address.house_number, address.road].filter((part) => part?.trim()).join(" ");
  const line1 = [
    street,
    firstString(address.neighbourhood, address.quarter, address.suburb),
    firstString(address.hamlet, address.village),
    firstString(address.city_district, address.municipality),
  ]
    .map((part) => part.trim())
    .filter((part, index, parts) => part && part !== city && parts.indexOf(part) === index)
    .join(", ");
  const postcode = firstString(address.postcode).replace(/\s/g, "");
  return {
    line1,
    city,
    state: firstString(address.state, address.region),
    pincode: PIN_RE.test(postcode) ? postcode : "",
  };
}

/**
 * Ask the browser for a one-off fix and reverse-geocode it into an address the
 * form can prefill. Failures are reported as a specific reason rather than a
 * bare null so the UI can tell the user what actually went wrong.
 */
export async function detectAddressFromDevice(): Promise<LocationDetection> {
  if (typeof navigator === "undefined") return { ok: false, reason: "unsupported" };

  // Non-secure origins (http:// on a LAN IP or device) are denied outright by
  // the browser, before any prompt — call it out explicitly, since it is the
  // one failure the user cannot fix from the page itself.
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return { ok: false, reason: "insecure-context" };
  }
  if (!("geolocation" in navigator)) return { ok: false, reason: "unsupported" };

  // Resolve with the failure reason intact: a refused prompt is a different
  // problem (and a different message) than a device that can't get a fix.
  const position = await new Promise<
    { position: GeolocationPosition } | { reason: LocationFailure }
  >((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (value) => resolve({ position: value }),
      (error) => resolve({ reason: error.code === 1 ? "denied" : "unavailable" }),
      // A fresh, precise fix: a cached or Wi-Fi/IP estimate can be kilometres off,
      // which put buyers in the wrong locality and PIN code.
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });

  if ("reason" in position) return { ok: false, reason: position.reason };
  const { latitude, longitude } = position.position.coords;

  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: "jsonv2",
      addressdetails: "1",
      zoom: "18",
      // English names; otherwise fields can come back in the local script.
      "accept-language": "en",
    });
    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { ok: false, reason: "lookup-failed" };
    const data = (await response.json()) as NominatimResponse;
    if (!data.address) return { ok: false, reason: "no-address" };

    const address = buildDetectedAddress(data.address);
    // Prefill whatever the lookup managed to fill, as long as it isn't wholly
    // empty; the user reviews every field and the server re-validates it all.
    if (!address.line1 && !address.city && !address.state && !address.pincode) {
      return { ok: false, reason: "no-address" };
    }
    return { ok: true, address };
  } catch {
    return { ok: false, reason: "lookup-failed" };
  }
}

/** User-facing copy for each failure reason, plus a generic fallback. */
export function locationFailureMessage(reason: LocationFailure): string {
  switch (reason) {
    case "insecure-context":
      return "This page can't ask for your location because it isn't loaded over https. Type the address instead.";
    case "unsupported":
      return "This browser can't share a location. Type the address instead.";
    case "denied":
      return "Location access was denied. Allow location for this site and try again, or type the address instead.";
    case "unavailable":
      return "Couldn't get a location fix. Move somewhere with a clearer signal and retry, or type the address instead.";
    case "lookup-failed":
      return "Got your location but couldn't look up the address. Check your connection and retry, or type the address instead.";
    case "no-address":
    default:
      return "Couldn't find an address for that location. Type the address instead.";
  }
}
