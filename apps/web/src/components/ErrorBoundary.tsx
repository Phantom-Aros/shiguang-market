import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@shiguang/ui';
import { getAnalyticsSessionId } from '@shiguang/shared/analytics';
import { tokenStorage } from '@shiguang/api-client';
import { Sentry } from '../lib/monitoring';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

async function reportClientError(error: Error, componentStack?: string | null) {
  const payload = {
    message: error.message,
    stack: error.stack,
    componentStack: componentStack ?? undefined,
    pageUrl: window.location.href,
    sessionId: getAnalyticsSessionId(),
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const accessToken = tokenStorage.getAccess();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    await fetch('/api/metrics/errors', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // 上报失败时静默，避免二次错误
  }
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    void reportClientError(error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.wrap}>
          <h1 className={styles.title}>页面出了点问题</h1>
          <p className={styles.desc}>我们已记录错误信息，请刷新后重试。</p>
          <Button variant="primary" onClick={this.handleReload}>
            刷新页面
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
