#!/usr/bin/env node

// Restores gitignored source customization notes from the committed .enc file.
// Uses SOURCE_INFO_KEY.
//
// Usage: npm run source-info:decrypt

const fs = require('fs');
const path = require('path');
const { loadDotEnv } = require('./lib/load-dotenv');
const { decryptText } = require('../netlify/functions/skyler-bot-providers/secret');

const PLAINTEXT_PATH = path.resolve(
  __dirname,
  '..',
  'documents',
  'source-info.private.json',
);
const ENCRYPTED_PATH = `${PLAINTEXT_PATH}.enc`;

function main() {
  loadDotEnv();

  if (!fs.existsSync(ENCRYPTED_PATH)) {
    throw new Error(`Encrypted source info file not found at ${ENCRYPTED_PATH}.`);
  }

  if (fs.existsSync(PLAINTEXT_PATH)) {
    throw new Error(
      `Refusing to overwrite existing plaintext at ${PLAINTEXT_PATH}. ` +
        'Delete it first if you want to restore from the encrypted copy.',
    );
  }

  const decrypted = decryptText(
    fs.readFileSync(ENCRYPTED_PATH, 'utf8'),
    process.env,
    'SOURCE_INFO_KEY',
  );

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
  console.error('[source-info:decrypt] failed', { message: error.message });
  process.exit(1);
}
