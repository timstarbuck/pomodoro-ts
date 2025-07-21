import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper to simulate the worker environment
function createWorkerScope(workerScript: string) {
  const events: any[] = [];
  let intervalFn: any = null;
  let intervalMs: number = 0;
  let intervalActive = false;

  // Mock self object
  const self: any = {
    postMessage: vi.fn((msg) => events.push(msg)),
    onmessage: null,
  };

  // Patch setInterval/clearInterval for test
  global.setInterval = (fn: any, ms?: number, ...args: any[]): any => {
    intervalFn = fn;
    intervalMs = ms ?? 0;
    intervalActive = true;
    return {} as NodeJS.Timeout;
  };
  global.clearInterval = () => {
    intervalActive = false;
    intervalFn = null;
  };

  // Evaluate worker script in this context
  // eslint-disable-next-line no-eval
  eval(workerScript);

  return {
    self,
    events,
    triggerTick: () => {
      if (intervalActive && intervalFn) intervalFn();
    },
    stopInterval: () => {
      intervalActive = false;
    },
  };
}

describe('workerTimer.js', () => {
  let workerScope: any;
  let workerScript: string;

  beforeEach(() => {
    workerScript = require('fs').readFileSync(require('path').resolve(__dirname, 'workerTimer.js'), 'utf8');
    workerScope = createWorkerScope(workerScript);
    vi.clearAllMocks();
  });

  it('starts interval and posts tick', () => {
    // Simulate start message
    workerScope.self.onmessage({ data: { command: 'start', interval: 100 } });
    // Simulate interval tick
    workerScope.triggerTick();
    expect(workerScope.self.postMessage).toHaveBeenCalledWith('tick');
    expect(workerScope.events).toContain('tick');
  });

  it('stops interval on stop command', () => {
    workerScope.self.onmessage({ data: { command: 'start', interval: 100 } });
    workerScope.self.onmessage({ data: { command: 'stop' } });
    workerScope.triggerTick();
    // Should not post tick after stop
    expect(workerScope.self.postMessage).not.toHaveBeenCalledWith('tick');
  });

  it('does not start multiple intervals', () => {
    workerScope.self.onmessage({ data: { command: 'start', interval: 100 } });
    workerScope.self.onmessage({ data: { command: 'start', interval: 100 } });
    workerScope.triggerTick();
    expect(workerScope.self.postMessage).toHaveBeenCalledTimes(1);
  });
});
