import { useEffect, useState } from "react";
import { api } from "../api";
import type { RecordData } from "../api";
import { currency, show } from "./modules";

export function CostTools() {
  const [products, setProducts] = useState<RecordData[]>([]);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [forecast, setForecast] = useState<Record<string, unknown> | null>(
    null,
  );
  const [error, setError] = useState("");
  useEffect(() => {
    api<RecordData[]>("/api/v1/admin/products?limit=200")
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <h1>Costos y reportes</h1>
      <div className="admin-panel">
        <h2>Cotizador según receta</h2>
        <p className="muted">
          Costo de ingredientes + mano de obra + otros costos + decoración. El
          margen se calcula sobre el precio de venta.
        </p>
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            try {
              setResult(
                await api<Record<string, string>>("/api/v1/tools/estimate", {
                  method: "POST",
                  body: JSON.stringify({
                    product_id: Number(data.get("product_id")),
                    quantity: data.get("quantity"),
                    decoration_cost: data.get("decoration_cost"),
                    margin: data.get("margin"),
                  }),
                }),
              );
              setError("");
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <select name="product_id" required aria-label="Producto">
            <option value="">Producto…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {String(p.name)}
              </option>
            ))}
          </select>
          <label>
            Cantidad
            <input
              type="number"
              name="quantity"
              min="0.001"
              step="0.001"
              defaultValue="1"
              required
            />
          </label>
          <label>
            Decoración S/
            <input
              name="decoration_cost"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              required
            />
          </label>
          <label>
            Margen %
            <input
              name="margin"
              type="number"
              min="0"
              max="90"
              step="0.1"
              defaultValue="30"
              required
            />
          </label>
          <button className="admin-primary">Calcular</button>
        </form>
        {result && (
          <div className="cost-result">
            <p>
              Costo: <strong>{currency(result.cost)}</strong>
            </p>
            <p>
              Precio sugerido:{" "}
              <strong>{currency(result.suggested_price)}</strong>
            </p>
            <p>
              Ganancia estimada:{" "}
              <strong>{currency(result.estimated_profit)}</strong>
            </p>
          </div>
        )}
      </div>
      <div className="admin-panel">
        <h2>Estimación de demanda</h2>
        <p className="muted">
          Requiere historia suficiente; no utiliza cifras inventadas.
        </p>
        <button
          onClick={async () => {
            try {
              setForecast(
                await api<Record<string, unknown>>("/api/v1/reports/demand"),
              );
              setError("");
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          Consultar demanda
        </button>
        {forecast && (
          <>
            <p>{String(forecast.message || forecast.method)}</p>
            {Array.isArray(forecast.products) && (
              <ul>
                {(
                  forecast.products as {
                    name: string;
                    weekly_estimate: number;
                  }[]
                ).map((p) => (
                  <li key={p.name}>
                    {p.name}: {p.weekly_estimate} unidades / semana
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function Calendar() {
  const [orders, setOrders] = useState<RecordData[]>([]);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  useEffect(() => {
    api<RecordData[]>("/api/v1/admin/orders?limit=200")
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, []);
  const start = new Date(month + "-01T12:00:00");
  const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const offset = (start.getDay() + 6) % 7;
  return (
    <>
      <div className="admin-page-heading">
        <h1>Calendario de entregas</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
          aria-label="Mes del calendario"
        />
      </div>
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-panel">
        <p className="muted">
          Muestra los 200 pedidos más recientes; consulta Pedidos para el
          historial paginado.
        </p>
        <div className="calendar-grid">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <strong key={d}>{d}</strong>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={"empty" + i} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = month + "-" + String(i + 1).padStart(2, "0");
            return (
              <div
                className={
                  "calendar-day " +
                  (day === new Date().toLocaleDateString("en-CA")
                    ? "today"
                    : "")
                }
                key={day}
              >
                <strong>{i + 1}</strong>
                {orders
                  .filter((o) => o.due_date === day && o.status !== "cancelled")
                  .map((o) => (
                    <p key={o.id} className={"status status-" + o.status}>
                      #{o.id} {String(o.customer_name)}
                      <small>{show(o.status)}</small>
                    </p>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
