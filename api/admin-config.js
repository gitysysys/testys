const { getTarget, setTarget, getDefaultTarget, corsHeaders } = require('./lib/target');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  corsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const test = await getTarget();
      res.status(200).json({
        test,
        defaultTarget: getDefaultTarget(),
        storage: process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'memory',
        purpose: 'security-teaching-demo-only',
        warning: '仅供网络安全教学演示，请勿用于真实攻击或非法用途。',
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const password = process.env.DEMO_ADMIN_PASSWORD || 'demo-teach';
      if (body.password !== password) {
        res.status(401).json({ error: '演示口令错误' });
        return;
      }

      const test = await setTarget(body.test);
      res.status(200).json({
        ok: true,
        test,
        message: '跳转目标已更新，GitHub 静态页下次 fetch 时将获取新地址。',
        purpose: 'security-teaching-demo-only',
      });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    res.status(400).json({ error: error.message || '请求失败' });
  }
};
