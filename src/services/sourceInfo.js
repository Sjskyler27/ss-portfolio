import sourceInfo from '../data/source-info.json';

const sourceKey = 'portfolio-notify-source';
const sourceLookup = (sourceInfo.sources || []).reduce((lookup, source) => {
  const values = [source.id, source.key, source.urlKey, ...(source.aliases || [])]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  values.forEach((value) => {
    lookup[value] = source;
  });

  return lookup;
}, {});

function getStoredValue(storage, key) {
  try {
    return storage.getItem(key);
  } catch (error) {
    return '';
  }
}

function setStoredValue(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch (error) {
    // Storage is best-effort. Source-aware features still work for this page load.
  }
}

export function normalizeSource(value) {
  const sourceValue = String(value || '').trim();

  if (!sourceValue) {
    return '';
  }

  const source = sourceLookup[sourceValue.toLowerCase()];

  return source?.key || sourceValue;
}

export function getCurrentSource() {
  if (typeof window === 'undefined') {
    return '';
  }

  const params = new URLSearchParams(window.location.search);
  const source = params.get('source');

  if (source === 'none') {
    return '';
  }

  if (source) {
    const normalizedSource = normalizeSource(source);
    setStoredValue(localStorage, sourceKey, normalizedSource);
    return normalizedSource;
  }

  return normalizeSource(getStoredValue(localStorage, sourceKey));
}
