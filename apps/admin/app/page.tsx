const apiBase = "http://localhost:4000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json() as Promise<T>;
}

export default async function Home() {
  const [cases, rules, slaTimers, auditLogs, evidence] = await Promise.all([
    getJson<any[]>("/cases?limit=12"),
    getJson<any[]>("/routing/rules?limit=8"),
    getJson<any[]>("/sla-timers?limit=8"),
    getJson<any[]>("/audit/logs"),
    getJson<any[]>("/evidence?limit=6")
  ]);

  return (
    <div className="page">
      <div className="container">
        <nav className="nav">
          <div className="logo">
            <span>RefundWala Agent Console</span>
            <span className="pill">Operations</span>
          </div>
          <div className="nav-links">
            <span>Queue</span>
            <span>Routing</span>
            <span>SLAs</span>
            <span>Audit</span>
          </div>
        </nav>

        <section className="hero">
          <div>
            <div className="eyebrow">Operations command center</div>
            <h1>Control refunds, escalations, and SLAs in one view.</h1>
            <p>Track high‑priority disputes, apply routing logic, and keep every action auditable.</p>
            <div className="cta-row">
              <button className="btn-primary">Open Queue</button>
              <button className="btn-secondary">Create Rule</button>
            </div>
            <div className="metrics">
              <div className="metric">
                <strong>{cases.length}</strong>
                <span>Cases in queue</span>
              </div>
              <div className="metric">
                <strong>{rules.length}</strong>
                <span>Active routing rules</span>
              </div>
              <div className="metric">
                <strong>{slaTimers.length}</strong>
                <span>SLA timers</span>
              </div>
            </div>
          </div>
          <div className="hero-card glow">
            <h2>Routing Rules</h2>
            <p>Live rules used to route cases to teams.</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.category}</td>
                    <td>{r.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2>Agent queue</h2>
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
          <h2>SLA timers</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {slaTimers.map((s) => (
                  <tr key={s.id}>
                    <td>{s.caseId.slice(0, 8)}</td>
                    <td>{new Date(s.dueAt).toLocaleDateString()}</td>
                    <td>{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2>Audit logs</h2>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Action</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((a) => (
                  <tr key={a.id}>
                    <td>{a.entityType}</td>
                    <td>{a.action}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
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
      </div>
    </div>
  );
}
