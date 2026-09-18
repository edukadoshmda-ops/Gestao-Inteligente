import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register PWA service worker with auto-refresh on new deployments
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  },
  onRegisteredSW(_swUrl: string, r?: ServiceWorkerRegistration) {
    if (r) {
      r.update();
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
