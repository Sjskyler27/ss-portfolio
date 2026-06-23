#!/usr/bin/env node

// Restores the gitignored plaintext knowledge file from the committed .enc file
// using BOT_INFO_KEY. Run this on a fresh checkout before editing the bot's
// knowledge, then re-run skyler-bot:encrypt to update the committed copy.
//
// Usage: npm run skyler-bot:decrypt

const fs = require('fs');
const path = require('path');
const { loadDotEnv } = require('./lib/load-dotenv');
const { decryptText } = require('../netlify/functions/skyler-bot-providers/secret');

const PLAINTEXT_PATH = path.resolve(
  __dirname,
  '..',
  'documents',
  'skyler-bot-profile.md',
);
const ENCRYPTED_PATH = `${PLAINTEXT_PATH}.enc`;

function main() {
  loadDotEnv();

  if (!fs.existsSync(ENCRYPTED_PATH)) {
    throw new Error(`Encrypted knowledge file not found at ${ENCRYPTED_PATH}.`);
  }

  if (fs.existsSync(PLAINTEXT_PATH)) {
    throw new Error(
      `Refusing to overwrite existing plaintext at ${PLAINTEXT_PATH}. ` +
        'Delete it first if you want to restore from the encrypted copy.',
    );
  }

  const decrypted = decryptText(fs.readFileSync(ENCRYPTED_PATH, 'utf8'));

  fs.writeFileSync(PLAINTEXT_PATH, decrypted, 'utf8');

  console.log(
    JSON.stringify(
      {
        action: 'decrypt',
        source: path.relative(process.cwd(), ENCRYPTED_PATH),
        output: path.relative(process.cwd(), PLAINTEXT_PATH),
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error('[skyler-bot:decrypt] failed', { message: error.message });
  process.exit(1);
}
