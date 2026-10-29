import { useEffect, useState } from "react";
import { api } from "../api";
import "./Readiness.css";

type Report = { passed: number; total: number; checks: { key: string; title: string; passed: boolean; detail: string; section: string }[]; manual_checks: string[] };

export default function Readiness({ onOpenSection }: { onOpenSection: (section: string) => void }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<Report>("/api/v1/business/readiness", { signal: controller.signal }).then(data => { if (!controller.signal.aborted) { setReport(data); setError(""); } }).catch((err: Error) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [revision]);
  return <section className="readiness-page" aria-labelledby="readiness-title">
    <div className="readiness-heading"><div><h1 id="readiness-title">Preparación del negocio</h1><p>Revisa qué falta configurar antes de trabajar con pedidos reales.</p></div><button className="admin-primary" onClick={() => { setReport(null); setError(""); setRevision(value => value + 1); }}>Actualizar revisión</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {!report && !error && <p role="status">Revisando la configuración…</p>}
    {report && <><div className="readiness-summary" role="status"><strong>{report.passed} de {report.total} comprobaciones configuradas</strong><p>Este resumen revisa los registros del sistema. No certifica recetas, disponibilidad ni la publicación en internet.</p></div><div className="readiness-checks">{report.checks.map(check => <article key={check.key}><span className={check.passed ? "readiness-status complete" : "readiness-status"}>{check.passed ? "Configurado" : "Pendiente"}</span><h2>{check.title}</h2><p>{check.detail}</p><button className="admin-secondary" onClick={() => onOpenSection(check.section)}>Revisar configuración →</button></article>)}</div><section className="admin-panel readiness-manual"><h2>Validar con el equipo y el servidor final</h2><p>Estas comprobaciones requieren una revisión real; el sistema no las marca como completadas automáticamente.</p><ul>{report.manual_checks.map(item => <li key={item}>{item}</li>)}</ul></section></>}
  </section>;
}
