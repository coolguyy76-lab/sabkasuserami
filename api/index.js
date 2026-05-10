// api/index.js (ES module)
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Преобразование даты из формата "dd.mm.yyyy" в UNIX timestamp (UTC)
function parseExpireDate(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const parts = value.split('.');
  if (parts.length !== 3) return 0;
  const [day, month, year] = parts.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  if (isNaN(date.getTime())) return 0;
  return Math.floor(date.getTime() / 1000);
}

// Общие заголовки для ответа
function setCommonHeaders(res) {
  res.setHeader('content-type', 'application/json');
  res.setHeader('profile-update-interval', '1');
  res.setHeader('profile-title', 'lex');
  res.setHeader('subscription-auto-update-open-enable', '1');
  res.setHeader('subscriptions-collapse', '0');
  res.setHeader('subscriptions-expand-now', '1');
  res.setHeader('Access-Control-Allow-Origin', '*');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'No ID provided' });
    }

    // ---- URL-адреса ваших файлов на GitHub (при необходимости замените) ----
    const ACTIVE_SOURCE = 'https://raw.githubusercontent.com/coolguyy76-lab/subnewww/main/combined.json';
    const BLOCKED_SOURCE = 'https://raw.githubusercontent.com/coolguyy76-lab/gopuy/main/pay.json';
    const USERS_URL = 'https://raw.githubusercontent.com/coolguyy76-lab/users/main/users.json';
    const EXTRA_SOURCE = 'https://raw.githubusercontent.com/coolguyy76-lab/subnewww/main/extra_servers.json';
    // ------------------------------------------------------------------------

    // 1. Загружаем пользователей
    let users = {};
    try {
      const usersRes = await fetchWithTimeout(USERS_URL);
      if (usersRes.ok) users = await usersRes.json();
      else console.warn(`Users URL status: ${usersRes.status}`);
    } catch (err) {
      console.error('Failed to fetch users.json:', err.message);
    }

    const user = users[id];
    const now = Math.floor(Date.now() / 1000);

    // 2. Проверка статуса или отсутствия пользователя
    if (!user || user.status !== 'active') {
      const blockedRes = await fetchWithTimeout(BLOCKED_SOURCE);
      if (!blockedRes.ok) throw new Error(`Blocked source error: ${blockedRes.status}`);
      const text = await blockedRes.text();
      setCommonHeaders(res);
      return res.send(text);
    }

    // 3. Проверка срока действия (поддержка числа или строки "dd.mm.yyyy")
    const expireTimestamp = parseExpireDate(user.expire);
    if (expireTimestamp && expireTimestamp < now) {
      const blockedRes = await fetchWithTimeout(BLOCKED_SOURCE);
      if (!blockedRes.ok) throw new Error(`Blocked source error: ${blockedRes.status}`);
      const text = await blockedRes.text();
      setCommonHeaders(res);
      res.setHeader('subscription-userinfo', 'upload=0; download=0; total=0; expire=0');
      return res.send(text);
    }

    // 4. Загружаем основной список серверов
    const mainRes = await fetchWithTimeout(ACTIVE_SOURCE);
    if (!mainRes.ok) throw new Error(`Active source error: ${mainRes.status}`);
    let servers = await mainRes.json();

    // 5. Если нужны дополнительные серверы – добавляем их
    if (user.extra === true) {
      try {
        const extraRes = await fetchWithTimeout(EXTRA_SOURCE);
        if (extraRes.ok) {
          const extraServers = await extraRes.json();
          if (Array.isArray(extraServers)) {
            servers = servers.concat(extraServers);
          }
        } else {
          console.warn(`Extra servers not available: ${extraRes.status}`);
        }
      } catch (err) {
        console.error('Extra fetch error:', err.message);
      }
    }

    // 6. Устанавливаем заголовки
    setCommonHeaders(res);
    const expireForHeader = expireTimestamp || 0;
    res.setHeader('subscription-userinfo', `upload=0; download=0; total=0; expire=${expireForHeader}`);

    // 7. Отдаём результат
    res.json(servers);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err.toString() });
  }
}
