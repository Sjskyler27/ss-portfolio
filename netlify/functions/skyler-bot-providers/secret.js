const crypto = require('crypto');

// AES-256-GCM keyed by BOT_INFO_KEY (a 64-char hex string = 32 bytes).
// Encrypted payload format: "v1:" + base64(iv[12] | authTag[16] | ciphertext).
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION_PREFIX = 'v1:';

function getKey(env = process.env, envName = 'BOT_INFO_KEY') {
  const hexKey = String(env[envName] || '').trim();

  if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error(
      `${envName} must be a 64-character hex string (32 bytes for AES-256).`,
    );
  }

  return Buffer.from(hexKey, 'hex');
}

function encryptText(plaintext, env = process.env, envName = 'BOT_INFO_KEY') {
  const key = getKey(env, envName);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${VERSION_PREFIX}${Buffer.concat([iv, authTag, ciphertext]).toString(
    'base64',
  )}\n`;
}

function decryptText(payload, env = process.env, envName = 'BOT_INFO_KEY') {
  const key = getKey(env, envName);
  const trimmed = String(payload || '').trim();
  const body = trimmed.startsWith(VERSION_PREFIX)
    ? trimmed.slice(VERSION_PREFIX.length)
    : trimmed;
  const raw = Buffer.from(body, 'base64');

  if (raw.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Encrypted bot info payload is malformed or truncated.');
  }

  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  encryptText,
  decryptText,
};
