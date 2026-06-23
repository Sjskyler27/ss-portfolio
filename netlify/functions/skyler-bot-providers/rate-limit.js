// Best-effort per-IP rate limiting for the Skyler Bot function.
//
// NOTE: this state lives in the warm Lambda instance's memory, so it resets on
// cold starts and is not shared across concurrent instances. It is a cheap
// abuse backstop, not a hard guarantee. The frontend enforces the same limits
// for UX; a shared store (Netlify Blobs / Upstash) would be needed for strict
// global enforcement.
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const WINDOWS = [
  { name: 'minute', limit: 10, ms: MINUTE_MS },
  { name: 'day', limit: 35, ms: DAY_MS },
];

const hitsByIp = new Map();

function getClientIp(event) {
  const headers = event.headers || {};

  return (
    headers['x-nf-client-connection-ip'] ||
    (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    headers['client-ip'] ||
    'unknown'
  );
}

function checkRateLimit(event, now = Date.now()) {
  const ip = getClientIp(event);
  const recent = (hitsByIp.get(ip) || []).filter((ts) => now - ts < DAY_MS);

  for (const window of WINDOWS) {
    const inWindow = recent.filter((ts) => now - ts < window.ms);

    if (inWindow.length >= window.limit) {
      const oldest = Math.min(...inWindow);
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((window.ms - (now - oldest)) / 1000),
      );

      hitsByIp.set(ip, recent);

      return {
        allowed: false,
        window: window.name,
        limit: window.limit,
        retryAfterSeconds,
      };
    }
  }

  recent.push(now);
  hitsByIp.set(ip, recent);

  return { allowed: true };
}

module.exports = {
  checkRateLimit,
  getClientIp,
};
