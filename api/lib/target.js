const DEFAULT_TARGET = 'www.baidu.com';
const BLOB_PATH = 'demo-target.json';

let memoryTarget = DEFAULT_TARGET;

function normalizeTarget(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).hostname;
    } catch {
      return null;
    }
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(trimmed)) {
    return null;
  }
  return trimmed.toLowerCase();
}

async function readFromBlob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  const { head } = require('@vercel/blob');
  const meta = await head(BLOB_PATH).catch(() => null);
  if (!meta) return null;

  const response = await fetch(meta.url, { cache: 'no-store' });
  if (!response.ok) return null;

  const data = await response.json();
  return normalizeTarget(data.test) || null;
}

async function writeToBlob(target) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;

  const { put } = require('@vercel/blob');
  await put(BLOB_PATH, JSON.stringify({ test: target, updatedAt: new Date().toISOString() }), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
  return true;
}

async function getTarget() {
  const blobTarget = await readFromBlob();
  if (blobTarget) {
    memoryTarget = blobTarget;
    return blobTarget;
  }
  return memoryTarget;
}

async function setTarget(value) {
  const target = normalizeTarget(value);
  if (!target) {
    throw new Error('无效的域名格式，例如：www.baidu.com');
  }

  memoryTarget = target;
  await writeToBlob(target);
  return target;
}

function getDefaultTarget() {
  return DEFAULT_TARGET;
}

function corsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = {
  getTarget,
  setTarget,
  getDefaultTarget,
  normalizeTarget,
  corsHeaders,
};
