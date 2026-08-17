export const sendSmartNotification = (title: string, body: string, iconUrl?: string) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: iconUrl || '/vite.svg',
        badge: '/vite.svg',
        vibrate: [200, 100, 200], // Padrão de vibração para chamar atenção
      } as any);
    } catch (e) {
      // Fallback para Service Workers em PWA mobile mais restritos
      navigator.serviceWorker?.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: iconUrl || '/vite.svg',
          vibrate: [200, 100, 200],
        } as any);
      });
    }
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: iconUrl || '/vite.svg',
          vibrate: [200, 100, 200]
        } as any);
      }
    });
  }
};
