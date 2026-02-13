const state = {
  email: "",
  expiresAt: 0,
  messages: [],
  selectedMessageId: "",
  timer: null,
  poller: null
};

const el = {
  newAddress: document.querySelector("#new_address"),
  getMoreTime: document.querySelector("#get_more_time"),
  copyAddress: document.querySelector("#copy_address"),
  refreshInbox: document.querySelector("#refresh_inbox"),
  refreshSessionBtn: document.querySelector("#refresh-session-btn"),
  lifetimeSelect: document.querySelector("#lifetime_select"),
  mailAddress: document.querySelector("#mail_address"),
  countdown: document.querySelector("#countdown"),
  status: document.querySelector("#mailbox_status"),
  inboxCount: document.querySelector("#inbox_count_number"),
  inboxEmpty: document.querySelector("#inbox-empty-state"),
  inboxContent: document.querySelector("#mail_messages_content"),
  timerWarning: document.querySelector("#timer-warning"),
  sessionOverlay: document.querySelector("#session-expired-overlay"),
  viewerEmpty: document.querySelector("#viewer_empty"),
  viewerContent: document.querySelector("#viewer_content"),
  msgSubject: document.querySelector("#message_subject"),
  msgFrom: document.querySelector("#message_from"),
  msgTo: document.querySelector("#message_to"),
  msgDate: document.querySelector("#message_date"),
  msgText: document.querySelector("#message_text"),
  msgHtml: document.querySelector("#message_html"),
  deleteBtn: document.querySelector("#delete_message"),
  sr: document.querySelector("#sr-announcements")
};

function announce(message) {
  el.sr.textContent = message;
}

function setStatus(text, active = false) {
  el.status.textContent = text;
  el.status.classList.toggle("active", active);
  el.status.classList.toggle("idle", !active);
}

function handleError(error) {
  announce(error.message || "Unexpected error");
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function updateCountdownDisplay() {
  const remaining = Math.max(0, Math.floor((state.expiresAt - Date.now()) / 1000));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  el.countdown.textContent = `${mm}:${ss}`;
  el.timerWarning.classList.toggle("hidden", remaining === 0 || remaining >= 60);

  if (remaining === 0 && state.email) {
    showExpired();
  }
}

function startCountdown() {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(updateCountdownDisplay, 1000);
  updateCountdownDisplay();
}

function clearMessageViewer() {
  state.selectedMessageId = "";
  el.viewerEmpty.classList.remove("hidden");
  el.viewerContent.classList.add("hidden");
  el.msgHtml.srcdoc = "";
  el.deleteBtn.disabled = true;
}

function renderInbox() {
  el.inboxCount.textContent = `${state.messages.length} messages`;
  el.inboxEmpty.classList.toggle("hidden", state.messages.length > 0);
  el.inboxContent.innerHTML = "";

  state.messages.forEach((message) => {
    const item = document.createElement("div");
    item.className = `message-item ${message.id === state.selectedMessageId ? "active" : ""}`;
    item.innerHTML = `
      <h4>${message.subject || "(No subject)"}</h4>
      <p>${message.from?.address || "Unknown sender"}</p>
      <p>${new Date(message.createdAt).toLocaleString()}</p>
    `;
    item.addEventListener("click", () => openMessage(message.id).catch(handleError));
    el.inboxContent.appendChild(item);
  });
}

function showExpired() {
  state.email = "";
  state.messages = [];
  if (state.poller) clearInterval(state.poller);
  setStatus("Expired", false);
  el.mailAddress.value = "";
  renderInbox();
  clearMessageViewer();
  el.sessionOverlay.classList.remove("hidden");
}

function hideExpired() {
  el.sessionOverlay.classList.add("hidden");
}

async function createMailbox() {
  const expiry = Number(el.lifetimeSelect.value);
  const data = await fetchJson("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiry })
  });

  state.email = data.email;
  state.expiresAt = data.expiresAt;
  state.messages = [];
  state.selectedMessageId = "";

  el.mailAddress.value = state.email;
  setStatus("Active", true);
  hideExpired();
  renderInbox();
  clearMessageViewer();
  startCountdown();

  if (state.poller) clearInterval(state.poller);
  state.poller = setInterval(() => refreshInbox().catch(handleError), 4000);

  await refreshInbox();
  announce("New mailbox generated");
}

async function extendMailbox() {
  if (!state.email) return;

  const expiry = Number(el.lifetimeSelect.value);
  const data = await fetchJson(`/api/email/${encodeURIComponent(state.email)}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiry })
  });

  state.expiresAt = data.expiresAt;
  updateCountdownDisplay();
  announce("Mailbox extended");
}

async function refreshInbox() {
  if (!state.email) return;
  state.messages = await fetchJson(`/api/inbox/${encodeURIComponent(state.email)}`);
  if (state.selectedMessageId && !state.messages.some((m) => m.id === state.selectedMessageId)) {
    clearMessageViewer();
  }
  renderInbox();
}

async function openMessage(messageId) {
  if (!state.email) return;
  const message = await fetchJson(`/api/inbox/${encodeURIComponent(state.email)}/${encodeURIComponent(messageId)}`);
  state.selectedMessageId = messageId;

  el.msgSubject.textContent = message.subject || "(No subject)";
  el.msgFrom.textContent = `From: ${message.from?.address || "Unknown"}`;
  el.msgTo.textContent = `To: ${(message.to || []).map((entry) => entry.address).join(", ") || state.email}`;
  el.msgDate.textContent = `Received: ${new Date(message.createdAt).toLocaleString()}`;
  el.msgText.textContent = message.text || "No plain text content available.";
  el.msgHtml.srcdoc = message.html?.[0] || "<p style='padding:12px'>No HTML content available.</p>";

  el.viewerEmpty.classList.add("hidden");
  el.viewerContent.classList.remove("hidden");
  el.deleteBtn.disabled = false;
  renderInbox();
}

async function deleteMessage() {
  if (!state.email || !state.selectedMessageId) return;
  await fetchJson(`/api/inbox/${encodeURIComponent(state.email)}/${encodeURIComponent(state.selectedMessageId)}`, {
    method: "DELETE"
  });

  clearMessageViewer();
  await refreshInbox();
  announce("Message deleted");
}

async function copyAddress() {
  if (!state.email) return;
  await navigator.clipboard.writeText(state.email);
  announce("Copied email address");
}

el.newAddress.addEventListener("click", () => createMailbox().catch(handleError));
el.getMoreTime.addEventListener("click", () => extendMailbox().catch(handleError));
el.copyAddress.addEventListener("click", () => copyAddress().catch(handleError));
el.refreshInbox.addEventListener("click", () => refreshInbox().catch(handleError));
el.deleteBtn.addEventListener("click", () => deleteMessage().catch(handleError));
el.refreshSessionBtn.addEventListener("click", () => createMailbox().catch(handleError));

setStatus("Idle", false);
clearMessageViewer();
renderInbox();
startCountdown();
