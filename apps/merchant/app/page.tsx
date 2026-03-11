const apiBase = "http://localhost:4000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json() as Promise<T>;
}

export default async function Home() {
  const [merchants, cases, outcomes, communications, evidence] = await Promise.all([
    getJson<any[]>("/merchants?limit=6"),
    getJson<any[]>("/cases?limit=12"),
    getJson<any[]>("/outcomes?limit=8"),
    getJson<any[]>("/communications?limit=8"),
    getJson<any[]>("/evidence?limit=6")
  ]);

  return (
    <div className="page">
      <div className="container">
        <nav className="nav">
          <div className="logo">
            <span>RefundWala Merchant HQ</span>
            <span className="pill">Resolution</span>
          </div>
          <div className="nav-links">
            <span>Cases</span>
            <span>Outcomes</span>
            <span>Comms</span>
            <span>Insights</span>
          </div>
        </nav>

        <section className="hero">
          <div>
            <div className="eyebrow">Trusted recovery partner</div>
            <h1>Resolve disputes fast, keep customers, protect brand trust.</h1>
            <p>All inbound cases in one place. Track outcomes, respond quickly, and reduce escalations.</p>
            <div className="cta-row">
              <button className="btn-primary">Review Cases</button>
              <button className="btn-secondary">Export Report</button>
            </div>
            <div className="metrics">
              <div className="metric">
                <strong>{merchants.length}</strong>
                <span>Active merchants</span>
              </div>
              <div className="metric">
                <strong>{outcomes.length}</strong>
                <span>Recent outcomes</span>
              </div>
              <div className="metric">
                <strong>{communications.length}</strong>
                <span>Comms sent</span>
              </div>
            </div>
          </div>
          <div className="hero-card glow">
            <h2>Recent outcomes</h2>
            <p>Live resolution snapshots.</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Type</th>
                  <th>Refund</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((o) => (
                  <tr key={o.id}>
                    <td>{o.caseId.slice(0, 8)}</td>
                    <td>{o.type}</td>
                    <td>{o.refundAmount ? `₹${o.refundAmount}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2>Merchant cases</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id.slice(0, 8)}</td>
                    <td>{c.category}</td>
                    <td>
                      <span className="pill">{c.status}</span>
                    </td>
                    <td>₹{c.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2>Recent communications</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Channel</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {communications.map((c) => (
                  <tr key={c.id}>
                    <td>{c.caseId.slice(0, 8)}</td>
                    <td>{c.channel}</td>
                    <td>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2>Evidence gallery</h2>
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
          <h2>Partner with RefundWala</h2>
          <p>Resolve refunds faster, cut escalations, and deliver trust at scale.</p>
          <div className="cta-row">
            <button className="btn-primary">Book a Demo</button>
            <button className="btn-secondary">Contact Support</button>
          </div>
        </section>
      </div>
    </div>
  );
}
