import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ApiError, api } from '@shiguang/api-client';
import { Button, useToast } from '@shiguang/ui';
import { useAuth } from '../contexts/AuthContext';
import styles from './Login.module.css';

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSendCode() {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的手机号');
      return;
    }

    setError('');
    try {
      const data = await api.auth.sendSms(phone);
      toast.success('验证码已发送');
      setCountdown(data.expiresIn > 60 ? 60 : data.expiresIn);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '发送失败';
      setError(message);
      toast.error(message);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(phone, code);
      toast.success('登录成功');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '登录失败';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2>手机号登录</h2>
      <p className={styles.hint}>开发环境验证码固定为 123456</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>手机号</span>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={11}
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>验证码</span>
          <div className={styles.codeRow}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 位验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={countdown > 0}
              onClick={handleSendCode}
            >
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </Button>
          </div>
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <Button type="submit" block size="lg" loading={submitting}>
          登录
        </Button>
      </form>
    </section>
  );
}
