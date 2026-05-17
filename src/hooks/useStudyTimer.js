import { useState, useEffect } from 'react';

export default function useStudyTimer(initialSeconds = 14400) {
  const [totalStudySeconds, setTotalStudySeconds] = useState(initialSeconds);

  useEffect(() => {
    let interval = null;

    const startTimer = () => {
      interval = setInterval(() => {
        setTotalStudySeconds(prev => prev + 1);
      }, 1000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
      } else {
        startTimer();
      }
    };

    if (!document.hidden) {
      startTimer();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const formattedHours = (totalStudySeconds / 3600).toFixed(1);

  return { totalStudySeconds, formattedHours };
}
