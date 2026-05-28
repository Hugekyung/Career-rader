const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "rpagecode",
  "logpath",
  "sn",
  "sc",
  "oem_code",
  "stext",
  "listno",
  "searchword",
  "searchtype",
  "search_uuid",
  "location",
  "paid_fl",
]);

export function normalizeUrl(input: string, baseUrl?: string): string | undefined {
  try {
    const url = baseUrl ? new URL(input, baseUrl) : new URL(input);

    url.hash = "";

    for (const key of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

export function getUrlMatchTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
