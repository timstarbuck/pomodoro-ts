'use client';

import React, { useEffect, useRef } from 'react';
import { playSound } from 'react-sounds';

interface TimerProps {
  focusLength?: number;
  shortBreakLength?: number;
  longBreakLength?: number;
  focusSessions?: number;
}

export enum SessionState {
  Focus = 'Focus',
  ShortBreak = 'Short Break',
  LongBreak = 'Long Break',
}

enum TimerState {
  Stopped = 'stopped',
  Running = 'running',
  Paused = 'paused',
}

const FOCUS_COMPLETE_SOUND = 'ui/success_chime';
const SHORT_BREAK_COMPLETE_SOUND = 'ui/success_bling';

const DEFAULT_FOCUS_SESSIONS = 4; // Number of focus sessions before a long break
const DEFAULT_FOCUS_LENGTH = 25 * 60; // 25 minutes in seconds
const DEFAULT_SHORT_BREAK_LENGTH = 5 * 60; // 5 minutes in seconds
const DEFAULT_LONG_BREAK_LENGTH = 20 * 60; // 20 minutes in seconds
const TICK_INTERVAL = 1000;

const normalizeDuration = (duration: number, fallback: number) =>
  Number.isFinite(duration) && duration >= 0 ? duration : fallback;

const normalizeFocusSessions = (sessions: number) =>
  Number.isFinite(sessions) && sessions > 0 ? Math.floor(sessions) : DEFAULT_FOCUS_SESSIONS;

