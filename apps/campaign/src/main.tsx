import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shiguang/ui/tokens.css';
import App from './App';
import { initMonitoring } from './lib/monitoring';
import './index.css';

initMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
