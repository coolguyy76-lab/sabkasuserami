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
      } else {
        console.warn(`Users URL returned ${usersRes.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch users.json:', err.message);
    }
    const user = users[id];
    const source = user && user.status === 'active' ? ACTIVE_SOURCE : BLOCKED_SOURCE;
    const dataRes = await fetchWithTimeout(source);
    if (!dataRes.ok) {
      throw new Error(`Source fetch failed: ${dataRes.status}`);
    }
    const text = await dataRes.text();
    res.setHeader('content-type', 'application/json');
    res.setHeader('profile-update-interval', '1');
    res.setHeader('profile-title', 'lex');
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
