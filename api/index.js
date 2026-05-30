const { getTarget, corsHeaders } = require('./lib/target');

module.exports = async (req, res) => {
  corsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const test = await getTarget();

  res.status(200).json({
    test,
    _meta: {
      source: 'vercel-dynamic-resolver',
      purpose: 'security-teaching-demo-only',
      timestamp: new Date().toISOString(),
    },
  });
};
