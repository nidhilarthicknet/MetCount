/* MetConnect background notifications. Hosted at /Mettin/service-worker.js. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? event.data.json() : {};
    } catch {
      payload = { title: "MetConnect", body: event.data?.text() || "You have a new notification." };
    }

    // Clear the matching system notification as soon as a call is answered, declined or ended.
    if (payload.kind === "call_update") {
      const existing = await self.registration.getNotifications({ tag: payload.tag });
      for (const notification of existing) notification.close();
      return;
    }

    // A ringing call expires quickly; never show a delayed call as if it were still live.
    if (payload.kind === "call" && payload.expiresAt && Date.now() > Number(payload.expiresAt)) {
      return;
    }

    const icon = new URL("metconnect-icon.svg", self.registration.scope).href;
    const options = {
      body: payload.body || "You have a new MetConnect notification.",
      icon,
      badge: icon,
      tag: payload.tag || "metconnect-notification",
      renotify: true,
      silent: false,
      vibrate: payload.kind === "call"
        ? [250, 100, 250, 100, 450, 120, 250]
        : [180, 80, 180],
      requireInteraction: payload.kind === "call",
      timestamp: Number(payload.timestamp) || Date.now(),
      data: {
        url: payload.url || new URL("metconnect.html?openApp=metconnect", self.registration.scope).href,
        kind: payload.kind || "message",
        recordId: payload.recordId || null
      }
    };

    if (payload.kind === "call") {
      options.actions = [
        { action: "open", title: "Open MetConnect" },
        { action: "dismiss", title: "Dismiss" }
      ];
    }

    await self.registration.showNotification(payload.title || "MetConnect", options);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const target = new URL(
    event.notification.data?.url || "?openApp=metconnect",
    self.registration.scope
  ).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope) && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