const Timer = ({
  focusLength = DEFAULT_FOCUS_LENGTH,
  shortBreakLength = DEFAULT_SHORT_BREAK_LENGTH,
  longBreakLength = DEFAULT_LONG_BREAK_LENGTH,
  focusSessions = DEFAULT_FOCUS_SESSIONS,
}: TimerProps) => {
  const configuredFocusLength = normalizeDuration(focusLength, DEFAULT_FOCUS_LENGTH);
  const configuredShortBreakLength = normalizeDuration(shortBreakLength, DEFAULT_SHORT_BREAK_LENGTH);
  const configuredLongBreakLength = normalizeDuration(longBreakLength, DEFAULT_LONG_BREAK_LENGTH);
  const configuredFocusSessions = normalizeFocusSessions(focusSessions);
  const [time, setTime] = React.useState(configuredFocusLength);
  const [timerState, setTimerState] = React.useState(TimerState.Stopped);
  const [sessionState, setSessionState] = React.useState(SessionState.Focus);
  const [focusCount, setFocusCount] = React.useState(1);
  const workerRef = useRef<Worker | null>(null);
  const timerStateRef = useRef(timerState);
  const deadlineRef = useRef<number | null>(null);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./workerTimer.js', import.meta.url));

    workerRef.current.onmessage = () => {
      if (timerStateRef.current === TimerState.Running) {
        const deadline = deadlineRef.current;
        if (deadline !== null) {
          setTime(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
        }
      }
    };

    return () => {
      workerRef.current?.postMessage({ command: 'stop' });
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (timerState !== TimerState.Running || time > 0) {
      return;
    }

    timerStateRef.current = TimerState.Stopped;
    workerRef.current?.postMessage({ command: 'stop' });
    deadlineRef.current = null;
    setTimerState(TimerState.Stopped);

    if (sessionState === SessionState.Focus) {
      playSound(FOCUS_COMPLETE_SOUND);
      const nextFocusCount = focusCount >= configuredFocusSessions ? 1 : focusCount + 1;
      if (focusCount >= configuredFocusSessions) {
        setSessionState(SessionState.LongBreak);
        setTime(configuredLongBreakLength);
      } else {
        setSessionState(SessionState.ShortBreak);
        setTime(configuredShortBreakLength);
      }
      setFocusCount(nextFocusCount);
    } else if (sessionState === SessionState.ShortBreak) {
      setTime(configuredFocusLength);
      setSessionState(SessionState.Focus);
      playSound(SHORT_BREAK_COMPLETE_SOUND);
    } else {
      setTime(configuredFocusLength);
      setSessionState(SessionState.Focus);
      playSound(SHORT_BREAK_COMPLETE_SOUND);
      setFocusCount(1);
    }
  }, [
    configuredFocusLength,
    configuredFocusSessions,
    configuredLongBreakLength,
    configuredShortBreakLength,
    focusCount,
    sessionState,
    time,
    timerState,
  ]);

  useEffect(() => {
    if (timerState !== TimerState.Stopped) {
      return;
    }

    const sessionLength =
      sessionState === SessionState.Focus
        ? configuredFocusLength
        : sessionState === SessionState.ShortBreak
          ? configuredShortBreakLength
          : configuredLongBreakLength;
    setTime(sessionLength);
  }, [configuredFocusLength, configuredLongBreakLength, configuredShortBreakLength, sessionState, timerState]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const startTimer = () => {
    deadlineRef.current = Date.now() + time * 1000;
    timerStateRef.current = TimerState.Running;
    setTimerState(TimerState.Running);
    workerRef.current?.postMessage({ command: 'start', interval: TICK_INTERVAL });
  };

  const pauseTimer = () => {
    if (deadlineRef.current !== null) {
      setTime(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
    }
    deadlineRef.current = null;
    timerStateRef.current = TimerState.Paused;
    setTimerState(TimerState.Paused);
    workerRef.current?.postMessage({ command: 'stop' });
  };

  const stopTimer = () => {
    deadlineRef.current = null;
    timerStateRef.current = TimerState.Stopped;
    setTimerState(TimerState.Stopped);
    workerRef.current?.postMessage({ command: 'stop' });
  };

  const restartSession = () => {
    stopTimer();
    setTime(configuredFocusLength);
    setFocusCount(1);
    setSessionState(SessionState.Focus);
    setTimerState(TimerState.Stopped);
  };

  const skipToNext = () => {
    stopTimer();
    if (sessionState === SessionState.Focus) {
      if (focusCount >= configuredFocusSessions) {
        setSessionState(SessionState.LongBreak);
        setTime(configuredLongBreakLength);
      } else {
        setSessionState(SessionState.ShortBreak);
        setTime(configuredShortBreakLength);
      }
    } else if (sessionState === SessionState.ShortBreak || sessionState === SessionState.LongBreak) {
      setSessionState(SessionState.Focus);
      setTime(configuredFocusLength);
      setFocusCount(sessionState === SessionState.LongBreak ? 1 : focusCount + 1);
    }
  };

  const handleTimerClick = () => {
    if (timerState === TimerState.Stopped) {
      startTimer();
    } else if (timerState === TimerState.Running) {
      pauseTimer();
    } else if (timerState === TimerState.Paused) {
      startTimer();
    } else {
      stopTimer();
    }
  };

  const getButtonText = () => {
    switch (timerState) {
      case TimerState.Running:
        return `Pause ${sessionState}`;
      case TimerState.Paused:
        return `Resume ${sessionState}`;
      case TimerState.Stopped:
        return `Start ${sessionState}`;
      default:
        return `Start ${sessionState}`;
    }
  };

  return (
    <div className='rounded-lg p-4 flex justify-center items-center flex-col border border-border bg-surface'>
      <p className='text-foreground text-4xl font-semibold' role='timer' aria-live='off'>
        {formatTime(time)}
      </p>
      <div className='flex items-center justify-between mt-4'>
        <button
          type='button'
          className='flex items-center cursor-pointer mr-4'
          title='Restart Session'
          onClick={restartSession}
          role='button'
          aria-label='Restart Session'
          tabIndex={0}
        >
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='size-6'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3'
            />
          </svg>
        </button>

        <button
          onClick={handleTimerClick}
          className='bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary-hover'
        >
          {getButtonText()}
        </button>

        <button
          type='button'
          className='flex items-center cursor-pointer ml-4'
          title={
            [SessionState.ShortBreak, SessionState.LongBreak].includes(sessionState)
              ? 'Skip to the next session'
              : sessionState === SessionState.Focus
              ? 'Skip to the next break'
              : ''
          }
          onClick={skipToNext}
          role='button'
          aria-label={
            [SessionState.ShortBreak, SessionState.LongBreak].includes(sessionState)
              ? 'Skip to the next session'
              : sessionState === SessionState.Focus
              ? 'Skip to the next break'
              : ''
          }
        >
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='size-6'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25'
            />
          </svg>
        </button>
      </div>
      <div className='mt-4 text-accent'>
        {sessionState === SessionState.Focus && `Focus Sessions: ${focusCount}/${configuredFocusSessions}`}
        {sessionState === SessionState.ShortBreak && 'Short Break'}
        {sessionState === SessionState.LongBreak && 'Long Break'}
      </div>
    </div>
  );
};

export default Timer;
