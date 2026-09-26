let intervalId = null;

self.onmessage = function (e) {
  const { command, interval } = e.data;

  if (command === 'start' && intervalId === null) {
    if (!Number.isFinite(interval) || interval <= 0) {
      return;
    }

    intervalId = setInterval(() => {
      self.postMessage({ type: 'tick', timestamp: Date.now() });
    }, interval);
  } else if (command === 'stop') {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    intervalId = null;
  }
};
