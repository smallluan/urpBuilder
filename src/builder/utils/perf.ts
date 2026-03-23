let modeLongTaskObserverInitialized = false;

export const initModeLongTaskObserver = () => {
  if (modeLongTaskObserverInitialized || typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return;
  }

  try {
    const observer = new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach((entry) => {
        if (entry.duration >= 50) {
          console.info(`[Perf][LongTask] ${Math.round(entry.duration)}ms`);
        }
      });
    });
    observer.observe({ entryTypes: ['longtask'] });
    modeLongTaskObserverInitialized = true;
  } catch {
    // longtask may be unavailable in some browsers
  }
};

export const markModeSwitchStart = (mode: 'component' | 'flow') => {
  if (typeof performance === 'undefined') {
    return;
  }
  performance.mark(`mode-switch-start-${mode}`);
};

export const markModeSwitchEnd = (mode: 'component' | 'flow') => {
  if (typeof performance === 'undefined') {
    return;
  }
  const startMark = `mode-switch-start-${mode}`;
  const endMark = `mode-switch-end-${mode}`;
  const measureName = `mode-switch-${mode}`;
  performance.mark(endMark);
  try {
    performance.measure(measureName, startMark, endMark);
    const entries = performance.getEntriesByName(measureName);
    const latest = entries[entries.length - 1];
    if (latest) {
      console.info(`[Perf][ModeSwitch] ${mode}: ${latest.duration.toFixed(1)}ms`);
    }
  } catch {
    // ignore missing mark errors
  } finally {
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
  }
};
