import { useEffect, useState } from "react";
import { api } from "../api";
import type { RecordData, SessionUser } from "../api";
import AdminIcon from "./AdminIcon";
import { currency, statuses, show } from "./modules";

export default function Dashboard({ user }: { user: SessionUser }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api<Record<string, unknown>>("/api/v1/reports/dashboard", {
      signal: controller.signal,
    })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  if (error)
    return (
      <p className="admin-error" role="alert">
        {error}
      </p>
    );
  if (!data) return <p>Cargando el resumen del negocio…</p>;
  const days = (data.daily_sales || []) as { date: string; amount: string }[];
  const maximum = Math.max(1, ...days.map((d) => Number(d.amount)));
  const upcoming = (data.upcoming || []) as RecordData[];
  const low = (data.low_stock || []) as RecordData[];
  const tops = (data.top_products || []) as {
    name: string;
    quantity: number;
    revenue: string;
  }[];
  return (
    <>
      <div className="welcome">
        <div>
          <p className="admin-eyebrow">RESUMEN DEL NEGOCIO</p>
          <h1>Hola, {user.name.split(" ")[0]}.</h1>
          <p>
            Pedidos, producción e inventario: lo importante de tu día, en un solo lugar.
          </p>
        </div>
        <time>
          {new Date().toLocaleDateString("es-PE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
      </div>
      <div className="stat-grid">
        <div className="stat-card pink">
          <span><AdminIcon name="orders" /></span>
          <div>
            <p>Pedidos de hoy</p>
            <strong>{Number(data.orders_today)}</strong>
          </div>
        </div>
        <div className="stat-card yellow">
          <span><AdminIcon name="money" /></span>
          <div>
            <p>Cobrado hoy</p>
            <strong>
              {data.collected_today == null
                ? "—"
                : currency(data.collected_today)}
            </strong>
          </div>
        </div>
        <div className="stat-card purple">
          <span><AdminIcon name="catalog" /></span>
          <div>
            <p>Pedidos activos</p>
            <strong>{Number(data.active_orders)}</strong>
          </div>
        </div>
        <div className="stat-card green">
          <span><AdminIcon name="recipe" /></span>
          <div>
            <p>En producción</p>
            <strong>{Number(data.in_production)}</strong>
          </div>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="admin-panel sales-chart">
          <h2>Cobros de los últimos 7 días</h2>
          {days.length ? (
            <div className="bar-chart">
              {days.map((d) => (
                <div key={d.date}>
                  <span>{currency(d.amount)}</span>
                  <i
                    style={{
                      height: `${Math.max(2, (Number(d.amount) / maximum) * 150)}px`,
                    }}
                  />
                  <small>
                    {new Date(d.date + "T12:00:00").toLocaleDateString(
                      "es-PE",
                      { weekday: "short" },
                    )}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Los importes requieren permisos de ventas.</p>
          )}
        </section>
        <section className="admin-panel">
          <h2>Pedidos por estado</h2>
          <div className="status-summary">
            {Object.entries(data.by_status as Record<string, number>).map(
              ([key, count]) => (
                <div key={key}>
                  <span className={"status status-" + key}>
                    {statuses[key]}
                  </span>
                  <strong>{count}</strong>
                </div>
              ),
            )}
          </div>
        </section>
        <section className="admin-panel">
          <h2>Próximas entregas</h2>
          {upcoming.length ? (
            <ul className="summary-list">
              {upcoming.map((o) => (
                <li key={o.id}>
                  <span>
                    <strong>
                      #{o.id} · {String(o.customer_name)}
                    </strong>
                    <small>{String(o.due_date)}</small>
                  </span>
                  <span className={"status status-" + o.status}>
                    {show(o.status)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No hay entregas pendientes.</p>
          )}
        </section>
        <section className="admin-panel">
          <h2>Stock bajo</h2>
          {low.length ? (
            <ul className="summary-list">
              {low.map((i) => (
                <li key={i.id}>
                  <span>{String(i.name)}</span>
                  <strong className="low-stock">
                    {String(i.stock)} {String(i.unit)}{" "}
                    <small>(mín. {String(i.minimum_stock)})</small>
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No hay alertas de stock.</p>
          )}
        </section>
        <section className="admin-panel">
          <h2>Productos más vendidos</h2>
          {tops.length ? (
            <ul className="summary-list">
              {tops.map((t) => (
                <li key={t.name}>
                  <span>
                    {t.name}
                    <small>{t.quantity} unidades entregadas</small>
                  </span>
                  <strong>{currency(t.revenue)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Aparecerán cuando registres pedidos entregados.
            </p>
          )}
        </section>
        <section className="admin-panel">
          <h2>Rentabilidad estimada</h2>
          <p className="big-number">
            {data.estimated_profit == null
              ? "—"
              : currency(data.estimated_profit)}
          </p>
          <p className="muted">
            Ventas entregadas menos costo de recetas confirmado. No incluye
            todos los gastos contables del negocio.
          </p>
          <p>
            Ventas entregadas:{" "}
            <strong>
              {data.sales_total == null ? "—" : currency(data.sales_total)}
            </strong>
          </p>
        </section>
      </div>
    </>
  );
}
