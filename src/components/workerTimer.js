let intervalId;

self.onmessage = function (e) {
  const { command, interval } = e.data;

  if (command === 'start' && !intervalId) {
    intervalId = setInterval(() => {
      self.postMessage('tick');
    }, interval);
  } else if (command === 'stop') {
    clearInterval(intervalId);
    intervalId = null;
  }
};
