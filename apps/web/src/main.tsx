import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shiguang/ui/tokens.css';
import App from './App';
import { initMonitoring } from './lib/monitoring';
import { initWebVitals } from './lib/vitals';
import './index.css';

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

initMonitoring();
initWebVitals();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
