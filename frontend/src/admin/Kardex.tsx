import { useEffect, useState } from "react";
import { api } from "../api";
import "./Kardex.css";

type LedgerRow = { id: number; created_at: string; kind: string; reference: string; reason: string; responsible: string; incoming: string; outgoing: string; balance: string };
type Ledger = { from_date: string | null; to_date: string | null; ingredient: { id: number; name: string; unit: string }; opening: string; incoming: string; outgoing: string; closing: string; history_available: boolean; reconciled: boolean; total: number; rows: LedgerRow[] };
const kinds: Record<string, string> = { purchase: "Compra", production: "Producción", adjustment: "Ajuste" };
const quantity = (value: string) => Number(value).toLocaleString("es-PE", { maximumFractionDigits: 3 });

export default function Kardex() {
  const [ingredients, setIngredients] = useState<{ id: number; name: string; unit: string }[]>([]);
  const [ingredient, setIngredient] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState("");
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<Ledger | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const records: typeof ingredients = [];
      for (let offset = 0; ; offset += 100) {
        const batch = await api<typeof ingredients>(`/api/v1/admin/ingredients?limit=100&offset=${offset}`, { signal: controller.signal });
        records.push(...batch);
        if (batch.length < 100) break;
      }
      if (!controller.signal.aborted) { setIngredients(records); if (records[0]) { setIngredient(String(records[0].id)); setFilters(`ingredient_id=${records[0].id}`); } }
    }
    void load().catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!filters) return;
    const controller = new AbortController();
    api<Ledger>(`/api/v1/inventory/kardex?${filters}&limit=50&offset=${offset}`, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) { setData(result); setError(""); } }).catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [filters, offset, revision]);
  async function download() {
    setExporting(true);
    try {
      const result = await api<Ledger>(`/api/v1/inventory/kardex?${filters}&limit=20000`);
      if (result.total > 20000) throw new Error("Hay más de 20 000 movimientos. Reduce el intervalo para exportar el reporte completo.");
      const quote = (value: string) => `"${value.replace(/^[\s]*[=+@-]/, "'$&").replaceAll('"', '""')}"`;
      const rows = [["Kardex físico", result.ingredient.name, result.ingredient.unit], ["Desde", result.from_date || "Todo el historial", "Hasta", result.to_date || "Sin fecha final"], ["Saldo inicial", result.opening, "Entradas", result.incoming, "Salidas", result.outgoing, "Saldo final", result.closing], ["Fecha (Lima)", "Tipo", "Referencia", "Motivo", "Responsable", "Entrada", "Salida", "Saldo"], ...result.rows.map(row => [row.created_at, kinds[row.kind] || row.kind, row.reference, row.reason, row.responsible, row.incoming, row.outgoing, row.balance])];
      const url = URL.createObjectURL(new Blob(["\ufeff" + rows.map(row => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `delyjhos-kardex-${result.ingredient.id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError((e as Error).message); } finally { setExporting(false); }
  }
  return <section className="kardex-page"><div className="admin-page-heading"><div><h1>Kardex de inventario</h1><p>Entradas, salidas y saldos por ingrediente · Hora de Lima</p></div><button onClick={() => void download()} disabled={!data || busy || exporting}>{exporting ? "Exportando…" : "Exportar kardex completo"}</button></div>
    <form className="kardex-filters admin-panel" onSubmit={event => { event.preventDefault(); if (from && to && from > to) { setError("La fecha inicial no puede superar la fecha final"); return; } const params = new URLSearchParams({ ingredient_id: ingredient }); if (from) params.set("from_date", from); if (to) params.set("to_date", to); setError(""); setBusy(true); setData(null); setOffset(0); setFilters(params.toString()); setRevision(value => value + 1); }}><label>Ingrediente<select value={ingredient} required onChange={event => setIngredient(event.target.value)}><option value="">Selecciona un ingrediente</option>{ingredients.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label><label>Desde<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Hasta<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><button className="admin-primary" disabled={!ingredient || busy}>Consultar kardex</button></form>
    {error && <p role="alert" className="admin-error">{error}</p>}{busy && <p role="status">Consultando movimientos…</p>}
    {!ingredients.length && !error && <p className="muted">Registra ingredientes en Inventario para consultar su kardex.</p>}
    {data && <><h2>{data.ingredient.name} <small>· {data.ingredient.unit}</small></h2><p className="muted">Intervalo aplicado: {data.from_date || "Todo el historial"} → {data.to_date || "Sin fecha final"}</p><div className="kardex-totals">{[["Saldo inicial", data.opening], ["Entradas", data.incoming], ["Salidas", data.outgoing], ["Saldo final", data.closing]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{quantity(value)} <small>{data.ingredient.unit}</small></strong></div>)}</div>
      <p className="muted">Los totales corresponden a todo el intervalo, no solo a esta página. Es un kardex físico: los movimientos anteriores no guardan costos históricos para una valorización fiable.</p>
      {!data.history_available && <p className="kardex-notice">Sin movimientos registrados. El saldo mostrado es la existencia actual; no acredita un saldo histórico para las fechas seleccionadas.</p>}{!data.reconciled && <p role="alert" className="kardex-notice">Los saldos guardados no concilian con las cantidades del intervalo. Revisa el historial antes de usar este reporte.</p>}
      <div className="table-scroll"><table><caption>Movimientos de {data.ingredient.name} · {data.total} registros</caption><thead><tr>{["Fecha", "Tipo / referencia", "Motivo", "Responsable", "Entrada", "Salida", "Saldo"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.rows.map(row => <tr key={row.id}><td>{new Date(row.created_at).toLocaleString("es-PE", { timeZone: "America/Lima" })}</td><td>{kinds[row.kind] || row.kind}<small className="kardex-reference">{row.reference}</small></td><td>{row.reason}</td><td>{row.responsible}</td><td className="kardex-number incoming">{quantity(row.incoming)}</td><td className="kardex-number outgoing">{quantity(row.outgoing)}</td><td className="kardex-number"><strong>{quantity(row.balance)}</strong></td></tr>)}{data.rows.length === 0 && <tr><td colSpan={7}>No hay movimientos en este intervalo.</td></tr>}</tbody></table></div><div className="kardex-pagination"><span>{data.total ? offset + 1 : 0}–{Math.min(offset + 50, data.total)} de {data.total}</span><button disabled={offset === 0 || busy} onClick={() => { setBusy(true); setData(null); setOffset(value => value - 50); }}>Anterior</button><button disabled={offset + 50 >= data.total || busy} onClick={() => { setBusy(true); setData(null); setOffset(value => value + 50); }}>Siguiente</button></div></>}
  </section>;
}
