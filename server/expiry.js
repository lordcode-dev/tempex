const sessions = new Map();

export function createSession(email, token, ttl) {
  const expiresAt = Date.now() + ttl * 1000;
  sessions.set(email, { token, expiresAt });
  setTimeout(() => sessions.delete(email), ttl * 1000);
  return expiresAt;
}

export function getSession(email) {
  const session = sessions.get(email);

  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(email);
    return null;
  }

  return session;
}
