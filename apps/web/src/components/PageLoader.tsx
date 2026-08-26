import styles from './PageLoader.module.css';

export function PageLoader() {
  return (
    <div className={styles.wrap} role="status" aria-label="加载中">
      <div className={styles.spinner} />
    </div>
  );
}
