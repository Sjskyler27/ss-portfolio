const fs = require('fs');
const path = require('path');

// Minimal .env loader so local scripts (encrypt/decrypt/smoke) can read
// BOT_INFO_KEY and provider keys without an extra dependency.
function loadDotEnv(envPath = path.resolve(__dirname, '..', '..', '.env')) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmedLine.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();
    const rawValue = trimmedLine.slice(equalsIndex + 1).trim();

    if (!key || process.env[key]) {
      continue;
    }

    const unwrappedValue =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;

    process.env[key] = unwrappedValue;
  }
}

module.exports = { loadDotEnv };
