const ACTIVE_SOURCE = "https://raw.githubusercontent.com/coolguyy76-lab/subnewww/refs/heads/main/combined.json";

const BLOCKED_SOURCE = "https://raw.githubusercontent.com/coolguyy76-lab/gopuy/refs/heads/main/pay.json";

const USERS_URL = "https://raw.githubusercontent.com/coolguyy76-lab/users/refs/heads/main/users.json";

// кэш чтобы не долбить GitHub
let cache = {
  data: null,
  time: 0
};

const CACHE_TIME = 10000; // 10 секунд

const CUSTOM_HEADERS = {
  "content-type": "application/json",
  "profile-update-interval": "1",
  "profile-title": "lex",
  "subscription-auto-update-open-enable": "1",
  "subscriptions-collapse": "0",
  "subscriptions-expand-now": "1"
};

export default async function handler(req, res) {
  try {
    const { searchParams } = new URL(req.url, "http://localhost");
    const userId = searchParams.get("id");

    if (!userId) {
      return new Response("No ID", { status: 400 });
    }

    // обновляем users.json если кэш устарел
    if (!cache.data || Date.now() - cache.time > CACHE_TIME) {
      const r = await fetch(USERS_URL);
      cache.data = await r.json();
      cache.time = Date.now();
    }

    const user = cache.data[userId];

    const source =
      user && user.status === "active"
        ? ACTIVE_SOURCE
        : BLOCKED_SOURCE;

    const response = await fetch(source);
    const text = await response.text();

    return new Response(text, {
      headers: CUSTOM_HEADERS
    });

  } catch (e) {
    return new Response("error", { status: 500 });
  }
}
