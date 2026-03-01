import { webHealthPayload } from '@/lib/health';

export default function HomePage() {
  return (
    <main>
      <h1>AI Motivational Shorts</h1>
      <p>Web shell is ready.</p>
      <pre>{JSON.stringify(webHealthPayload, null, 2)}</pre>
    </main>
  );
}
