// api/index.js (ES module)
import { randomUUID } from 'crypto';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'No ID provided' });
    }

    // Источники с балансом нагрузки
    const SOURCES = [
      'https://raw.githubusercontent.com/coolguyy76-lab/subnewww/main/combined.json',
      'https://raw.githubusercontent.com/coolguyy76-lab/gopuy/main/pay.json'
    ];

    // Загрузка пользователей
    const USERS_URL = 'https://raw.githubusercontent.com/coolguyy76-lab/users/main/users.json';
    let users = {};
    try {
      const usersRes = await fetchWithTimeout(USERS_URL);
      if (usersRes.ok) users = await usersRes.json();
    } catch (err) {
      console.error('Failed to fetch users:', err.message);
    }

    const user = users[id];
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'User not found or inactive' });
    }

    // Выбор источника с ротацией
    let source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
    
    const dataRes = await fetchWithTimeout(source);
    if (!dataRes.ok) throw new Error(`Source fetch failed: ${dataRes.status}`);

    const text = await dataRes.text();

    // Модернизация конфига для уникальности
    let modifiedText = text;
    
    // Добавляем уникальный UUID и ремарк (если есть в конфиге)
    if (text.includes('"uuid"')) {
      const uuidMatch = text.match(/"uuid":\s*"([^"]+)"/);
      if (uuidMatch) {
        modifiedText = modifiedText.replace(
          `"uuid": "${uuidMatch[1]}"`,
          `"uuid": "${randomUUID()}"`
        );
      }
    }

    // Добавляем уникальный ремарк для каждого пользователя
    const remarkPrefix = user.remark || '🎮 Игровой';
    modifiedText = modifiedText.replace(
      /"remarks":\s*"[^"]+"/,
      `"remarks": "${remarkPrefix} - ${id}"`
    );

    // Разнообразие портов для разных пользователей
    const ports = [7890, 7891, 7892, 7893];
    modifiedText = modifiedText.replace(
      /"port":\s*\d+/g,
      `"port": ${ports[Math.floor(Math.random() * ports.length)]}`
    );

    res.setHeader('content-type', 'application/json');
    res.setHeader('profile-update-interval', '1');
    res.setHeader('profile-title', 'lex');
    res.setHeader('subscriptions-collapse', '0');
    res.setHeader('subscriptions-expand-now', '1');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Rate Limiting header
    const now = Date.now();
    const lastRequest = req.headers['x-last-request'] || 0;
    if (now - lastRequest < 5000) {
      modifiedText = modifiedText.replace(/"port":\d+/g, `"port": ${ports[Math.floor(Math.random() * ports.length)]}`);
    }

    res.send(modifiedText);

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err.toString() });
  }
}
