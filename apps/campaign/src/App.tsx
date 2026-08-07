import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, ToastProvider } from '@shiguang/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CampaignPage } from './pages/CampaignPage';
import { BuilderPage } from './pages/BuilderPage';
import { queryClient } from './lib/queryClient';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <ToastProvider>
              <Routes>
                <Route path="/builder" element={<BuilderPage />} />
                <Route path="/:slug" element={<CampaignPage />} />
              </Routes>
            </ToastProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
