#!/usr/bin/env node

// Encrypts the plaintext Skyler Bot knowledge file into a committed .enc file.
// The plaintext stays gitignored (it contains private details); only the
// encrypted file is committed and deployed. Decryption happens at runtime with
// BOT_INFO_KEY.
//
// Usage: npm run skyler-bot:encrypt

const fs = require('fs');
const path = require('path');
const { loadDotEnv } = require('./lib/load-dotenv');
const { encryptText } = require('../netlify/functions/skyler-bot-providers/secret');

const PLAINTEXT_PATH = path.resolve(
  __dirname,
  '..',
  'documents',
  'skyler-bot-profile.md',
);
const ENCRYPTED_PATH = `${PLAINTEXT_PATH}.enc`;

function main() {
  loadDotEnv();

  if (!fs.existsSync(PLAINTEXT_PATH)) {
    throw new Error(
      `Plaintext knowledge file not found at ${PLAINTEXT_PATH}. ` +
        'Run skyler-bot:decrypt first if you only have the encrypted copy.',
    );
  }

  const plaintext = fs.readFileSync(PLAINTEXT_PATH, 'utf8');
  const encrypted = encryptText(plaintext);

  fs.writeFileSync(ENCRYPTED_PATH, encrypted, 'utf8');

  console.log(
    JSON.stringify(
      {
        action: 'encrypt',
        source: path.relative(process.cwd(), PLAINTEXT_PATH),
        output: path.relative(process.cwd(), ENCRYPTED_PATH),
        sourceBytes: Buffer.byteLength(plaintext, 'utf8'),
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error('[skyler-bot:encrypt] failed', { message: error.message });
  process.exit(1);
}
