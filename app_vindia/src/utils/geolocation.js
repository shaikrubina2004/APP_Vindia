/**
 * Geolocation helpers for check-in / check-out.
 * Lives at src/utils/geolocation.js
 */

/**
 * Wraps the browser Geolocation API in a promise.
 * Resolves to { lat, lng } on success, or null if the browser doesn't
 * support geolocation, the user denies permission, or it times out.
 */
export const getCurrentLocation = (timeoutMs = 8000) => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Reverse-geocodes lat/lng into a SHORT, coarse address — landmark /
 * locality, district, state. Uses OpenStreetMap's free Nominatim API.
 * Returns null if geocoding fails.
 */
export const reverseGeocodeShort = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
    );
    const data = await response.json();
    const addr = data?.address || {};

    const landmark =
      addr.suburb || addr.neighbourhood || addr.village ||
      addr.town || addr.city_district || addr.city || null;

    const district = addr.county || addr.state_district || null;
    const state = addr.state || null;

    const parts = [landmark, district, state].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
};

/**
 * Forward-geocodes a free-text search query (e.g. what someone types
 * into the "search your location" box) into coordinates. Used by
 * LocationConfirmModal to let an employee correct a wrong auto-detected
 * pin by searching for their real address instead.
 *
 * Returns { lat, lng } for the best match, or null if nothing was found
 * or the request failed.
 */
export const geocodeSearch = async (query) => {
  if (!query || !query.trim()) return null;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        query.trim()
      )}&limit=1`
    );
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
};

/** CEOs are exempt from location capture. */
export const isCEO = (designation = "") =>
  (designation || "").trim().toLowerCase() === "ceo";