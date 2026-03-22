export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("id");

    if (!userId) {
      return new Response("No ID", { status: 400 });
    }

    const ACTIVE_SOURCE = "https://raw.githubusercontent.com/coolguyy76-lab/subnewww/main/combined.json";
    const BLOCKED_SOURCE = "https://raw.githubusercontent.com/coolguyy76-lab/gopuy/main/pay.json";
    const USERS_URL = "https://raw.githubusercontent.com/coolguyy76-lab/users/main/users.json";

    const usersRes = await fetch(USERS_URL);
    const users = await usersRes.json();

    const user = users[userId];

    const source =
      user && user.status === "active"
        ? ACTIVE_SOURCE
        : BLOCKED_SOURCE;

    const dataRes = await fetch(source);
    const text = await dataRes.text();

    return new Response(text, {
      headers: {
        "content-type": "application/json",
        "profile-update-interval": "1",
        "profile-title": "lex",
        "subscription-auto-update-open-enable": "1",
        "subscriptions-collapse": "0",
        "subscriptions-expand-now": "1"
      }
    });

  } catch (e) {
    return new Response("error: " + e.toString(), { status: 500 });
  }
}
