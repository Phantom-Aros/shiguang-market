import { Text, View } from '@tarojs/components';
import { useEffect, useState } from 'react';
import './Countdown.scss';

function getRemaining(endTime: number) {
  const diff = Math.max(0, endTime - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    finished: diff === 0,
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export interface CountdownProps {
  endTime: number;
  className?: string;
}

export function Countdown({ endTime, className }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => getRemaining(endTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getRemaining(endTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  if (remaining.finished) {
    return <Text className={`campaign-countdown ${className ?? ''}`}>已结束</Text>;
  }

  return (
    <View className={`campaign-countdown ${className ?? ''}`}>
      {remaining.days > 0 && (
        <>
          <Text className="campaign-countdown__block">{remaining.days}</Text>
          <Text className="campaign-countdown__sep">天</Text>
        </>
      )}
      <Text className="campaign-countdown__block">{pad(remaining.hours)}</Text>
      <Text className="campaign-countdown__colon">:</Text>
      <Text className="campaign-countdown__block">{pad(remaining.minutes)}</Text>
      <Text className="campaign-countdown__colon">:</Text>
      <Text className="campaign-countdown__block">{pad(remaining.seconds)}</Text>
    </View>
  );
}
