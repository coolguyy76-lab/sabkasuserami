// api/index.js (ES module)

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  // ✅ Исправлено: callback передан первым аргументом
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

// ✅ Генерация случайного User-Agent
const randomUA = () => {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Mozilla/5.0 (X11; Linux x86_64)'
  ];
  return agents[Math.floor(Math.random() * agents.length)];
};

// ✅ Генерация случайного IP для маскировки
const randomIP = () => {
  const ip = `203.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.1`;
  return ip;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'No ID provided' });
    }

    // Загрузка пользователей
    let users = {};
    try {
      const usersRes = await fetchWithTimeout('https://raw.githubusercontent.com/coolguyy76-lab/users/main/users.json');
      if (usersRes.ok) users = await usersRes.json();
    } catch (err) { console.error('Failed to fetch users.json:', err.message); }

    const user = users[id];
    
    // Выбор источника
    const ACTIVE_SOURCE = 'https://raw.githubusercontent.com/coolguyy76-lab/subnewww/main/combined.json';
    const BLOCKED_SOURCE = 'https://raw.githubusercontent.com/coolguyy76-lab/gopuy/main/pay.json';
    let source = user && user.status === 'active' ? ACTIVE_SOURCE : BLOCKED_SOURCE;

    // ✅ Рандомизация заголовков перед запросом к провайдеру
    const headers = {
      'User-Agent': randomUA(),
      'X-Forwarded-For': randomIP(),
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate'
    };

    // ✅ Исправленная задержка (callback передан первым)
    await new Promise(resolve => setTimeout(() => {
        resolve(); 
    }, Math.random() * 500 + 100)); 

    const dataRes = await fetchWithTimeout(source, { headers });
    
    if (!dataRes.ok) throw new Error(`Source fetch failed: ${dataRes.status}`);

    const text = await dataRes.text();

    // Заголовки для клиента (Clash/ClashMeta)
    res.setHeader('content-type', 'application/json');
    res.setHeader('profile-update-interval', '1');
    res.setHeader('profile-title', 'tt');
    res.setHeader('subscription-auto-update-open-enable', '1');
    res.setHeader('subscriptions-collapse', '0');
    res.setHeader('subscriptions-expand-now', '1');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(text);

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err.toString() });
  }
}
