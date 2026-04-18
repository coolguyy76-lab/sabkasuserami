// api/index.js (ES module) - Версия 2.0
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

    // --- 1. Определяем источник конфига (как у тебя было) ---
    const ACTIVE_SOURCE = 'https://raw.githubusercontent.com/coolguyy76-lab/subnewww/main/combined.json';
    const BLOCKED_SOURCE = 'https://raw.githubusercontent.com/coolguyy76-lab/gopuy/main/pay.json';

    // Проверяем статус пользователя (если нужно, иначе берем активный)
    const USERS_URL = 'https://raw.githubusercontent.com/coolguyy76-lab/users/main/users.json';
    let users = {};
    
    try {
      const usersRes = await fetchWithTimeout(USERS_URL);
      if (usersRes.ok) {
        users = await usersRes.json();
      } else {
        console.warn('Failed to fetch users.json:', usersRes.status, usersRes.statusText);
      }
    } catch (err) {
      // ✅ Исправлено: теперь err доступен внутри catch
      console.error('Failed to fetch users.json:', err.message);
    }

    const user = users[id];
    const source = user && user.status === 'active' ? ACTIVE_SOURCE : BLOCKED_SOURCE;

    // --- 2. Получаем и парсим основной конфиг ---
    let dataRes = await fetchWithTimeout(source);
    if (!dataRes.ok) {
      throw new Error(`Source fetch failed: ${dataRes.status} ${dataRes.statusText}`);
    }
    
    const text = await dataRes.text();
    let config;

    try {
      // ✅ Исправлено: проверка на валидный JSON
      config = JSON.parse(text); 
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON in source', details: e.message });
    }

    // --- 3. УНИКАЛИЗАЦИЯ КОНФИГА (Безопасная версия) ---
    
    // Генерируем уникальный ID для этого друга на основе запроса + времени
    const uniqueId = `${id}_${Date.now()}`; 

    // Функция рекурсивного поиска и замены UUID в VLESS/VMess/Trojan пользователях
    function modifyUserIds(obj) {
      if (!obj || typeof obj !== 'object') return;
      
      // Проверяем массив outbounds
      if (Array.isArray(obj.outbounds)) {
        obj.outbounds.forEach(outbound => {
          const protocol = outbound.protocol?.toLowerCase();
          
          // VLESS, VMess, Trojan часто используют id в users
          if (['vless', 'vmess', 'trojan'].includes(protocol) && outbound.settings?.vnext) {
            outbound.settings.vnext.forEach(group => {
              // ✅ Исправлено: проверка на массив users
              if (Array.isArray(group.users)) {
                group.users.forEach(user => {
                  if (user.id) {
                    // Добавляем уникальный суффикс к существующему ID, чтобы сохранить формат UUID
                    user.id = `${user.id}_${uniqueId}`; 
                  }
                  if (user.password) {
                    // Опционально: меняем пароль для дополнительной уникальности
                    user.password = `${user.password}${Math.random().toString(36).substring(2)}`;
                  }
                });
              }
            });
          }

          // Иногда id может быть в settings напрямую (редко, но бывает)
          if (outbound.settings?.id) {
             outbound.settings.id = `${outbound.settings.id}_${uniqueId}`;
          }
        });
      }

      // Проверяем массив inbounds (для SOCKS/HTTP с аутентификацией)
      if (Array.isArray(obj.inbounds)) {
        obj.inbounds.forEach(inbound => {
          const protocol = inbound.protocol?.toLowerCase();
          
          // Если socks/http и есть auth, меняем пароль или добавляем уникальный хэш
          if ((protocol === 'socks' || protocol === 'http') && inbound.settings?.auth) {
            if (inbound.settings.auth === 'password' && inbound.settings.password) {
              inbound.settings.password = `${inbound.settings.password}${Math.random().toString(36).substring(2)}`;
            } else if (inbound.settings.auth === 'noauth') {
               // Можно оставить noauth, но иногда добавляют случайный хэш для уникальности сессии
               const originalTag = inbound.tag || 'socks';
               inbound.tag = `${originalTag}_${uniqueId.substring(0, 4)}`; 
            }
          }
        });
      }

      // Добавляем случайное поле remarks для разнообразия (не влияет на работу)
      if (!config.remarks) {
         config.remarks = `🇫🇮 LTE #${Math.floor(Math.random() * 100)}_${uniqueId.substring(0, 4)}`;
      }

      // Добавляем случайное поле meta для разнообразия (если нет)
      if (!config.meta) {
         config.meta = { 
           "version": `${Date.now().toString(36).substring(2)}`, 
           "source": source,
           "uniqueId": uniqueId
         };
      }
    }

    modifyUserIds(config);

    // --- 4. Возвращаем модифицированный JSON ---
    res.setHeader('content-type', 'application/json');
    res.setHeader('profile-update-interval', '1');
    res.setHeader('profile-title', 'lex');
    res.setHeader('subscription-auto-update-open-enable', '1');
    res.setHeader('subscriptions-collapse', '0');
    res.setHeader('subscriptions-expand-now', '1');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Возвращаем отформатированный JSON (красивый вывод)
    const jsonStr = JSON.stringify(config, null, 2); 
    res.send(jsonStr);

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err.toString() });
  }
}
