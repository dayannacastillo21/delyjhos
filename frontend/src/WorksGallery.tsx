import { useEffect, useId, useRef, useState } from "react";
import { api, assetUrl } from "./api";
import type { Work } from "./workTypes";
import "./WorksGallery.css";

export default function WorksGallery({
  onQuote,
}: {
  onQuote: (work: Work) => void;
}) {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [occasion, setOccasion] = useState("Todas");
  const [selected, setSelected] = useState<Work | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [playError, setPlayError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        let records: Work[] = [];
        for (let offset = 0; ; offset += 100) {
          const page = await api<Work[]>(
            `/api/v1/works?limit=100&offset=${offset}`,
            { signal: controller.signal },
          );
          records = records.concat(page);
          if (page.length < 100) break;
        }
        setWorks(records);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  function open(work: Work, showVideo: boolean) {
    setImage(showVideo ? null : work.poster_url);
    setPlayError(false);
    setSelected(work);
  }
  const shown = works.filter(
    (w) => occasion === "Todas" || w.occasion === occasion,
  );
  return (
    <section
      className="works-section"
      id="nuestros-trabajos"
      aria-labelledby="works-heading"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">CREACIONES DE NUESTRA FAMILIA</p>
          <h2 id="works-heading">Momentos que endulzamos</h2>
          <p>
            Trabajos reales de DelyJhos. Encuentra una idea para tu próxima
            celebración.
          </p>
        </div>
        <span className="works-caption">
          Cada torta tiene su propia historia.
        </span>
      </div>
      {loading && <p role="status">Cargando nuestros trabajos…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && works.length === 0 && (
        <p>Estamos preparando nuevas historias para compartir contigo.</p>
      )}
      {works.length > 0 && (
        <div
          className="works-filters"
          role="group"
          aria-label="Filtrar trabajos por celebración"
        >
          {[
            "Todas",
            ...new Set(works.map((w) => w.occasion).filter(Boolean)),
          ].map((value) => (
            <button
              key={value}
              aria-pressed={occasion === value}
              onClick={() => setOccasion(value)}
            >
              {value}
            </button>
          ))}
        </div>
      )}
      <div className="works-grid">
        {shown.map((work) => (
          <article key={work.id} className="work-card">
            <button
              className="work-poster"
              onClick={() => open(work, true)}
              aria-label={`Ver video de ${work.title}`}
            >
              <img
                src={assetUrl(work.poster_url)}
                alt={work.title}
                width={work.width}
                height={work.height}
                loading="lazy"
                decoding="async"
              />
              <span className="work-play">
                <span aria-hidden="true">▶</span> Ver video
              </span>
              <span className="work-duration">
                {Math.ceil(Number(work.duration))} s
              </span>
            </button>
            <div className="work-body">
              <p className="product-category">{work.occasion}</p>
              <h3>{work.title}</h3>
              <p>{work.description}</p>
              <button className="text-button" onClick={() => open(work, false)}>
                Ver fotografías y ampliar →
              </button>
              <button
                className="button button-primary"
                onClick={() => onQuote(work)}
              >
                Quiero una torta similar
              </button>
            </div>
          </article>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="modal work-dialog"
        aria-labelledby={titleId}
        onCancel={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}
      >
        <div className="modal-heading">
          <h2 id={titleId}>{selected?.title}</h2>
          <button
            className="icon-button"
            onClick={() => setSelected(null)}
            aria-label="Cerrar trabajo"
          >
            ✕
          </button>
        </div>
        {selected && (
          <div className="work-detail-layout">
            <div className="work-player">
              {image ? (
                <img
                  src={assetUrl(image)}
                  alt={selected.title + ": fotografía ampliada"}
                />
              ) : (
                <>
                  <video
                    key={selected.video_url}
                    src={assetUrl(selected.video_url)}
                    poster={assetUrl(selected.poster_url)}
                    controls
                    playsInline
                    preload="none"
                    onError={() => setPlayError(true)}
                    aria-label={selected.title + ": video del trabajo real"}
                  />
                  {playError && (
                    <p role="alert">
                      No se pudo reproducir este video. Puedes ver sus
                      fotografías o solicitar una torta similar.
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="work-detail-info">
              <p>{selected.description}</p>
              <p className="dialog-note">
                El tamaño, los ingredientes, la disponibilidad y el precio de
                una nueva torta se confirman al cotizar.
              </p>
              <div
                className="work-thumbnails"
                role="group"
                aria-label="Elegir video o fotografía"
              >
                <button
                  aria-pressed={!image}
                  onClick={() => {
                    setImage(null);
                    setPlayError(false);
                  }}
                >
                  ▶ Video
                </button>
                {[selected.poster_url, ...selected.gallery].map(
                  (url, index) => (
                    <button
                      key={url}
                      aria-pressed={image === url}
                      onClick={() => setImage(url)}
                      aria-label={`Ver fotografía ${index + 1} de ${selected.title}`}
                    >
                      <img src={assetUrl(url)} alt="" loading="lazy" />
                    </button>
                  ),
                )}
              </div>
              <button
                className="button button-primary"
                onClick={() => {
                  setSelected(null);
                  onQuote(selected);
                }}
              >
                Quiero una torta similar
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
