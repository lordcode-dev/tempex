import crypto from "crypto";
import fetch from "node-fetch";

const API = "https://api.mail.tm";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.detail || data.message || `Mail.tm request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function getDomains() {
  const data = await request("/domains");
  const domains = data["hydra:member"] || [];

  if (!domains.length) {
    throw new Error("No Mail.tm domains available right now");
  }

  return domains.map(item => item.domain).filter(Boolean);
}

export async function createAccount(address, password) {
  await request("/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password })
  });
}

export async function login(address, password) {
  const data = await request("/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password })
  });

  if (!data.token) {
    throw new Error("Unable to get Mail.tm token");
  }

  return data.token;
}

export async function getMessages(token) {
  return request("/messages", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getMessage(token, messageId) {
  return request(`/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function deleteMessage(token, messageId) {
  return request(`/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createMailboxViaMailTm(maxAttempts = 5) {
  const domains = await getDomains();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const domain = domains[(attempt - 1) % domains.length];
    const local = crypto.randomBytes(5).toString("hex");
    const address = `${local}@${domain}`;
    const password = crypto.randomBytes(8).toString("hex");

    try {
      await createAccount(address, password);
      const token = await login(address, password);
      return { email: address, token, provider: "mail.tm" };
      return { email: address, password, token, provider: "mail.tm" };
    } catch (error) {
      const isConflict = error.status === 422 || /used|exists|taken/i.test(error.message || "");
      if (!isConflict || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Failed to create mailbox on Mail.tm");
}
