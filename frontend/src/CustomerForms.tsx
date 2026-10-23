import { useRef, useState } from "react";
import { api, assetUrl } from "./api";
import type { Work } from "./workTypes";
import type { Product } from "./catalog";
import { money } from "./catalog";
import { statuses } from "./admin/modules";
const today = () => new Date().toLocaleDateString("en-CA");

export function Checkout({
  products,
  onSuccess,
}: {
  products: Product[];
  onSuccess: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    id: number;
    total: string;
    tracking_token: string;
  } | null>(null);
  const key = useRef(crypto.randomUUID());
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      setResult(
        await api("/api/v1/orders/", {
          method: "POST",
          body: JSON.stringify({
            customer: {
              name: data.get("name"),
              phone: data.get("phone"),
              email: data.get("email") || null,
            },
            due_date: data.get("due_date"),
            notes: data.get("notes") || "",
            items: products.map((p) => ({
              product_id: p.id,
              quantity: quantities[p.id] || 1,
            })),
            request_key: key.current,
          }),
        }),
      );
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="order-success" role="status">
        <h3>Recibimos tu pedido #{result.id}</h3>
        <p>
          Importe del catálogo: {money(Number(result.total))}. La fecha y
          personalización requieren confirmación del negocio.
        </p>
        <p>
          <strong>Guarda tu código privado de seguimiento:</strong>
        </p>
        <code className="tracking-code">{result.tracking_token}</code>
        <p>
          No compartas este código públicamente. Puedes consultarlo en «Seguir
          mi pedido».
        </p>
        <button
          className="button button-outline"
          onClick={() =>
            void navigator.clipboard
              .writeText(result.tracking_token)
              .catch(() => setError("Selecciona y copia el código manualmente"))
          }
        >
          Copiar código
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  return (
    <form className="custom-form checkout-form" onSubmit={submit}>
      <h3>Solicitar este pedido</h3>
      <p className="dialog-note">
        No se realiza ningún cobro online. Confirmaremos la disponibilidad y los
        detalles antes de elaborar tu pedido.
      </p>
      {products.map((p) => (
        <label className="quantity-label" key={p.id}>
          {p.name}
          <input
            aria-label={`Cantidad de ${p.name}`}
            type="number"
            min={1}
            max={1000}
            step={1}
            value={quantities[p.id] || 1}
            onChange={(e) =>
              setQuantities({
                ...quantities,
                [p.id]: Number(e.target.value) || 1,
              })
            }
          />
        </label>
      ))}
      <p className="detail-price">
        {money(
          products.reduce(
            (sum, p) => sum + p.price * (quantities[p.id] || 1),
            0,
          ),
        )}
      </p>
      <label>
        Tu nombre
        <input
          name="name"
          required
          minLength={1}
          maxLength={120}
          autoComplete="name"
        />
      </label>
      <div className="form-row">
        <label>
          Teléfono
          <input
            name="phone"
            type="tel"
            required
            minLength={6}
            maxLength={30}
            autoComplete="tel"
          />
        </label>
        <label>
          Correo (opcional)
          <input name="email" type="email" autoComplete="email" />
        </label>
      </div>
      <label>
        Fecha solicitada
        <input type="date" name="due_date" min={today()} required />
      </label>
      <label>
        Personalización, entrega y notas
        <textarea name="notes" maxLength={3000} rows={3} />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-primary full-width" disabled={busy}>
        {busy ? "Enviando…" : "Enviar solicitud de pedido"}
      </button>
    </form>
  );
}

