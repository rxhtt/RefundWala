const apiBase = "http://localhost:4000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json() as Promise<T>;
}

export default async function Home() {
  const [cases, evidence, analytics, payments] = await Promise.all([
    getJson<any[]>("/cases?limit=12"),
    getJson<any[]>("/evidence?limit=8"),
    getJson<any>("/analytics/summary"),
    getJson<any[]>("/payments?limit=8")
  ]);

  return (
    <div className="page">
      <div className="container">
        <nav className="nav">
          <div className="logo">
            <span>RefundWala</span>
            <span className="pill">India-first</span>
          </div>
          <div className="nav-links">
            <span>How it works</span>
            <span>Pricing</span>
            <span>Trust</span>
            <span>Start</span>
          </div>
        </nav>

        <section className="hero">
          <div>
            <div className="eyebrow">Refund recovery in 72 hours or less</div>
            <h1>Get your stuck refund back without chasing anyone.</h1>
            <p>
              Submit your case in minutes. Our concierge escalates, documents, and closes the
              loop. Pay only when we recover your money.
            </p>
            <div className="cta-row">
              <button className="btn-primary">Start Recovery</button>
              <button className="btn-secondary">See Live Proof</button>
            </div>
            <div className="metrics">
              <div className="metric">
                <strong>{analytics.total_cases}</strong>
                <span>Total cases handled</span>
              </div>
              <div className="metric">
                <strong>{analytics.resolved_cases}</strong>
                <span>Resolved this month</span>
              </div>
              <div className="metric">
                <strong>{analytics.escalated_cases}</strong>
                <span>Active escalations</span>
              </div>
            </div>
          </div>
          <div className="hero-card glow">
            <h2>Live Recovery Pulse</h2>
            <p>Streaming data from production-like MySQL seed.</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.caseId.slice(0, 6)}</td>
                    <td>₹{p.amount}</td>
                    <td>
                      <span className="pill">{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2>How it works</h2>
          <p>Three steps. We handle the follow-ups, the pressure, and the paperwork.</p>
          <div className="grid grid-3">
            <div className="card">
              <h3>1. Submit evidence</h3>
              <p>Upload receipts, chats, bank entries. We verify and lock them.</p>
            </div>
            <div className="card">
              <h3>2. Concierge escalation</h3>
              <p>We chase merchants through proven escalation playbooks.</p>
            </div>
            <div className="card">
              <h3>3. Recovery & payout</h3>
              <p>Confirm your refund and pay only a success fee.</p>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>Recent cases</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id.slice(0, 8)}</td>
                    <td>{c.category}</td>
                    <td>₹{c.amount}</td>
                    <td>
                      <span className="pill">{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2>Evidence gallery</h2>
          <p>Realistic receipts, chats, and transaction proofs used in our demo.</p>
          <div className="evidence">
            {evidence.map((e) => (
              <img
                key={e.id}
                src={`${apiBase}/evidence/${e.id}/file`}
                alt={`Evidence ${e.id}`}
              />
            ))}
          </div>
        </section>

        <section className="footer-cta">
          <h2>Ready to recover your money?</h2>
          <p>Submit your case now. We’ll show a recovery plan in minutes.</p>
          <div className="cta-row">
            <button className="btn-primary">Start Recovery</button>
            <button className="btn-secondary">Talk to Concierge</button>
          </div>
        </section>
      </div>
    </div>
  );
}
