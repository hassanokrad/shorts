import { webHealthPayload } from '@/lib/health';

const roadmap = [
  {
    title: 'Phase 1 · Auth + Credits',
    details: [
      'Register/login with refresh token rotation',
      'Credit account + ledger transaction model',
      'Role-safe /v1 API boundaries'
    ]
  },
  {
    title: 'Phase 2 · Project Builder',
    details: [
      'Create project drafts from topic + duration',
      'Generate script and split to scenes',
      'Template selector and render pricing preview'
    ]
  },
  {
    title: 'Phase 3 · Render + Billing',
    details: [
      'Queued render jobs with SKIP LOCKED worker',
      'Stripe webhook sync + monthly credit grants',
      'Signed output URLs from private object storage'
    ]
  }
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <span className="badge">Production-Safe MVP</span>
        <h1>AI Motivational Shorts Generator</h1>
        <p>
          You now have a visible frontend shell. Next we wire API-backed auth, projects, and queued renders so this
          becomes a working dashboard instead of a static page.
        </p>
      </section>

      <section className="grid" aria-label="Roadmap">
        {roadmap.map((item) => (
          <article className="card" key={item.title}>
            <h3>{item.title}</h3>
            <ul>
              {item.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="status" aria-label="Web health status">
        <h2>Current frontend status</h2>
        <pre>{JSON.stringify(webHealthPayload, null, 2)}</pre>
      </section>
    </main>
  );
}
