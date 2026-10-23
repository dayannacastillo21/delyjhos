import { useCallback, useEffect, useState } from "react";
import { api, assetUrl } from "../api";
import type { RecordData, SessionUser } from "../api";
import RecordForm from "./RecordForm";
import AdminDialog from "./AdminDialog";
import QuoteConversion from "./QuoteConversion";
import SnackQuoteConversion from "./SnackQuoteConversion";
import type { Module } from "./modules";
import { management, sales, labels, statuses, currency, show } from "./modules";

function csv(rows: RecordData[], columns: string[]) {
  const quote = (value: unknown) =>
    '"' +
    String(value ?? "")
      .replace(/^[=+@-]/, "'" + "$&")
      .replaceAll('"', '""') +
    '"';
  const content =
    "\ufeff" +
    [
      columns.map((c) => quote(labels[c] || c)).join(","),
      ...rows.map((r) => columns.map((c) => quote(r[c])).join(",")),
    ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  a.download = "delyjhos-reporte.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ResourceView({
  module,
  user,
}: {
  module: Module;
  user: SessionUser;
}) {
  const [rows, setRows] = useState<RecordData[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<RecordData | null | undefined>(undefined);
  const [detail, setDetail] = useState<RecordData | null>(null);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);
  const reload = useCallback(async () => {
    try {
      setRows(
        await api<RecordData[]>(
          `/api/v1/admin/${module.key}?limit=100&offset=${offset}`,
        ),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [module.key, offset]);
  useEffect(() => {
    const controller = new AbortController();
    api<RecordData[]>(
      `/api/v1/admin/${module.key}?limit=100&offset=${offset}`,
      { signal: controller.signal },
    )
      .then((data) => {
        setRows(data);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [module.key, offset]);
  const canWrite =
    management.includes(user.role) ||
    (user.role === "sales" &&
      ["orders", "customers", "quotes"].includes(module.key)) ||
    (user.role === "production" && module.key === "production") ||
    (user.role === "admin" && module.key === "users");
  const filtered = rows.filter((r) =>
    module.columns.some((c) =>
      show(r[c]).toLowerCase().includes(search.toLowerCase()),
    ),
  );
  async function action(path: string, data?: unknown) {
    setActionBusy(true);
    try {
      await api(path, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      });
      await reload();
      setDetail(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>{module.title}</h1>
          <p>Datos del negocio · {rows.length} registros en esta página</p>
        </div>
        <div className="admin-actions">
          <button onClick={() => csv(filtered, module.columns)}>
            Exportar CSV
          </button>
          {canWrite &&
            !module.readonly &&
            !["quotes", "snack-quotes"].includes(module.key) && (
              <button className="admin-primary" onClick={() => setForm(null)}>
                + Nuevo registro
              </button>
            )}
        </div>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {form !== undefined && (
        <RecordForm
          module={module}
          record={form}
          onCancel={() => setForm(undefined)}
          onSave={async (data) => {
            await api(
              `/api/v1/admin/${module.key}${form ? "/" + form.id : ""}`,
              { method: form ? "PUT" : "POST", body: JSON.stringify(data) },
            );
            setForm(undefined);
            await reload();
          }}
        />
      )}
      <div className="admin-panel">
        <div className="table-toolbar">
          <input
            aria-label="Buscar registros"
            placeholder="Buscar en esta página…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => void reload()}>Actualizar</button>
        </div>
        {busy ? (
          <p>Cargando…</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {module.columns.map((c) => (
                    <th key={c}>{labels[c] || c}</th>
                  ))}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    {module.columns.map((c) => (
                      <td key={c}>
                        {c === "status" ? (
                          <span className={"status status-" + row[c]}>
                            {show(row[c])}
                          </span>
                        ) : (
                          show(row[c])
                        )}
                      </td>
                    ))}
                    <td>
                      <div className="row-actions">
                        <button onClick={() => setDetail(row)}>Ver</button>
                        {canWrite &&
                          !module.readonly &&
                          !(module.key === "snack-quotes" && row.order_id) &&
                          !["orders", "purchases"].includes(module.key) && (
                            <button onClick={() => setForm(row)}>Editar</button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="admin-empty">
                No hay registros. Crea el primero o cambia la búsqueda.
              </p>
            )}
          </div>
        )}
        <div className="pagination">
          <button
            disabled={!offset}
            onClick={() => setOffset(Math.max(0, offset - 100))}
          >
            ← Anterior
          </button>
          <span>Página {offset / 100 + 1}</span>
          <button
            disabled={rows.length < 100}
            onClick={() => setOffset(offset + 100)}
          >
            Siguiente →
          </button>
        </div>
      </div>
      {module.key === "ingredients" && management.includes(user.role) && (
        <div className="admin-panel">
          <h2>Ajuste de inventario</h2>
          <p className="muted">
            Para compras usa el módulo Compras. Registra aquí apertura, merma o
            correcciones con su motivo.
          </p>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void action("/api/v1/admin/inventory/adjust", {
                ingredient_id: Number(data.get("ingredient_id")),
                quantity: data.get("quantity"),
                reason: data.get("reason"),
                idempotency_key: crypto.randomUUID(),
              });
            }}
          >
            <select name="ingredient_id" required aria-label="Ingrediente">
              <option value="">Ingrediente…</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {String(r.name)} ({String(r.unit)})
                </option>
              ))}
            </select>
            <input
              name="quantity"
              type="number"
              step="0.001"
              required
              placeholder="Cantidad (+ o −)"
              aria-label="Cantidad de ajuste"
            />
            <input
              name="reason"
              minLength={5}
              maxLength={250}
              required
              placeholder="Motivo auditable"
              aria-label="Motivo del ajuste"
            />
            <button className="admin-primary" disabled={actionBusy}>
              Registrar ajuste
            </button>
          </form>
        </div>
      )}
      {detail && (
        <AdminDialog onClose={() => setDetail(null)}>
          <div className="admin-section-title">
            <h2>
              {module.title} #{detail.id}
            </h2>
            <button onClick={() => setDetail(null)}>Cerrar ✕</button>
          </div>
          {module.key === "quotes" && Boolean(detail.reference_image) && (
            <img
              className="quote-image"
              src={assetUrl(String(detail.reference_image))}
              alt="Referencia de la cotización"
            />
          )}
          {module.key === "quotes" &&
          detail.reference_work &&
          typeof detail.reference_work === "object" ? (
            <div className="quote-work-reference">
              <img
                src={assetUrl(
                  String(
                    (detail.reference_work as Record<string, unknown>)
                      .poster_url,
                  ),
                )}
                alt="Trabajo elegido como inspiración"
              />
              <div>
                <strong>
                  {String(
                    (detail.reference_work as Record<string, unknown>).title,
                  )}
                </strong>
                <p>Referencia guardada al recibir la solicitud.</p>
                <a
                  href={assetUrl(
                    String(
                      (detail.reference_work as Record<string, unknown>)
                        .video_url,
                    ),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver video de referencia
                </a>
              </div>
            </div>
          ) : null}
          {Object.entries(detail)
            .filter(
              ([k]) =>
                ![
                  "items",
                  "payments",
                  "request_key",
                  "reference_work",
                  "reviewed_items",
                ].includes(k),
            )
            .map(([key, value]) => (
              <p key={key}>
                <strong>{labels[key] || key}: </strong>
                {show(value)}
              </p>
            ))}
          {Array.isArray(detail.items) && (
            <>
              <h3>
                {module.key === "snack-quotes"
                  ? "Selección solicitada"
                  : "Detalle"}
              </h3>
              <ul>
                {(detail.items as RecordData[]).map((i, index) => (
                  <li key={index}>
                    {module.key === "snack-quotes" ? (
                      <>
                        {String(i.name)} · {String(i.packs)} paquetes de{" "}
                        {String(i.units)} unidades ·{" "}
                        {i.price === null
                          ? "Precio por revisar"
                          : currency(i.price)}{" "}
                        ·{" "}
                        {i.availability_confirmed
                          ? "Disponibilidad confirmada al solicitar"
                          : "Disponibilidad por revisar"}
                      </>
                    ) : module.key === "snack-packages" ? (
                      <>
                        Presentación #{String(i.presentation_id)} ·{" "}
                        {String(i.packs)} paquetes
                      </>
                    ) : (
                      <>
                        {String(
                          i.product_name || "Ingrediente #" + i.ingredient_id,
                        )}{" "}
                        · {String(i.quantity)}{" "}
                        {i.unit_price ? `× ${currency(i.unit_price)}` : ""}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {module.key === "snack-quotes" &&
            Array.isArray(detail.reviewed_items) && (
              <section>
                <h3>Selección aprobada para el pedido</h3>
                <ul>
                  {(detail.reviewed_items as RecordData[]).map(
                    (line, index) => (
                      <li key={index}>
                        {String(line.name)} · {String(line.packs)} paquetes de{" "}
                        {String(line.units)} unidades · {currency(line.price)}{" "}
                        por paquete · Subtotal {currency(line.subtotal)}
                      </li>
                    ),
                  )}
                </ul>
              </section>
            )}
          {Array.isArray(detail.payments) && (
            <>
              <h3>Pagos registrados</h3>
              {(detail.payments as RecordData[]).map((p) => (
                <p key={p.id}>
                  {currency(p.amount)} · {show(p.method)} ·{" "}
                  {String(p.reference || "Sin referencia")}
                </p>
              ))}
            </>
          )}
          {module.key === "orders" && (
            <>
              <h3>Avanzar pedido</h3>
              <p className="muted">
                Confirmar congela la receta y el costo. Iniciar producción
                consume stock una sola vez. Cancelar no devuelve ingredientes ya
                utilizados.
              </p>
              <div className="admin-actions">
                {(
                  {
                    pending: ["confirmed", "cancelled"],
                    confirmed: ["production", "cancelled"],
                    production: ["ready", "cancelled"],
                    ready: ["delivered", "cancelled"],
                  }[String(detail.status)] || []
                )
                  .filter(
                    (status) =>
                      user.role !== "production" ||
                      ["production", "ready"].includes(status),
                  )
                  .map((status) => (
                    <button
                      className={
                        status === "cancelled"
                          ? "danger-button"
                          : "admin-primary"
                      }
                      disabled={actionBusy}
                      key={status}
                      onClick={() => {
                        if (
                          status !== "cancelled" ||
                          confirm(
                            "¿Cancelar este pedido? Los pagos y consumos permanecerán en el historial.",
                          )
                        )
                          void action(
                            `/api/v1/admin/orders/${detail.id}/status`,
                            { status },
                          );
                      }}
                    >
                      {statuses[status]}
                    </button>
                  ))}
              </div>
              {sales.includes(user.role) &&
                detail.status !== "cancelled" &&
                Number(detail.balance) > 0 && (
                  <>
                    <h3>Registrar anticipo o saldo</h3>
                    <form
                      className="inline-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget);
                        void action(
                          `/api/v1/admin/orders/${detail.id}/payments`,
                          {
                            amount: data.get("amount"),
                            method: data.get("method"),
                            reference: data.get("reference"),
                            idempotency_key: crypto.randomUUID(),
                          },
                        );
                      }}
                    >
                      <input
                        type="number"
                        name="amount"
                        min="0.01"
                        max={String(detail.balance)}
                        step="0.01"
                        required
                        placeholder="Importe S/"
                        aria-label="Importe del pago"
                      />
                      <select name="method" aria-label="Medio de pago">
                        {["cash", "transfer", "yape", "plin", "card"].map(
                          (m) => (
                            <option key={m} value={m}>
                              {statuses[m] || m}
                            </option>
                          ),
                        )}
                      </select>
                      <input
                        name="reference"
                        placeholder="Referencia"
                        maxLength={150}
                        aria-label="Referencia de pago"
                      />
                      <button className="admin-primary" disabled={actionBusy}>
                        Registrar pago
                      </button>
                    </form>
                  </>
                )}
            </>
          )}
          {module.key === "quotes" &&
            ["quoted", "accepted"].includes(String(detail.status)) && (
              <QuoteConversion
                quote={detail}
                onConverted={() => {
                  setDetail(null);
                  void reload();
                }}
              />
            )}
          {module.key === "snack-quotes" && management.includes(user.role) && (
            <SnackQuoteConversion
              quote={detail}
              onConverted={() => {
                setDetail(null);
                void reload();
              }}
            />
          )}
          {module.key === "purchases" &&
            detail.status === "pending" &&
            management.includes(user.role) && (
              <button
                disabled={actionBusy}
                className="admin-primary"
                onClick={() =>
                  void action(`/api/v1/admin/purchases/${detail.id}/receive`)
                }
              >
                Recibir compra y añadir al inventario
              </button>
            )}
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
        </AdminDialog>
      )}
    </>
  );
}
