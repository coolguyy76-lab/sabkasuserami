// api/index.js
export const config = { runtime: 'edge' };

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'No ID provided' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
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
        console.warn(`Users URL returned ${usersRes.status}, using empty object`);
      }
    } catch (err) {
      console.error('Failed to fetch users.json:', err);
    }

    const user = users[userId];
    const source = user && user.status === 'active' ? ACTIVE_SOURCE : BLOCKED_SOURCE;

    const dataRes = await fetchWithTimeout(source);
    if (!dataRes.ok) {
      throw new Error(`Source fetch failed: ${dataRes.status}`);
    }
    const text = await dataRes.text();

    return new Response(text, {
      headers: {
        'content-type': 'application/json',
        'profile-update-interval': '1',
        'profile-title': 'lex',
        'subscription-auto-update-open-enable': '1',
        'subscriptions-collapse': '0',
        'subscriptions-expand-now': '1',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    console.error('Handler error:', e);
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
