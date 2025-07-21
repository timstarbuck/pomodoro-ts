'use client';

import React, { useEffect, useRef } from 'react';
import { playSound } from 'react-sounds';

enum SessionState {
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

const FOCUS_SESSIONS = 4; // Number of focus sessions before a long break
const FOCUS_LENGTH = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK_LENGTH = 5 * 60; // 5 minutes in seconds
const LONG_BREAK_LENGTH = 20 * 60; // 20 minutes in seconds

const Timer = () => {
  const [time, setTime] = React.useState(FOCUS_LENGTH);
  const [timerState, setTimerState] = React.useState(TimerState.Stopped);
  const [sessionState, setSessionState] = React.useState(SessionState.Focus);
  const [focusCount, setFocusCount] = React.useState(1);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // use a web worker to handle the timer logic
    // this ensures the timer runs even when the tab is not focused
    workerRef.current = new Worker(new URL('./workerTimer.js', import.meta.url));

    workerRef.current.onmessage = () => {
      setTime((prevTime) => prevTime - 1);
    };

    workerRef.current.postMessage({ command: 'start', interval: 1000 });

    return () => {
      workerRef.current?.postMessage({ command: 'stop' });
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (sessionState === SessionState.Focus && timerState === TimerState.Running && time <= 0) {
      stopTimer();
      setTimerState(TimerState.Stopped);
      playSound(FOCUS_COMPLETE_SOUND);
      if (focusCount >= FOCUS_SESSIONS) {
        setSessionState(SessionState.LongBreak);
        setTime(LONG_BREAK_LENGTH);
        setFocusCount(0); // Reset focus count after long break
      } else {
        setSessionState(SessionState.ShortBreak);
        setTime(SHORT_BREAK_LENGTH);
      }
      setFocusCount((prevCount) => prevCount + 1);
    } else if (sessionState === SessionState.ShortBreak && timerState === TimerState.Running && time <= 0) {
      setTime(FOCUS_LENGTH);
      stopTimer();
      setTimerState(TimerState.Stopped);
      setSessionState(SessionState.Focus);
      playSound(SHORT_BREAK_COMPLETE_SOUND);
    } else if (sessionState === SessionState.LongBreak && timerState === TimerState.Running && time <= 0) {
      setTime(FOCUS_LENGTH);
      stopTimer();
      setTimerState(TimerState.Stopped);
      setSessionState(SessionState.Focus);
      playSound(SHORT_BREAK_COMPLETE_SOUND);
      setFocusCount(1);
    }
  }, [time, timerState]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const startTimer = () => {
    workerRef.current?.postMessage({ command: 'start', interval: 1000 });
  };

  const pauseTimer = () => {
    stopTimer();
    setTimerState(TimerState.Paused);
  };

  const stopTimer = () => {
    workerRef.current?.postMessage({ command: 'stop' });
  };

  const restartSession = () => {
    stopTimer();
    setTime(FOCUS_LENGTH);
    setFocusCount(1);
    setSessionState(SessionState.Focus);
    setTimerState(TimerState.Stopped);
  };

  const skipToNext = () => {
    if (sessionState === SessionState.Focus && timerState === TimerState.Running) {
      setTimerState(TimerState.Stopped);
      if (focusCount >= FOCUS_SESSIONS) {
        setSessionState(SessionState.LongBreak);
        setTime(LONG_BREAK_LENGTH);
      } else {
        setSessionState(SessionState.ShortBreak);
        setTime(SHORT_BREAK_LENGTH);
      }
      stopTimer();
    } else if (sessionState === SessionState.ShortBreak || (sessionState === SessionState.LongBreak && timerState === TimerState.Running)) {
      if (sessionState === SessionState.LongBreak) {
        setFocusCount(1);
      } else {
        setFocusCount((prevCount) => prevCount + 1);
      }
      setTimerState(TimerState.Stopped);
      setSessionState(SessionState.Focus);
      setTime(FOCUS_LENGTH);
      stopTimer();
    }
  };

  const handleTimerClick = () => {
    if (timerState === TimerState.Stopped) {
      setTimerState(TimerState.Running);
      startTimer();
    } else if (timerState === TimerState.Running) {
      setTimerState(TimerState.Paused);
      pauseTimer();
    } else if (timerState === TimerState.Paused) {
      setTimerState(TimerState.Running);
      startTimer();
    } else {
      setTimerState(TimerState.Stopped);
      pauseTimer();
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
    <div className='rounded-lg p-4  flex justify-center items-center flex-col border border-gray-300 '>
      <p className='text-gray-700 text-4xl font-semibold'>{formatTime(time)}</p>
      <div className='flex items-center justify-between mt-4'>
        <div className='flex items-center cursor-pointer mr-4' title='Restart Session' onClick={restartSession}>
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='size-6'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3'
            />
          </svg>
        </div>

        <button onClick={handleTimerClick} className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
          {getButtonText()}
        </button>

        <div
          className='flex items-center cursor-pointer ml-4'
          title={
            [SessionState.ShortBreak, SessionState.LongBreak].includes(sessionState)
              ? 'Skip to the next session'
              : sessionState === SessionState.Focus
              ? 'Skip to the next break'
              : ''
          }
          onClick={skipToNext}
        >
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='size-6'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25'
            />
          </svg>
        </div>
      </div>
      <div className='mt-4 text-gray-600'>
        {sessionState === SessionState.Focus && `Focus Sessions: ${focusCount}/${FOCUS_SESSIONS}`}
        {sessionState === SessionState.ShortBreak && 'Short Break'}
        {sessionState === SessionState.LongBreak && 'Long Break'}
      </div>
    </div>
  );
};

export default Timer;
