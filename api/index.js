// api/index.js
import { randomUUID } from 'crypto'; // В Node.js это стандартно есть

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

    // Парсим JSON и модифицируем безопасно
    let config;
    try {
      config = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON from source' });
    }

    // 1. Уникальный UUID для каждого пользователя
    if (config.proxies && Array.isArray(config.proxies)) {
      config.proxies.forEach(p => {
        if (p.uuid) p.uuid = randomUUID();
      });
    }

    // 2. Уникальный ремарк
    const remarkPrefix = user.remark || '🎮 Игровой';
    if (config.remarks) {
      config.remarks = `${remarkPrefix} - ${id}`;
    }

    // 3. Разнообразие портов (если есть в proxies)
    const ports = [7890, 7891, 7892, 7893];
    if (config.proxies && Array.isArray(config.proxies)) {
      config.proxies.forEach(p => {
        if (p.port) p.port = ports[Math.floor(Math.random() * ports.length)];
      });
    }

    // Валидация перед отправкой
    try {
      JSON.stringify(config); // Проверка на валидность
    } catch (e) {
      throw new Error('Modified config is invalid');
    }

    res.setHeader('content-type', 'application/json');
    res.setHeader('profile-update-interval', '1');
    res.setHeader('profile-title', 'lex-modernized');
    res.setHeader('subscriptions-collapse', '0');
    res.setHeader('subscriptions-expand-now', '1');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Отправка валидного JSON
    res.send(JSON.stringify(config));

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err.toString() });
  }
}
