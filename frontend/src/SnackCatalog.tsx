import { useEffect, useRef, useState } from "react";
import { api, assetUrl } from "./api";
import { money } from "./catalog";
import { Tracking } from "./CustomerForms";
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
type SnackPackage = {
  id: number;
  name: string;
  description: string;
  items: Selection[];
};
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
  view = "all",
}: {
  preview?: boolean;
  view?: "all" | "catalog" | "table";
}) {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [packages, setPackages] = useState<SnackPackage[]>([]);
  const [planning, setPlanning] = useState<{
    whatsapp_number?: string;
    snack_min_per_guest?: string | null;
    snack_max_per_guest?: string | null;
  }>({});
  const [eventInfo, setEventInfo] = useState({
    celebration: "",
    date: "",
    guests: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [previewSelected, setPreviewSelected] = useState<Snack | null>(null);
  const [detailId, setDetailId] = useState(
    () =>
      Number(window.location.hash.match(/^#\/bocaditos\/(\d+)$/)?.[1]) || null,
  );
  const selected = preview
    ? previewSelected
    : snacks.find((snack) => snack.id === detailId) || null;
  function setSelected(snack: Snack | null) {
    if (preview) setPreviewSelected(snack);
    else
      window.location.assign(snack ? `#/bocaditos/${snack.id}` : "#/bocaditos");
  }
  useEffect(() => {
    const update = () =>
      setDetailId(
        Number(window.location.hash.match(/^#\/bocaditos\/(\d+)$/)?.[1]) ||
          null,
      );
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const [selection, setSelection] = useState<Selection[]>(() =>
    preview ? [] : readSelection(),
  );
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<number | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [sentSummary, setSentSummary] = useState("");
  const requestKey = useRef(crypto.randomUUID());
  const dialog = useRef<HTMLDialogElement>(null);
  const trackingDialog = useRef<HTMLDialogElement>(null);
  const [trackingVisible, setTrackingVisible] = useState(false);
  useEffect(() => {
    if (trackingVisible) trackingDialog.current?.showModal();
    else trackingDialog.current?.close();
  }, [trackingVisible]);
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
        try {
          const [settings, bundles] = await Promise.all([
            api<{
              whatsapp_number?: string;
              snack_min_per_guest?: string | null;
              snack_max_per_guest?: string | null;
            }>("/api/v1/settings", { signal: controller.signal }),
            api<SnackPackage[]>("/api/v1/snack-packages", {
              signal: controller.signal,
            }),
          ]);
          setPlanning(settings);
          setPackages(bundles);
        } catch {
          /* Individual catalog selections remain available if optional planning fails. */
        }
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
    if (selected && preview) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected, preview]);

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
  const validGuestCount =
    Number.isInteger(Number(eventInfo.guests)) &&
    Number(eventInfo.guests) > 0 &&
    Number(eventInfo.guests) <= 10000;
  const suggestion =
    validGuestCount &&
    planning.snack_min_per_guest &&
    planning.snack_max_per_guest
      ? [planning.snack_min_per_guest, planning.snack_max_per_guest].map(
          (value) =>
            Math.ceil(
              (Math.round(Number(value) * 100) * Number(eventInfo.guests)) /
                100,
            ),
        )
      : null;
  const presentablePackages = packages.filter((bundle) =>
    bundle.items.every((item) =>
      snacks.some((s) =>
        s.presentations.some((p) => p.id === item.presentation_id),
      ),
    ),
  );
  const summary = [
    "Hola, DelyJhos. Quisiera cotizar una mesa de bocaditos.",
    `Celebración: ${eventInfo.celebration || "Por coordinar"}`,
    `Fecha: ${eventInfo.date || "Por coordinar"}`,
    `Invitados: ${eventInfo.guests || "Por coordinar"}`,
    ...(["savory", "sweet"] as const).flatMap((kind) => [
      kind === "sweet" ? "Dulces:" : "Salados:",
      ...availableLines
        .filter((line) => line.snack.kind === kind)
        .map(
          (line) =>
            `${line.packs} paquete(s) de ${line.presentation.units} unidades: ${line.snack.name}`,
        ),
    ]),
    `Total: ${totalUnits} unidades.`,
    needsPrice
      ? "Precios y disponibilidad pendientes de confirmar."
      : `Subtotal de productos: ${money(knownSubtotal)}. Disponibilidad y entrega por confirmar.`,
  ].join("\n");
  function addPackage(bundle: SnackPackage) {
    const merged = new Map(
      selection.map((line) => [line.presentation_id, { ...line }]),
    );
    for (const item of bundle.items) {
      const packs = (merged.get(item.presentation_id)?.packs || 0) + item.packs;
      if (packs > 100) {
        setNotice(
          "El paquete supera el máximo de 100 paquetes por presentación. Revisa tu selección.",
        );
        return;
      }
      merged.set(item.presentation_id, {
        presentation_id: item.presentation_id,
        packs,
      });
    }
    setSelection([...merged.values()]);
    requestKey.current = crypto.randomUUID();
    setReceipt(null);
    setSentSummary("");
    setNotice(
      `${bundle.name} añadido a tu mesa. Puedes ajustar sus cantidades.`,
    );
  }
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
    setSentSummary("");
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
      const result = await api<{ id: number; tracking_token: string }>(
        "/api/v1/snack-quotes",
        {
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
        },
      );
      setReceipt(result.id);
      setTrackingCode(result.tracking_token);
      setSentSummary(
        summary +
          `\nPropuesta #${result.id} registrada; pendiente de revisión.`,
      );
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
  const detailContent = selected && (
    <>
      {photo(selected)}
      {selected.image_url ===
        "/media/snacks/mini-alfajores-de-chocolate.webp" && (
        <p className="snack-photo-credit">
          Foto referencial:{" "}
          <a
            href="https://www.pexels.com/photo/delicious-alfajores-being-dusted-with-cocoa-30699392/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Polat Eyyüp Albayrak / Pexels
          </a>
          . La presentación final se coordina con DelyJhos.
        </p>
      )}
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
              {p.price === null ? "Solicitar precio" : money(Number(p.price))}
            </span>
            <span>Añadir a mi mesa</span>
          </button>
        ))}
      </div>
    </>
  );
  if (selected && !preview)
    return (
      <section className="snack-detail-page">
        <nav className="breadcrumbs" aria-label="Ubicación">
          <a href="#/">Inicio</a>
          <span>›</span>
          <a href="#/bocaditos">Bocaditos</a>
          <span>›</span>
          <span>{selected.name}</span>
        </nav>
        <div className="snack-detail-layout">
          <h1>{selected.name}</h1>
          {detailContent}
        </div>
        <a className="text-button" href="#/bocaditos">
          ← Volver a nuestros bocaditos
        </a>
        <a className="button button-outline" href="#/arma-tu-mesa">
          Revisar mi mesa · {totalUnits} unidades
        </a>
      </section>
    );
  return (
    <section
      className={`snack-catalog snack-view-${view}`}
      id="bocaditos"
      aria-labelledby="snack-heading"
    >
      {preview && (
        <p className="snack-notice" role="status">
          Vista previa administrativa. Incluye borradores; no publica productos
          ni permite enviar cotizaciones.
        </p>
      )}
      {view !== "table" && (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">PEQUEÑOS DETALLES PARA COMPARTIR</p>
              <h2 id="snack-heading">Nuestros bocaditos</h2>
              <p>Dulces y salados para una mesa a tu medida.</p>
            </div>
            <a className="button button-outline" href="#/arma-tu-mesa">
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
          {presentablePackages.length > 0 && (
            <section
              className="snack-packages"
              aria-label="Paquetes de bocaditos"
            >
              <h3>Elige un paquete y hazlo tuyo</h3>
              <p>
                Puedes ajustar sus cantidades antes de solicitar la cotización.
              </p>
              <div className="snack-grid">
                {presentablePackages.map((bundle) => (
                  <article
                    className="snack-card snack-card-body"
                    key={bundle.id}
                  >
                    <h3>{bundle.name}</h3>
                    <p>{bundle.description}</p>
                    <ul>
                      {bundle.items.map((item) => {
                        const snack = snacks.find((s) =>
                          s.presentations.some(
                            (p) => p.id === item.presentation_id,
                          ),
                        );
                        const units = snack?.presentations.find(
                          (p) => p.id === item.presentation_id,
                        )?.units;
                        return (
                          <li key={item.presentation_id}>
                            {snack?.name} · {item.packs} paquetes de {units}{" "}
                            unidades
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      className="button button-outline"
                      onClick={() => addPackage(bundle)}
                    >
                      Añadir {bundle.name} a mi mesa
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {view === "table" &&
        availableLines.length === 0 &&
        !receipt &&
        !loading && (
          <div className="table-empty">
            <p className="eyebrow">UNA MESA PARA COMPARTIR</p>
            <h1>Arma tu mesa de bocaditos</h1>
            <p>
              Empieza eligiendo tus variedades favoritas y sus presentaciones.
              Después podrás ajustar las cantidades y enviarnos tu solicitud.
            </p>
            <a className="button button-primary" href="#/bocaditos">
              Elegir bocaditos →
            </a>
          </div>
        )}
      {view !== "catalog" &&
        (view !== "table" || availableLines.length > 0 || receipt) && (
          <section
            id="arma-tu-mesa"
            className="snack-builder"
            aria-labelledby="table-heading"
          >
            <div>
              <p className="eyebrow">TU CELEBRACIÓN, A TU GUSTO</p>
              <h2 id="table-heading">Arma tu mesa de bocaditos</h2>
              <p>
                Selecciona variedades y presentaciones. Revisaremos
                disponibilidad y precio contigo antes de confirmar el pedido.
              </p>
              <p className="sample-note">
                Tu selección se guarda en este navegador; tus datos personales
                no se guardan aquí.
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
                      <div
                        className="snack-selection"
                        key={line.presentation_id}
                      >
                        <div>
                          <strong>{line.snack.name}</strong>
                          <small>
                            {line.presentation.units} unidades por presentación
                            ·{" "}
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
                                (x) =>
                                  x.presentation_id !== line.presentation_id,
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
                  {new Set(availableLines.map((x) => x.snack.id)).size}{" "}
                  variedades
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
                <input
                  name="name"
                  required
                  maxLength={120}
                  autoComplete="name"
                />
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
                  value={eventInfo.celebration}
                  onChange={(e) =>
                    setEventInfo({ ...eventInfo, celebration: e.target.value })
                  }
                  required
                  maxLength={150}
                  placeholder="Cumpleaños, reunión familiar…"
                />
              </label>
              <div className="snack-form-pair">
                <label>
                  Fecha
                  <input
                    name="due_date"
                    type="date"
                    required
                    value={eventInfo.date}
                    onChange={(e) =>
                      setEventInfo({ ...eventInfo, date: e.target.value })
                    }
                  />
                </label>
                <label>
                  Invitados
                  <input
                    name="guests"
                    type="number"
                    required
                    min="1"
                    max="10000"
                    value={eventInfo.guests}
                    onChange={(e) =>
                      setEventInfo({ ...eventInfo, guests: e.target.value })
                    }
                  />
                </label>
              </div>
              {suggestion && (
                <p className="request-summary" role="status">
                  Guía orientativa del negocio: entre {suggestion[0]} y{" "}
                  {suggestion[1]} bocaditos para {eventInfo.guests} invitados.
                  Ajusta la selección según tu celebración; no cambia tus
                  cantidades automáticamente.
                </p>
              )}
              <label>
                Comentarios
                <textarea name="comments" maxLength={3000} rows={3} />
              </label>
              <button
                className="button"
                disabled={
                  preview ||
                  sending ||
                  !availableLines.length ||
                  missingLines > 0
                }
              >
                {sending ? "Enviando…" : "Solicitar cotización de mi mesa"}
              </button>
              {(availableLines.length > 0 || sentSummary) && !preview && (
                <div className="snack-share-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          availableLines.length ? summary : sentSummary,
                        );
                        setNotice("Resumen de tu mesa copiado.");
                      } catch {
                        setNotice(
                          "No se pudo copiar. Puedes revisar la selección en pantalla.",
                        );
                      }
                    }}
                  >
                    Copiar resumen de mi mesa
                  </button>
                  {planning.whatsapp_number && (
                    <a
                      className="text-button"
                      href={`https://wa.me/${planning.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(availableLines.length ? summary : sentSummary)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Compartir mi mesa por WhatsApp
                    </a>
                  )}
                </div>
              )}
              <small>
                La solicitud no realiza cobros ni reserva una fecha
                automáticamente.
              </small>
              {receipt && (
                <p role="status">
                  Recibimos tu propuesta #{receipt}. Te contactaremos para
                  revisar disponibilidad y precio.
                  <span className="tracking-code">
                    Guarda tu código privado para consultar esta propuesta:{" "}
                    <code>{trackingCode}</code>
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setTrackingVisible(true)}
                  >
                    Consultar esta propuesta
                  </button>
                </p>
              )}
            </form>
          </section>
        )}
      <dialog
        ref={trackingDialog}
        className="modal"
        aria-label="Seguimiento de mi propuesta"
        onCancel={() => setTrackingVisible(false)}
      >
        <div className="modal-heading">
          <h2>Mi propuesta de bocaditos</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Cerrar seguimiento"
            onClick={() => setTrackingVisible(false)}
          >
            ✕
          </button>
        </div>
        {trackingVisible && (
          <Tracking
            key={trackingCode}
            initialKind="table"
            initialToken={trackingCode}
          />
        )}
      </dialog>
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
        {detailContent}
      </dialog>
    </section>
  );
}
