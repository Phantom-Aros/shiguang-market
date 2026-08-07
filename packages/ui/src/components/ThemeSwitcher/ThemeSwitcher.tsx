import { cn } from '../../utils/cn';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeMode } from '../../theme/constants';
import styles from './ThemeSwitcher.module.css';

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
];

export function ThemeSwitcher({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();

  return (
    <div className={cn(styles.group, className)} role="radiogroup" aria-label="主题模式">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={mode === option.value}
          className={cn(styles.option, mode === option.value && styles.active)}
          onClick={() => setMode(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
