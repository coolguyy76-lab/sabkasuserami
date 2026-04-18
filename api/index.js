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

    const ACTIVE_SOURCE = 'https://raw.githubusercontent.com/coolguyy76-lab/subnewww/main/combined.json';
    const BLOCKED_SOURCE = 'https://raw.githubusercontent.com/coolguyy76-lab/gopuy/main/pay.json';
    const USERS_URL = 'https://raw.githubusercontent.com/coolguyy76-lab/users/main/users.json';

    let users = {};

    try {
      const usersRes = await fetchWithTimeout(USERS_URL);
      if (usersRes.ok) {
        users = await usersRes.json();
      }
    } catch (err) {
      console.error('Users fetch error:', err.message);
    }

    const user = users[id];
    const source = user && user.status === 'active' ? ACTIVE_SOURCE : BLOCKED_SOURCE;

    const dataRes = await fetchWithTimeout(source);
    if (!dataRes.ok) {
      throw new Error(`Source fetch failed: ${dataRes.status}`);
    }

    const text = await dataRes.text();

    let config;
    try {
      config = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON', details: e.message });
    }

    const uniqueId = `${id}_${Date.now()}`;

    function modifyConfig(obj) {
      if (!obj || typeof obj !== 'object') return;

      // --- OUTBOUNDS ---
      if (Array.isArray(obj.outbounds)) {
        obj.outbounds.forEach(outbound => {
          const protocol = outbound.protocol?.toLowerCase();

          if (['vless', 'vmess', 'trojan'].includes(protocol)) {
            if (Array.isArray(outbound.settings?.vnext)) {
              outbound.settings.vnext.forEach(group => {
                if (Array.isArray(group.users)) {
                  group.users.forEach(user => {
                    // ✅ Генерируем новый UUID (валидный)
                    if (user.id) {
                      user.id = randomUUID();
                    }

                    if (user.password) {
                      user.password =
                        Math.random().toString(36).slice(2) +
                        Math.random().toString(36).slice(2);
                    }
                  });
                }
              });
            }
          }
        });
      }

      // --- INBOUNDS ---
      if (Array.isArray(obj.inbounds)) {
        obj.inbounds.forEach(inbound => {
          const protocol = inbound.protocol?.toLowerCase();

          if ((protocol === 'socks' || protocol === 'http') && inbound.settings) {
            if (inbound.settings.auth === 'password' && inbound.settings.password) {
              inbound.settings.password =
                inbound.settings.password + Math.random().toString(36).slice(2);
            }

            if (inbound.settings.auth === 'noauth') {
              inbound.tag = (inbound.tag || 'proxy') + '_' + uniqueId.slice(0, 6);
            }
          }
        });
      }

      // --- META / REMARKS ---
      if (!obj.remarks) {
        obj.remarks = `⚡ LTE #${Math.floor(Math.random() * 100)}_${uniqueId.slice(0, 4)}`;
      }

      if (!obj.meta) {
        obj.meta = {
          version: Date.now().toString(36),
          source,
          uid: uniqueId
        };
      }
    }

    // ✅ КЛЮЧЕВОЙ ФИКС: обработка массива
    if (Array.isArray(config)) {
      config.forEach(item => modifyConfig(item));
    } else {
      modifyConfig(config);
    }

    res.setHeader('content-type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('profile-update-interval', '1');
    res.setHeader('profile-title', 'test');
    res.setHeader('subscription-auto-update-open-enable', '1');

    res.send(JSON.stringify(config, null, 2));

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err.message });
  }
}
