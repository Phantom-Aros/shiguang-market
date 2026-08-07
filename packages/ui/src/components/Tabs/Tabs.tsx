import { useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import styles from './Tabs.module.css';

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultActiveKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
  className?: string;
}

export function Tabs({ items, defaultActiveKey, activeKey, onChange, className }: TabsProps) {
  const [internalKey, setInternalKey] = useState(defaultActiveKey ?? items[0]?.key ?? '');
  const currentKey = activeKey ?? internalKey;
  const current = items.find((item) => item.key === currentKey) ?? items[0];

  const handleChange = (key: string) => {
    if (!activeKey) setInternalKey(key);
    onChange?.(key);
  };

  return (
    <div className={cn(styles.tabs, className)}>
      <div className={styles.tabList} role="tablist">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.key === currentKey}
            disabled={item.disabled}
            className={cn(styles.tab, item.key === currentKey && styles.active)}
            onClick={() => !item.disabled && handleChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.panel} role="tabpanel">
        {current?.content}
      </div>
    </div>
  );
}
