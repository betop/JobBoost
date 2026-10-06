export const MAX_ALLOWED_IPS = 50;

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function isValidIp(ip: string): boolean {
  if (IPV4.test(ip)) return true;
  if (!ip.includes(":") || !/^[0-9a-fA-F:.]+$/.test(ip)) return false;
  try {
    new URL(`http://[${ip}]/`);
    return true;
  } catch {
    return false;
  }
}

/** Parse newline/comma/whitespace separated text into a trimmed, deduped list plus validation errors. */
export function parseIpList(text: string): { ips: string[]; error: string | null } {
  const seen = new Set<string>();
  const ips: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const ip = raw.trim();
    if (!ip) continue;
    const key = ip.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ips.push(ip);
  }
  const invalid = ips.filter((ip) => !isValidIp(ip));
  if (invalid.length > 0) {
    return { ips, error: `Invalid IP address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}` };
  }
  if (ips.length > MAX_ALLOWED_IPS) {
    return { ips, error: `Too many IPs (${ips.length}). Maximum is ${MAX_ALLOWED_IPS}.` };
  }
  return { ips, error: null };
}

export const ALLOWED_IPS_HELP =
  "Only requests from these IPs can generate with this key. Leave empty to allow any IP.";
