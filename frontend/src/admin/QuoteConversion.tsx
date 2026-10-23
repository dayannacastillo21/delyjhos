import { useEffect, useState } from "react";
import { api } from "../api";
import type { RecordData } from "../api";
export default function QuoteConversion({
  quote,
  onConverted,
}: {
  quote: RecordData;
  onConverted: () => void;
}) {
  const [products, setProducts] = useState<RecordData[]>([]);
  const [result, setResult] = useState<{
    id: number;
    tracking_token: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<RecordData[]>("/api/v1/admin/products?limit=200")
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, []);
  if (quote.order_id) return <p>Pedido asociado: #{String(quote.order_id)}</p>;
  if (result)
    return (
      <div className="order-success" role="status">
        <h3>Pedido #{result.id} creado</h3>
        <p>Comparte este código de seguimiento únicamente con el cliente:</p>
        <code className="tracking-code">{result.tracking_token}</code>
        <button onClick={onConverted}>Terminar</button>
      </div>
    );
  return (
    <>
      <h3>Convertir cotización en pedido</h3>
      <p className="muted">
        Elige el producto cuya receta representa la torta completa con el tamaño
        cotizado. El pedido usará el precio aprobado de esta cotización.
      </p>
      <form
        className="inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const data = new FormData(e.currentTarget);
          try {
            setResult(
              await api(`/api/v1/admin/quotes/${quote.id}/convert`, {
                method: "POST",
                body: JSON.stringify({
                  product_id: Number(data.get("product_id")),
                  quantity: 1,
                }),
              }),
            );
            setError("");
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <select
          name="product_id"
          aria-label="Producto base para cotización"
          required
        >
          <option value="">Producto con la receta adecuada…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {String(p.name)}
            </option>
          ))}
        </select>
        <button className="admin-primary" disabled={busy}>
          {busy ? "Creando…" : "Crear pedido con precio cotizado"}
        </button>
      </form>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
