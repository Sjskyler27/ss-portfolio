#!/usr/bin/env node

// Encrypts gitignored source customization notes into a committed .enc file.
// Uses SOURCE_INFO_KEY so source/job targeting can rotate independently from
// the Skyler Bot profile key.
//
// Usage: npm run source-info:encrypt

const fs = require('fs');
const path = require('path');
const { loadDotEnv } = require('./lib/load-dotenv');
const { encryptText } = require('../netlify/functions/skyler-bot-providers/secret');

const PLAINTEXT_PATH = path.resolve(__dirname, '..', 'documents', 'source-info');
const ENCRYPTED_PATH = `${PLAINTEXT_PATH}.enc`;

function main() {
  loadDotEnv();

  if (!fs.existsSync(PLAINTEXT_PATH)) {
    throw new Error(
      `Plaintext source info file not found at ${PLAINTEXT_PATH}. ` +
        'Run source-info:decrypt first if you only have the encrypted copy.',
    );
  }

  const plaintext = fs.readFileSync(PLAINTEXT_PATH, 'utf8');
  const encrypted = encryptText(plaintext, process.env, 'SOURCE_INFO_KEY');

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
  console.error('[source-info:encrypt] failed', { message: error.message });
  process.exit(1);
}
