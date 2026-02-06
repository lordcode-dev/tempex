const sessions = new Map();

function scheduleExpiry(email, ttl) {
  return setTimeout(() => {
    sessions.delete(email);
  }, ttl * 1000);
}

export function createSession(email, token, ttl) {
  const existing = sessions.get(email);
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }

  const expiresAt = Date.now() + ttl * 1000;
  const timeoutId = scheduleExpiry(email, ttl);
  sessions.set(email, { token, expiresAt, timeoutId });

  return expiresAt;
}

export function extendSession(email, ttl) {
  const session = sessions.get(email);
  if (!session) return null;

  return createSession(email, session.token, ttl);
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
