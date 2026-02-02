const sessions = new Map();

export function createSession(email, token, ttl) {
  const expiresAt = Date.now() + ttl * 1000;
  sessions.set(email, { token, expiresAt });
  setTimeout(() => sessions.delete(email), ttl * 1000);
  return expiresAt;
}

export function getSession(email) {
  return sessions.get(email);
}