export function CustomQuote({
  referenceWork,
}: {
  referenceWork?: Work | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: number } | null>(null);
  const key = useRef(crypto.randomUUID());
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      let image: string | null = null;
      const file = data.get("image");
      if (file instanceof File && file.size) {
        if (file.size > 5 * 1024 * 1024)
          throw new Error("La imagen no debe superar 5 MB");
        const form = new FormData();
        form.append("file", file);
        image = (
          await api<{ url: string }>("/api/v1/uploads", {
            method: "POST",
            body: form,
          })
        ).url;
      }
      setResult(
        await api("/api/v1/quotes/", {
          method: "POST",
          body: JSON.stringify({
            name: data.get("name"),
            phone: data.get("phone"),
            theme: data.get("theme"),
            portions: Number(data.get("portions")),
            flavor: data.get("flavor"),
            filling: data.get("filling") || "Por coordinar",
            decoration: data.get("decoration") || "",
            due_date: data.get("due_date"),
            reference_image: image,
            reference_work_id: referenceWork?.id || null,
            celebration: data.get("celebration") || "",
            preferred_colors: data.get("preferred_colors") || "",
            cake_message: data.get("cake_message") || "",
            comments: data.get("comments") || "",
            request_key: key.current,
          }),
        }),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="order-success" role="status">
        <h3>Solicitud #{result.id} recibida</h3>
        <p>
          Tu idea ya está registrada. El negocio revisará tu temática,
          disponibilidad y precio antes de confirmar.
        </p>
      </div>
    );
  return (
    <form className="custom-form" onSubmit={submit}>
      {referenceWork && (
        <div className="quote-work-reference">
          <img
            src={assetUrl(referenceWork.poster_url)}
            alt={referenceWork.title}
          />
          <div>
            <strong>Tu inspiración</strong>
            <p>{referenceWork.title}</p>
            <a
              href={assetUrl(referenceWork.video_url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver video de referencia
            </a>
            <p>Guardaremos este trabajo junto con tu solicitud.</p>
          </div>
        </div>
      )}
      <p className="dialog-note">
        Cuéntanos tu idea para recibir una cotización personalizada. No se
        realiza ningún cobro.
      </p>
      <label>
        Tu nombre
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <label>
        Teléfono de contacto
        <input
          name="phone"
          type="tel"
          required
          minLength={6}
          maxLength={30}
          autoComplete="tel"
        />
      </label>
      <label>
        Tipo de celebración
        <select
          name="celebration"
          defaultValue={referenceWork?.occasion || "Por coordinar"}
        >
          {[
            ...new Set(
              [
                referenceWork?.occasion,
                "Cumpleaños",
                "Bautizo",
                "Matrimonio",
                "Quinceañero",
                "Reunión familiar",
                "Otro",
                "Por coordinar",
              ].filter((x): x is string => Boolean(x)),
            ),
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        Temática o celebración
        <input
          name="theme"
          required
          maxLength={150}
          placeholder="Ej. flores rosadas"
          defaultValue={referenceWork?.title.slice(0, 150) || ""}
        />
      </label>
      <div className="form-row">
        <label>
          Porciones
          <input
            name="portions"
            type="number"
            min={1}
            max={1000}
            required
            defaultValue={20}
          />
        </label>
        <label>
          Fecha solicitada
          <input name="due_date" type="date" min={today()} required />
        </label>
      </div>
      <div className="form-row">
        <label>
          Sabor
          <select name="flavor">
            <option>Chocolate</option>
            <option>Vainilla</option>
            <option>Por coordinar</option>
          </select>
        </label>
        <label>
          Relleno
          <input name="filling" maxLength={100} placeholder="Por coordinar" />
        </label>
      </div>
      <label>
        Decoración y detalles
        <textarea
          name="decoration"
          rows={3}
          maxLength={500}
          placeholder="Colores, acabado, necesidades alimentarias…"
        />
      </label>
      <label>
        Colores preferidos
        <input
          name="preferred_colors"
          maxLength={150}
          placeholder="Ej. lila y blanco"
        />
      </label>
      <label>
        Nombre o mensaje para la torta
        <input name="cake_message" maxLength={150} />
      </label>
      <label>
        Comentarios adicionales
        <textarea name="comments" maxLength={3000} rows={3} />
      </label>
      <label>
        Imagen de referencia (opcional)
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
        />
        <small>
          JPG, PNG o WebP, hasta 5 MB. Carga solo diseños, sin datos personales.
        </small>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-primary full-width" disabled={busy}>
        {busy ? "Enviando…" : "Solicitar cotización"}
      </button>
    </form>
  );
}

export function Tracking() {
  const [result, setResult] = useState<{
    id: number;
    status: string;
    due_date: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="custom-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const data = new FormData(e.currentTarget);
        try {
          setResult(
            await api("/api/v1/tracking", {
              method: "POST",
              body: JSON.stringify({ token: String(data.get("token")).trim() }),
            }),
          );
        } catch (err) {
          setResult(null);
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Código privado de seguimiento
        <input
          name="token"
          minLength={20}
          maxLength={100}
          required
          placeholder="Pega el código que recibiste"
          autoComplete="off"
        />
      </label>
      <button className="button button-primary" disabled={busy}>
        {busy ? "Consultando…" : "Consultar pedido"}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="order-success" role="status">
          <h3>Pedido #{result.id}</h3>
          <p>
            Estado: <strong>{statuses[result.status] || result.status}</strong>
          </p>
          <p>Fecha solicitada: {result.due_date}</p>
        </div>
      )}
    </form>
  );
}
