import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, ToastProvider } from '@shiguang/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './lib/queryClient';

const BuilderPage = lazy(() =>
  import('./pages/BuilderPage').then((m) => ({ default: m.BuilderPage })),
);
const CampaignPage = lazy(() =>
  import('./pages/CampaignPage').then((m) => ({ default: m.CampaignPage })),
);

function PageFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
      加载中…
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <ToastProvider>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/builder" element={<BuilderPage />} />
                  <Route path="/:slug" element={<CampaignPage />} />
                </Routes>
              </Suspense>
            </ToastProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
