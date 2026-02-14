/* GYEOL Service Worker — 푸시 알림 수신 */
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'GYEOL';
  const body = data.body ?? '새 메시지가 있어요.';
  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag ?? 'gyeol-push',
    data: { url: data.url ?? '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length) list[0].focus();
      else if (clients.openWindow) clients.openWindow(url);
    })
  );
});
