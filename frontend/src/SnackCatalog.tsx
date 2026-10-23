import { useEffect, useRef, useState } from "react";
import { api, assetUrl } from "./api";
import { money } from "./catalog";
import "./SnackCatalog.css";

type Presentation = { id: number; units: number; price: string | null };
type Snack = {
  id: number;
  name: string;
  kind: "sweet" | "savory";
  description: string;
  image_url: string | null;
  is_available: boolean;
  presentations: Presentation[];
};
type Selection = { presentation_id: number; packs: number };
const storageKey = "delyjhos-snack-proposal-v1";

function readSelection(): Selection[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (x): x is Selection =>
          x &&
          Number.isInteger(x.presentation_id) &&
          Number.isInteger(x.packs) &&
          x.packs > 0 &&
          x.packs <= 100,
      )
      .slice(0, 93);
  } catch {
    return [];
  }
}

export default function SnackCatalog({
  preview = false,
}: {
  preview?: boolean;
}) {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [selected, setSelected] = useState<Snack | null>(null);
  const [selection, setSelection] = useState<Selection[]>(() =>
    preview ? [] : readSelection(),
  );
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<number | null>(null);
  const requestKey = useRef(crypto.randomUUID());
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        let rows: Snack[] = [];
        for (let offset = 0; ; offset += 100) {
          const page = await api<Snack[]>(
            `/api/v1/snacks${preview ? "/preview" : ""}?limit=100&offset=${offset}`,
            { signal: controller.signal },
          );
          rows = rows.concat(page);
          if (page.length < 100) break;
        }
        setSnacks(rows);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [preview]);
  useEffect(() => {
    if (!preview) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(selection));
      } catch {
        /* Selection remains usable without storage. */
      }
    }
  }, [selection, preview]);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);

  const availableLines = selection.flatMap((line) => {
    const snack = snacks.find((s) =>
      s.presentations.some((p) => p.id === line.presentation_id),
    );
    const presentation = snack?.presentations.find(
      (p) => p.id === line.presentation_id,
    );
    return snack && presentation ? [{ ...line, snack, presentation }] : [];
  });
  const missingLines = selection.length - availableLines.length;
  const totalUnits = availableLines.reduce(
    (sum, x) => sum + x.packs * x.presentation.units,
    0,
  );
  const knownSubtotal =
    availableLines.reduce(
      (sum, x) =>
        sum +
        (x.presentation.price === null
          ? 0
          : Math.round(Number(x.presentation.price) * 100) * x.packs),
      0,
    ) / 100;
  const needsPrice = availableLines.some((x) => x.presentation.price === null);
  function add(p: Presentation) {
    setSelection((old) => {
      const found = old.find((x) => x.presentation_id === p.id);
      return found
        ? old.map((x) =>
            x.presentation_id === p.id
              ? { ...x, packs: Math.min(100, x.packs + 1) }
              : x,
          )
        : [...old, { presentation_id: p.id, packs: 1 }];
    });
    setReceipt(null);
    requestKey.current = crypto.randomUUID();
    setNotice(`Presentación de ${p.units} unidades añadida a tu mesa.`);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || !availableLines.length || missingLines || sending) return;
    const form = new FormData(event.currentTarget);
    setSending(true);
    setError("");
    try {
      const result = await api<{ id: number }>("/api/v1/snack-quotes", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          celebration: form.get("celebration"),
          due_date: form.get("due_date"),
          guests: Number(form.get("guests")),
          comments: form.get("comments"),
          items: availableLines.map(({ presentation_id, packs }) => ({
            presentation_id,
            packs,
          })),
          request_key: requestKey.current,
        }),
      });
      setReceipt(result.id);
      setSelection([]);
      requestKey.current = crypto.randomUUID();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  const shown = snacks.filter(
    (s) =>
      (kind === "all" || s.kind === kind) &&
      s.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  const photo = (snack: Snack) =>
    snack.image_url ? (
      <img src={assetUrl(snack.image_url)} loading="lazy" alt={snack.name} />
    ) : (
      <div className="snack-photo-pending">
        <span aria-hidden="true">{snack.kind === "sweet" ? "✿" : "◇"}</span>
        <small>Fotografía por confirmar</small>
      </div>
    );
  return (
    <section
      className="snack-catalog"
      id="bocaditos"
      aria-labelledby="snack-heading"
    >
      {preview && (
        <p className="snack-notice" role="status">
          Vista previa administrativa. Incluye borradores; no publica productos
          ni permite enviar cotizaciones.
        </p>
      )}
      <div className="section-heading">
        <div>
          <p className="eyebrow">PEQUEÑOS DETALLES PARA COMPARTIR</p>
          <h2 id="snack-heading">Catálogo de bocaditos</h2>
          <p>Dulces y salados para una mesa a tu medida.</p>
        </div>
        <a className="button button-outline" href="#arma-tu-mesa">
          Arma tu mesa · {totalUnits} unidades
        </a>
      </div>
      <div className="snack-filters">
        <label>
          Buscar bocaditos
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Empanaditas, tartaletas…"
          />
        </label>
        <div role="group" aria-label="Tipo de bocaditos">
          {[
            ["all", "Todos"],
            ["savory", "Salados"],
            ["sweet", "Dulces"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {loading && <p role="status">Cargando bocaditos…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="snack-notice">
          {notice}
        </p>
      )}
      {!loading && !error && !shown.length && (
        <p className="empty-state">
          {snacks.length
            ? "No encontramos bocaditos con ese nombre."
            : "Estamos preparando nuestro catálogo de bocaditos. Pronto podrás elegir tus favoritos aquí."}
        </p>
      )}
      <div className="snack-grid">
        {shown.map((snack) => (
          <article key={snack.id} className="snack-card">
            <button
              className="snack-image"
              onClick={() => setSelected(snack)}
              aria-label={`Ver detalles de ${snack.name}`}
            >
              {photo(snack)}
            </button>
            <div className="snack-card-body">
              <p className="product-category">
                {snack.kind === "sweet"
                  ? "Bocaditos dulces"
                  : "Bocaditos salados"}
              </p>
              <h3>{snack.name}</h3>
              <p className="snack-availability">
                {snack.is_available
                  ? "Disponible previa coordinación"
                  : "Disponibilidad por confirmar"}
              </p>
              <div className="snack-presentations">
                {snack.presentations.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => add(p)}
                    aria-label={`Añadir ${p.units} unidades de ${snack.name}`}
                  >
                    <strong>{p.units} unidades</strong>
                    <span>
                      {p.price === null
                        ? "Solicitar precio"
                        : money(Number(p.price))}
                    </span>
                    <span aria-hidden="true">＋</span>
                  </button>
                ))}
              </div>
              <button
                className="text-button"
                onClick={() => setSelected(snack)}
              >
                Ver detalles →
              </button>
            </div>
          </article>
        ))}
      </div>
      <section
        id="arma-tu-mesa"
        className="snack-builder"
        aria-labelledby="table-heading"
      >
        <div>
          <p className="eyebrow">TU CELEBRACIÓN, A TU GUSTO</p>
          <h2 id="table-heading">Arma tu mesa de bocaditos</h2>
          <p>
            Selecciona variedades y presentaciones. Revisaremos disponibilidad y
            precio contigo antes de confirmar el pedido.
          </p>
          <p className="sample-note">
            Tu selección se guarda en este navegador; tus datos personales no se
            guardan aquí.
          </p>
          {missingLines > 0 && (
            <p role="alert">
              Algunas presentaciones guardadas ya no aparecen.{" "}
              <button
                className="text-button"
                onClick={() =>
                  setSelection(
                    availableLines.map(({ presentation_id, packs }) => ({
                      presentation_id,
                      packs,
                    })),
                  )
                }
              >
                Actualizar selección
              </button>
            </p>
          )}
          {(["savory", "sweet"] as const).map((group) => (
            <div key={group} className="snack-selection-group">
              <h3>{group === "sweet" ? "Dulces" : "Salados"}</h3>
              {availableLines
                .filter((x) => x.snack.kind === group)
                .map((line) => (
                  <div className="snack-selection" key={line.presentation_id}>
                    <div>
                      <strong>{line.snack.name}</strong>
                      <small>
                        {line.presentation.units} unidades por presentación ·{" "}
                        {line.presentation.price === null
                          ? "Precio por cotizar"
                          : money(Number(line.presentation.price))}
                      </small>
                    </div>
                    <label>
                      Paquetes
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={line.packs}
                        onChange={(e) => {
                          const packs = Number(e.target.value);
                          if (
                            Number.isInteger(packs) &&
                            packs >= 1 &&
                            packs <= 100
                          ) {
                            setSelection((old) =>
                              old.map((x) =>
                                x.presentation_id === line.presentation_id
                                  ? { ...x, packs }
                                  : x,
                              ),
                            );
                            requestKey.current = crypto.randomUUID();
                          }
                        }}
                      />
                    </label>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelection((old) =>
                          old.filter(
                            (x) => x.presentation_id !== line.presentation_id,
                          ),
                        );
                        requestKey.current = crypto.randomUUID();
                      }}
                      aria-label={`Quitar ${line.snack.name}, ${line.presentation.units} unidades`}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
            </div>
          ))}
          <p>
            <strong>
              {totalUnits} unidades ·{" "}
              {new Set(availableLines.map((x) => x.snack.id)).size} variedades
            </strong>
          </p>
          {availableLines.length > 0 && (
            <p>
              {needsPrice
                ? "Subtotal de presentaciones con precio confirmado"
                : "Subtotal referencial de la selección"}
              : {money(knownSubtotal)}
              {needsPrice &&
                ". Hay productos pendientes de cotizar; este no es el total."}
            </p>
          )}
        </div>
        <form className="snack-quote-form" onSubmit={submit}>
          <h3>Solicita tu propuesta</h3>
          <label>
            Nombre
            <input name="name" required maxLength={120} autoComplete="name" />
          </label>
          <label>
            Teléfono / WhatsApp
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
            Celebración
            <input
              name="celebration"
              required
              maxLength={150}
              placeholder="Cumpleaños, reunión familiar…"
            />
          </label>
          <div className="snack-form-pair">
            <label>
              Fecha
              <input name="due_date" type="date" required />
            </label>
            <label>
              Invitados
              <input name="guests" type="number" required min="1" max="10000" />
            </label>
          </div>
          <label>
            Comentarios
            <textarea name="comments" maxLength={3000} rows={3} />
          </label>
          <button
            className="button"
            disabled={
              preview || sending || !availableLines.length || missingLines > 0
            }
          >
            {sending ? "Enviando…" : "Solicitar cotización de mi mesa"}
          </button>
          <small>
            La solicitud no realiza cobros ni reserva una fecha automáticamente.
          </small>
          {receipt && (
            <p role="status">
              Recibimos tu propuesta #{receipt}. Te contactaremos para revisar
              disponibilidad y precio.
            </p>
          )}
        </form>
      </section>
      <dialog
        ref={dialog}
        className="modal snack-detail"
        onCancel={() => setSelected(null)}
      >
        <div className="modal-heading">
          <h2>{selected?.name}</h2>
          <button
            className="icon-button"
            onClick={() => setSelected(null)}
            aria-label="Cerrar detalle de bocadito"
          >
            ✕
          </button>
        </div>
        {selected && (
          <>
            {photo(selected)}
            <p>
              {selected.description ||
                "Cuéntanos tu ocasión y coordinaremos los detalles de esta especialidad contigo."}
            </p>
            <p>
              {selected.is_available
                ? "Disponible previa coordinación."
                : "Confirmaremos disponibilidad al revisar tu propuesta."}
            </p>
            <div className="snack-presentations">
              {selected.presentations.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    add(p);
                    setSelected(null);
                  }}
                >
                  <strong>{p.units} unidades</strong>
                  <span>
                    {p.price === null
                      ? "Solicitar precio"
                      : money(Number(p.price))}
                  </span>
                  <span>Añadir a mi mesa</span>
                </button>
              ))}
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
