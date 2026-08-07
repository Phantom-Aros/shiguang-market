import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@shiguang/ui';
import { Sentry } from '../lib/monitoring';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.wrap}>
          <h1 className={styles.title}>页面出了点问题</h1>
          <p className={styles.desc}>请刷新后重试。</p>
          <Button variant="primary" onClick={this.handleReload}>
            刷新页面
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
