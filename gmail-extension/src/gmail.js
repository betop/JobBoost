async function gmailFetch(path, { method = "GET", token, body } = {}) {
  const url = `https://gmail.googleapis.com/gmail/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gmail API error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

function base64UrlToUtf8(data) {
  if (!data) return "";
  const normalized = String(data).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function extractTextFromPayload(payload) {
  const parts = [];

  const walk = (part) => {
    if (!part) return;
    const mime = String(part.mimeType || "").toLowerCase();
    const data = part.body?.data;

    if (data && (mime === "text/plain" || mime.startsWith("text/plain;"))) {
      parts.push(base64UrlToUtf8(data));
      return;
    }

    if (Array.isArray(part.parts)) {
      for (const p of part.parts) walk(p);
    }
  };

  walk(payload);

  if (parts.length > 0) return parts.join("\n");

  // Fallback to text/html if no text/plain was found.
  let html = "";
  const walkHtml = (part) => {
    if (!part) return;
    const mime = String(part.mimeType || "").toLowerCase();
    const data = part.body?.data;
    if (data && (mime === "text/html" || mime.startsWith("text/html;"))) {
      html += "\n" + base64UrlToUtf8(data);
    }
    if (Array.isArray(part.parts)) {
      for (const p of part.parts) walkHtml(p);
    }
  };
  walkHtml(payload);

  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listLabels({ token }) {
  const data = await gmailFetch("users/me/labels", { token });
  return data.labels || [];
}

export async function createLabel({ token, name }) {
  return gmailFetch("users/me/labels", {
    method: "POST",
    token,
    body: {
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show"
    }
  });
}

export async function ensureLabelId({ token, name }) {
  const labels = await listLabels({ token });
  const existing = labels.find((l) => (l.name || "").toLowerCase() === name.toLowerCase());
  if (existing?.id) return existing.id;
  const created = await createLabel({ token, name });
  if (!created?.id) throw new Error(`Failed to create label: ${name}`);
  return created.id;
}

export async function listUnreadMessageIds({ token, maxResults }) {
  return listMessageIds({ token, query: "is:unread", maxResults });
}

export async function listMessageIds({ token, query, maxResults }) {
  const q = query ? `q=${encodeURIComponent(query)}&` : "";
  const data = await gmailFetch(`users/me/messages?${q}maxResults=${maxResults}`, { token });
  return (data.messages || []).map((m) => m.id);
}

export async function listMessageIdsPaged({ token, query, maxResults }) {
  // Gmail API default page size is 100; max is 500.
  const cap = Number.isFinite(maxResults) ? Number(maxResults) : 0;
  const unlimited = !cap || cap <= 0;
  const pageSize = unlimited ? 500 : Math.min(500, Math.max(1, cap));

  const ids = [];
  let pageToken = undefined;

  while (true) {
    const q = query ? `q=${encodeURIComponent(query)}&` : "";
    const tokenPart = pageToken ? `pageToken=${encodeURIComponent(pageToken)}&` : "";
    console.log(`users/me/messages?${q}${tokenPart}maxResults=${pageSize}`)
    const data = await gmailFetch(
      `users/me/messages?${q}${tokenPart}maxResults=${pageSize}`,
      { token }
    );

    for (const m of data.messages || []) {
      ids.push(m.id);
      if (!unlimited && ids.length >= cap) return ids;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return ids;
}

export async function getMessageMetadata({ token, messageId }) {
  const data = await gmailFetch(
    `users/me/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
    { token }
  );

  const headers = Object.fromEntries(
    (data.payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value])
  );

  return {
    id: data.id,
    threadId: data.threadId,
    labelIds: data.labelIds || [],
    snippet: data.snippet || "",
    from: headers.from || "",
    subject: headers.subject || "",
    date: headers.date || ""
  };
}

export async function getMessageBodyText({ token, messageId }) {
  const data = await gmailFetch(
    `users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    { token }
  );

  return extractTextFromPayload(data.payload) || "";
}

export async function modifyMessageLabels({ token, messageId, addLabelIds = [], removeLabelIds = [] }) {
  return gmailFetch(`users/me/messages/${encodeURIComponent(messageId)}/modify`, {
    method: "POST",
    token,
    body: { addLabelIds, removeLabelIds }
  });
}

// Gmail batchModify supports up to 1000 message IDs per request.
export async function batchModifyMessages({ token, ids, addLabelIds = [], removeLabelIds = [] }) {
  const chunkSize = 1000;
  for (let i = 0; i < ids.length; i += chunkSize) {
    await gmailFetch("users/me/messages/batchModify", {
      method: "POST",
      token,
      body: {
        ids: ids.slice(i, i + chunkSize),
        addLabelIds,
        removeLabelIds
      }
    });
  }
}
