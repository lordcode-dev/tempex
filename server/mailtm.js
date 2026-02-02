import fetch from "node-fetch";
const API = "https://api.mail.tm";

export async function getDomain() {
  const r = await fetch(`${API}/domains`);
  const d = await r.json();
  return d["hydra:member"][0].domain;
}

export async function createAccount(address, password) {
  await fetch(`${API}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password })
  });
}

export async function login(address, password) {
  const r = await fetch(`${API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password })
  });
  return (await r.json()).token;
}

export async function getMessages(token) {
  const r = await fetch(`${API}/messages`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return await r.json();
}
