// api/index.js

// Функция fetch с таймаутом
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Fetch timeout for " + url)), timeout)
    ),
  ]);
}

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("id");

    if (!userId) {
      return new Response(JSON.stringify({ error: "No ID provided" }), { status: 400 });
    }

    const ACTIVE_SOURCE = "https://raw.githubusercontent.com/coolguyy76-lab/subnewww/main/combined.json";
    const BLOCKED_SOURCE = "https://raw.githubusercontent.com/coolguyy76-lab/gopuy/main/pay.json";
    const USERS_URL = "https://raw.githubusercontent.com/coolguyy76-lab/users/main/users.json";

    console.log("Fetching USERS_URL...");
    const usersRes = await fetchWithTimeout(USERS_URL);
    if (!usersRes.ok) throw new Error("Failed to fetch users JSON");
    const users = await usersRes.json();
    console.log("Fetched USERS_URL successfully");

    const user = users[userId];
    const source = user && user.status === "active" ? ACTIVE_SOURCE : BLOCKED_SOURCE;

    console.log("Fetching source JSON:", source);
    const dataRes = await fetchWithTimeout(source);
    if (!dataRes.ok) throw new Error("Failed to fetch source JSON");
    const text = await dataRes.text();
    console.log("Fetched source JSON successfully");

    return new Response(text, {
      headers: {
        "content-type": "application/json",
        "profile-update-interval": "1",
        "profile-title": "lex",
        "subscription-auto-update-open-enable": "1",
        "subscriptions-collapse": "0",
        "subscriptions-expand-now": "1",
      },
    });
  } catch (e) {
    console.error("Handler error:", e);
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500 });
  }
}
