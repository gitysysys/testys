const currentTargetEl = document.getElementById('current-target');
const storageModeEl = document.getElementById('storage-mode');
const logEl = document.getElementById('log');
const targetInput = document.getElementById('target-input');
const passwordInput = document.getElementById('password-input');

function log(message, data) {
  logEl.textContent = data ? `${message}\n${JSON.stringify(data, null, 2)}` : message;
}

async function loadStatus() {
  const response = await fetch('/api/admin-config', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '加载失败');

  currentTargetEl.textContent = data.test;
  targetInput.value = data.test;
  storageModeEl.textContent = `存储方式：${data.storage === 'vercel-blob' ? 'Vercel Blob（持久化）' : '内存（冷启动会重置）'}`;
  log('当前配置', data);
}

async function saveTarget() {
  const response = await fetch('/api/admin-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      test: targetInput.value.trim(),
      password: passwordInput.value,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '保存失败');

  currentTargetEl.textContent = data.test;
  log('保存成功', data);
}

document.getElementById('refresh-btn').addEventListener('click', () => {
  loadStatus().catch((error) => log('错误：' + error.message));
});

document.getElementById('save-btn').addEventListener('click', () => {
  saveTarget().catch((error) => log('错误：' + error.message));
});

loadStatus().catch((error) => log('错误：' + error.message));
