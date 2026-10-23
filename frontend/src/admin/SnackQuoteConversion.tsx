import { useEffect, useState } from "react";
import { api } from "../api";
import type { RecordData } from "../api";
import { currency } from "./modules";

type ReviewedLine = {
  presentation_id: number;
  name: string;
  units: number;
  packs: number;
  product_id: string;
  unit_price: string;
};

export default function SnackQuoteConversion({
  quote,
  onConverted,
}: {
  quote: RecordData;
  onConverted: () => void;
}) {
  const [products, setProducts] = useState<RecordData[]>([]);
  const [lines, setLines] = useState<ReviewedLine[]>(() =>
    (quote.items as RecordData[]).map((x) => ({
      presentation_id: Number(x.presentation_id),
      name: String(x.name),
      units: Number(x.units),
      packs: Number(x.packs),
      product_id: "",
      unit_price: x.price === null ? "" : String(x.price),
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [result, setResult] = useState<{
    id: number;
    tracking_token: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<RecordData[]>("/api/v1/admin/products?limit=200", {
        signal: controller.signal,
      }),
      api<RecordData[]>("/api/v1/admin/snack-presentations?limit=200", {
        signal: controller.signal,
      }),
    ])
      .then(([rows, presentations]) => {
        setProducts(rows.filter((x) => x.is_active));
        setLines((old) =>
          old.map((x) => ({
            ...x,
            product_id: String(
              presentations.find((p) => Number(p.id) === x.presentation_id)
                ?.production_product_id || "",
            ),
          })),
        );
        setLoaded(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  if (quote.order_id) return <p>Pedido asociado: #{String(quote.order_id)}</p>;
  if (result)
    return (
      <div className="order-success" role="status">
        <h3>Pedido #{result.id} creado</h3>
        <p>Comparte el código privado únicamente con el cliente:</p>
        <code className="tracking-code">{result.tracking_token}</code>
        <button onClick={onConverted}>Terminar</button>
      </div>
    );
  if (quote.status !== "accepted")
    return (
      <p>
        Revisa el precio total y registra la aceptación del cliente para
        convertir esta mesa en pedido.
      </p>
    );
  const subtotal = lines.reduce(
    (sum, x) => sum + Math.round(Number(x.unit_price || 0) * 100) * x.packs,
    0,
  );
  const accepted = Math.round(Number(quote.quoted_price) * 100);
  const update = (index: number, value: Partial<ReviewedLine>) =>
    setLines((old) =>
      old.map((x, i) => (i === index ? { ...x, ...value } : x)),
    );
  return (
    <section>
      <h3>Convertir mesa aceptada en pedido</h3>
      <p className="muted">
        Revisa cada paquete. El producto y su receta deben representar una
        presentación completa de la cantidad indicada. Los precios de 2025 no se
        utilizan.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            setResult(
              await api(`/api/v1/admin/snack-quotes/${quote.id}/convert`, {
                method: "POST",
                body: JSON.stringify({
                  availability_confirmed: true,
                  items: lines.map((x) => ({
                    presentation_id: x.presentation_id,
                    product_id: Number(x.product_id),
                    packs: x.packs,
                    unit_price: x.unit_price,
                  })),
                }),
              }),
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {lines.map((line, index) => (
          <fieldset key={line.presentation_id} className="snack-review-line">
            <legend>
              {line.name} · {line.units} unidades por paquete
            </legend>
            <div className="admin-fields">
              <label>
                Producto con receta para {line.units} unidades
                <select
                  aria-label={`Producto para ${line.name}, ${line.units} unidades`}
                  value={line.product_id}
                  required
                  onChange={(e) =>
                    update(index, { product_id: e.target.value })
                  }
                >
                  <option value="">
                    Selecciona el producto de producción…
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {String(product.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Paquetes
                <input
                  aria-label={`Paquetes de ${line.name}, ${line.units} unidades`}
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={line.packs}
                  onChange={(e) =>
                    update(index, { packs: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Precio aprobado por paquete (S/)
                <input
                  aria-label={`Precio por paquete de ${line.name}, ${line.units} unidades`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={line.unit_price}
                  onChange={(e) =>
                    update(index, { unit_price: e.target.value })
                  }
                />
              </label>
            </div>
            <p>
              {line.packs * line.units} unidades · Subtotal{" "}
              {currency(
                (Math.round(Number(line.unit_price || 0) * 100) * line.packs) /
                  100,
              )}
            </p>
          </fieldset>
        ))}
        <p>
          Desglose: <strong>{currency(subtotal / 100)}</strong> · Total
          aceptado: <strong>{currency(accepted / 100)}</strong>
        </p>
        {subtotal !== accepted && (
          <p className="admin-error">
            El desglose debe coincidir con el total aceptado antes de crear el
            pedido.
          </p>
        )}
        <label className="snack-review-confirm">
          <input type="checkbox" required />
          Confirmo disponibilidad, cantidades aceptadas y recetas
          correspondientes a cada presentación completa.
        </label>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        <button
          className="admin-primary"
          disabled={busy || !loaded || subtotal !== accepted}
        >
          {busy ? "Creando…" : "Crear pedido de bocaditos"}
        </button>
      </form>
    </section>
  );
}
