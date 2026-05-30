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

async function listConfigBlobs() {
  const { list } = require('@vercel/blob');
  const { blobs } = await list({ prefix: BLOB_PATH, limit: 20 });
  return blobs.filter((blob) => blob.pathname === BLOB_PATH);
}

async function readFromBlob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const blobs = await listConfigBlobs();
    if (!blobs.length) return null;

    const latest = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )[0];

    const blobUrl = latest.downloadUrl || latest.url;
    const response = await fetch(blobUrl, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    if (!response.ok) return null;

    const data = await response.json();
    return normalizeTarget(data.test) || null;
  } catch {
    return null;
  }
}

async function writeToBlob(target) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;

  const { del, put } = require('@vercel/blob');
  const existing = await listConfigBlobs();
  await Promise.all(existing.map((blob) => del(blob.url).catch(() => null)));

  await put(BLOB_PATH, JSON.stringify({ test: target, updatedAt: new Date().toISOString() }), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
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
  const persisted = await writeToBlob(target);
  if (!persisted) {
    throw new Error('配置未能持久化，请检查 Vercel Blob 是否已绑定到项目');
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const verified = await readFromBlob();
    if (verified === target) {
      return target;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  memoryTarget = target;
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
