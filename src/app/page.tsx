import Timer from '../components/timer';

export default function Home() {
  return (
    <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]'>
      <div>
        <h1 className='mt-16 mb-4 text-4xl font-bold'>Pomodoro Timer</h1>
        <Timer />
      </div>
    </div>
  );
}
