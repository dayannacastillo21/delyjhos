import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { money } from "./catalog";
import { api } from "./api";
import { Checkout, CustomQuote, Tracking } from "./CustomerForms";
import type { Product } from "./catalog";
import "./App.css";
import ProductGallery from "./ProductGallery";
import SnackCatalog from "./SnackCatalog";
import WorksGallery from "./WorksGallery";
import type { Work } from "./workTypes";
import "./Storefront.css";
import AboutPage from "./AboutPage";
import "./HeaderFooter.css";
import HomePage from "./HomePage";
import "./design/StorefrontTheme.css";

const pages = [
  "inicio",
  "tortas",
  "bocaditos",
  "arma-tu-mesa",
  "personaliza",
  "nosotros",
  "contacto",
] as const;
type Page = (typeof pages)[number];
const pageLabels: Record<Page, string> = {
  inicio: "Inicio",
  tortas: "Tortas",
  bocaditos: "Bocaditos",
  "arma-tu-mesa": "Arma tu mesa",
  personaliza: "Personaliza tu torta",
  nosotros: "Nosotros",
  contacto: "Contacto",
};

function currentPage(): Page {
  const path = window.location.hash.replace(/^#\/?/, "").split("/")[0];
  if (path === "productos" || path === "nuestros-trabajos") return "tortas";
  return pages.includes(path as Page) ? (path as Page) : "inicio";
}

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    bag: (
      <>
        <path d="M5 7h14l1 14H4L5 7Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />,
    truck: (
      <>
        <path d="M2 4h12v13H2zM14 9h4l4 5v3h-8" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="18" r="3" />
      </>
    ),
    cake: (
      <>
        <path d="M3 13h18v8H3zM5 13V9h14v4M12 5v4M8 5v4M16 5v4M3 16q3 4 6 0 3 4 6 0 3 4 6 0" />
        <path d="m12 2 .1.1M8 2l.1.1M16 2l.1.1" />
      </>
    ),
    edit: (
      <>
        <path d="m16 3 5 5L8 21H3v-5L16 3ZM13 6l5 5" />
      </>
    ),
    chat: (
      <>
        <path d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5Z" />
        <path d="M8 7c0 5 3 8 8 8" />
      </>
    ),
    arrow: <path d="M3 12h18m-6-6 6 6-6 6" />,
    close: <path d="m5 5 14 14M19 5 5 19" />,
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.heart}
    </svg>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="modal"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar ventana"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function App() {
  const [page, setPage] = useState<Page>(currentPage);
  const [productId, setProductId] = useState(
    () => Number(window.location.hash.match(/^#\/tortas\/(\d+)$/)?.[1]) || null,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const change = () => {
      if (/^#\/?nuestros-trabajos\/?$/.test(window.location.hash)) {
        window.history.replaceState(null, "", "#/tortas");
      }
      const next = currentPage();
      setPage(next);
      setProductId(
        Number(window.location.hash.match(/^#\/tortas\/(\d+)$/)?.[1]) || null,
      );
      setMenuOpen(false);

      window.scrollTo({ top: 0, behavior: "instant" });
      requestAnimationFrame(() =>
        mainRef.current?.focus({ preventScroll: true }),
      );
    };
    change();
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.title = `${page === "inicio" ? "Pastelería fina" : pageLabels[page]} | DelyJhos`;
  }, [page]);
  function navigate(next: Page) {
    window.location.hash = `/${next === "inicio" ? "" : next}`;
  }
  const [searchRequest, setSearchRequest] = useState(0);

  const [bag, setBag] = useState<number[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [referenceWork, setReferenceWork] = useState<Work | null>(null);
  const [notice, setNotice] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const selected = products.find((product) => product.id === productId) || null;
  const setSelected = (product: Product | null) => {
    window.location.hash = product ? `/tortas/${product.id}` : "/tortas";
  };
  const [catalogError, setCatalogError] = useState("");
  const [loading, setLoading] = useState(true);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    type CategoryRow = { id: number; name: string };
    type ProductRow = {
      id: number;
      name: string;
      slug: string;
      category_id: number;
      price: string;
      description: string;
      image_url: string | null;
    };
    async function load() {
      try {
        const cats = await api<CategoryRow[]>("/api/v1/categories/", {
          signal: controller.signal,
        });
        let records: ProductRow[] = [];
        let offset = 0;
        while (true) {
          const page = await api<ProductRow[]>(
            `/api/v1/products/?limit=100&offset=${offset}`,
            { signal: controller.signal },
          );
          records = records.concat(page);
          if (page.length < 100) break;
          offset += 100;
        }
        const photos: Record<string, number> = {
          "torta-unicornio": 0,
          "torta-chocolate": 1,
          "bocaditos-variados": 2,
          "cupcakes-decorados": 3,
          "galletas-decoradas": 4,
          "empanadas-pollo": 5,
        };
        if (controller.signal.aborted) return;
        setProducts(
          records.map((p) => ({
            id: p.id,
            name: p.name,
            category:
              cats.find((c) => c.id === p.category_id)?.name ||
              "Especialidades",
            price: Number(p.price),
            description: p.description,
            photo: photos[p.slug] ?? -1,
            image_url: p.image_url,
          })),
        );
      } catch (error) {
        if (!controller.signal.aborted)
          setCatalogError((error as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    api<{ whatsapp_number: string; demo_catalog: boolean }>(
      "/api/v1/settings",
      { signal: controller.signal },
    )
      .then((s) => {
        setWhatsapp(s.whatsapp_number);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const chosen = products.filter((p) => bag.includes(p.id));

  function addProduct(product: Product) {
    setBag((current) =>
      current.includes(product.id) ? current : [...current, product.id],
    );
    setNotice(`${product.name} está en tu lista para cotizar.`);
    setSelected(null);
  }

  return (
    <div className={`storefront page-${page}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#/" aria-label="DelyJhos, inicio">
            <span className="logo-picture" />
            <span className="header-brand-copy"><strong>DelyJhos</strong><small>PASTELERÍA FINA</small></span>
          </a>
          <button
            className="icon-button mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-controls="store-navigation"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
            <span className="menu-button-label">Menú</span>
          </button>
          <nav
            className={menuOpen ? "navigation is-open" : "navigation"}
            aria-label="Navegación principal"
            id="store-navigation"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenuOpen(false);
                document
                  .querySelector<HTMLButtonElement>(".mobile-toggle")
                  ?.focus();
              }
            }}
          >
            {pages.map((entry) => (
              <a
                key={entry}
                href={`#/${entry === "inicio" ? "" : entry}`}
                className={page === entry ? "active" : undefined}
                aria-current={page === entry ? "page" : undefined}
                onClick={() => {
                  setMenuOpen(false);
                }}
              >
                {pageLabels[entry]}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => {
                navigate("tortas");
                setSearchRequest(value => value + 1);
              }}
              aria-label="Buscar productos"
            >
              <Icon name="search" />
            </button>
            <button
              className="icon-button bag-button"
              onClick={() => setBagOpen(true)}
              aria-label={`Abrir lista para cotizar, ${bag.length} productos`}
            >
              <Icon name="bag" />
              <span className="bag-count">{bag.length}</span>
            </button>
            <button
              className="button button-primary order-button"
              onClick={() => setBagOpen(true)}
            >
              <Icon name="chat" size={19} /> Haz tu pedido
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {page === "inicio" && <HomePage onCustomize={() => setCustomOpen(true)} />}
        <div className="page-content">
          {page === "tortas" &&
            productId &&
            (selected ? (
              <section className="cake-detail" aria-labelledby="cake-title">
                <nav className="breadcrumbs" aria-label="Ubicación">
                  <a href="#/">Inicio</a>
                  <span>›</span>
                  <a href="#/tortas">Tortas</a>
                  <span>›</span>
                  <span>{selected.name}</span>
                </nav>
                <div className="cake-detail-grid">
                  <div className="cake-detail-images">
                    <ProductGallery key={selected.id} product={selected} />
                  </div>
                  <div className="cake-detail-copy">
                    <p className="eyebrow">HECHA PARA TU CELEBRACIÓN</p>
                    <h1 id="cake-title">{selected.name}</h1>
                    <p>{selected.description}</p>
                    <span className="detail-tag">{selected.category}</span>
                    <ul className="detail-values">
                      <li>
                        <Icon name="edit" />
                        Diseño personalizado
                      </li>
                      <li>
                        <Icon name="heart" />
                        Elaboración artesanal
                      </li>
                      <li>
                        <Icon name="cake" />
                        Porciones a tu medida
                      </li>
                      <li>
                        <Icon name="chat" />
                        Atención para tu evento
                      </li>
                    </ul>
                    <p className="detail-price">
                      {money(selected.price)} <small>Precio referencial</small>
                    </p>
                    <button
                      className="button button-primary full-width"
                      onClick={() => {
                        setQuoteProduct(selected);
                        setCustomOpen(true);
                      }}
                    >
                      Quiero una torta similar <Icon name="arrow" size={18} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() => addProduct(selected)}
                    >
                      Añadir a mi lista para cotizar
                    </button>
                    <p className="dialog-note">
                      Coordinamos tamaño, relleno, decoración y disponibilidad
                      antes de confirmar. Consulta ingredientes y alérgenos.
                    </p>
                  </div>
                </div>
                <a className="text-button" href="#/tortas">
                  ← Volver a nuestras tortas
                </a>
              </section>
            ) : (
              <div className="empty-state">
                <h1>
                  {loading ? "Cargando torta…" : catalogError ? "No pudimos cargar esta torta" : "No encontramos esta torta"}
                </h1>
                <a href="#/tortas">Volver al catálogo</a>
              </div>
            ))}

          {(page === "bocaditos" || page === "arma-tu-mesa") && (
            <SnackCatalog
              view={page === "arma-tu-mesa" ? "table" : "catalog"}
            />
          )}
          {page === "personaliza" && (
            <section className="standalone-form commission-page">
              <div className="commission-intro"><p className="eyebrow">DISEÑADA ALREDEDOR DE TI</p><h1>Tu idea,<br /><em>nuestra próxima torta.</em></h1><p>Cuéntanos qué hace especial tu celebración. Revisaremos tu idea, la fecha y las porciones para preparar una propuesta contigo.</p><ol><li><span>01</span>Comparte tu inspiración</li><li><span>02</span>Coordinamos los detalles</li><li><span>03</span>Recibe una cotización</li></ol><figure><img src="/media/works/work-02/detail-1.webp" alt="Detalle de una torta real DelyJhos en blanco y dorado" loading="lazy" width="576" height="1024" /><figcaption>Hecha en DelyJhos. Pensada para tu ocasión.</figcaption></figure></div>
              <div className="commission-form-panel"><p className="commission-form-title">Empecemos por tu celebración</p><p className="dialog-note">Enviar esta solicitud no confirma un pedido ni un precio. Lo coordinamos contigo.</p><CustomQuote referenceWork={null} /></div>
            </section>
          )}
          {page === "tortas" && !productId && (
            <WorksGallery view="cakes" focusSearch={searchRequest} onQuote={(work) => {
              setReferenceWork(work);
              setCustomOpen(true);
            }} />
          )}
          {page === "nosotros" && (<AboutPage onRequestQuote={() => setCustomOpen(true)} />)}
          {page === "contacto" && (
            <section className="contact-section" id="contacto">
              <div className="contact-intro"><p className="eyebrow">ESTAMOS PARA ESCUCHARTE</p><h1>Conversemos de<br /><em>tu próxima celebración.</em></h1><p>Una torta, una mesa de bocaditos o una idea que todavía estás imaginando. Cuéntanos qué necesitas y coordinamos los detalles.</p><a href="#/nosotros" className="text-button">Conoce nuestra pastelería <Icon name="arrow" size={18} /></a></div>
              <div className="contact-options">{whatsapp && <a className="contact-whatsapp" href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={25} /><span>Conversemos por WhatsApp<small>Atención y coordinación de tu celebración</small></span><Icon name="arrow" size={18} /></a>}<article className="contact-request"><span className="contact-option-icon"><Icon name="edit" size={24} /></span><h2>Tu idea, con todos los detalles</h2><p>Comparte la fecha, las porciones y tu inspiración. Así podemos conocer mejor lo que buscas.</p><button className="button button-primary" onClick={() => setCustomOpen(true)}>Crear mi solicitud <Icon name="arrow" size={18} /></button></article><p className="contact-delivery-note">La disponibilidad y la entrega se coordinan al confirmar la propuesta.</p></div>
            </section>
          )}
        </div>
      </main>
      <footer className="store-footer">
        <div className="footer-invitation">
          <div><span className="footer-eyebrow">HAGAMOS ALGO ESPECIAL</span><h2>Tu próxima celebración<br /><em>empieza con una idea.</em></h2></div>
          <div><p>Una torta a tu medida o bocaditos para compartir.<br />Cuéntanos qué tienes en mente.</p><a className="button button-primary" href="#/personaliza">Personaliza tu torta <Icon name="arrow" size={18} /></a></div>
        </div>
        <div className="footer-intro">
          <a className="footer-brand" href="#/" aria-label="DelyJhos, volver al inicio">
            <span className="footer-logo" aria-hidden="true" />
            <span className="footer-wordmark">DelyJhos <small>PASTELERÍA FINA</small></span>
          </a>
          <p>
            Endulzamos tus momentos.
            <br />
            Tortas y detalles para celebrar en familia.
          </p>
          <small>Hecho con cariño, desde la primera idea.</small>
        </div>
        <nav aria-label="Explorar DelyJhos">
          <strong>Explora</strong>
          <a href="#/tortas">Nuestras tortas</a>
          <a href="#/bocaditos">Bocaditos dulces y salados</a>
          <a href="#/nosotros">Conoce DelyJhos</a>
        </nav>
        <nav className="footer-service" aria-label="Pedidos y atención">
          <strong>Te acompañamos</strong>
          <a href="#/personaliza">Personaliza tu torta</a>
          <a href="#/arma-tu-mesa">Arma tu mesa de bocaditos</a>
          <button className="text-button" onClick={() => setTrackingOpen(true)}>
            Seguir mi pedido
          </button>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Escríbenos por WhatsApp ↗
            </a>
          )}
          <a href="#/contacto">Contacto y consultas <Icon name="arrow" size={14} /></a>
        </nav>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} DelyJhos · Pastelería familiar</span>
          <a href="#/contacto">Contacto</a>
          <a href="#/admin">Administración</a>
        </div>
      </footer>
      <nav className="mobile-tabbar" aria-label="Accesos rápidos">
        {[
          ["inicio", "Inicio", "heart"],
          ["tortas", "Tortas", "cake"],
          ["bocaditos", "Bocaditos", "star"],
          ["arma-tu-mesa", "Mi mesa", "bag"],
          ["contacto", "Contacto", "chat"],
        ].map(([key, label, icon]) => (
          <a
            key={key}
            href={`#/${key === "inicio" ? "" : key}`}
            aria-current={page === key ? "page" : undefined}
          >
            <Icon name={icon} size={20} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="toast" role="status" aria-live="polite">
        {notice && (
          <>
            <span>{notice}</span>
            <button
              aria-label="Cerrar aviso"
              className="icon-button"
              onClick={() => setNotice("")}
            >
              <Icon name="close" size={16} />
            </button>
          </>
        )}
      </div>

      {trackingOpen && (
        <Modal title="Seguir mi pedido" onClose={() => setTrackingOpen(false)}>
          <Tracking />
        </Modal>
      )}
      {bagOpen && (
        <Modal title="Tu lista para cotizar" onClose={() => setBagOpen(false)}>
          <p className="dialog-note">
            Revisa tus favoritos y completa tus datos para solicitar el pedido.
            La disponibilidad se confirma antes de la elaboración.
          </p>
          {chosen.length ? (
            <>
              <ul className="bag-list">
                {chosen.map((p) => (
                  <li key={p.id}>
                    <span>
                      <strong>{p.name}</strong>
                      <small>{money(p.price)} · referencial</small>
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Quitar ${p.name}`}
                      onClick={() => setBag(bag.filter((id) => id !== p.id))}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="bag-total">
                <span>Total referencial</span>
                <strong>
                  {money(chosen.reduce((sum, p) => sum + p.price, 0))}
                </strong>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Icon name="bag" size={38} />
              <h3>Aún no has elegido tus favoritos</h3>
              <p>Explora el catálogo y añade productos a tu lista.</p>
            </div>
          )}
          {chosen.length > 0 && (
            <Checkout
              products={chosen}
              onSuccess={() =>
                setNotice(
                  "Pedido registrado. Guarda tu código privado de seguimiento.",
                )
              }
            />
          )}
          <button
            className="button button-primary full-width"
            onClick={() => {
              setBagOpen(false);
              navigate("tortas");
            }}
          >
            Seguir explorando <Icon name="arrow" size={18} />
          </button>
          <p className="dialog-note">
            El pedido queda pendiente de confirmación. No ingreses datos de
            tarjetas ni realices pagos sin coordinar con DelyJhos.
          </p>
        </Modal>
      )}
      {customOpen && (
        <Modal
          title={
            quoteProduct ? "Quiero una torta similar" : "Personaliza tu torta"
          }
          onClose={() => {
            setCustomOpen(false);
            setReferenceWork(null);
            setQuoteProduct(null);
          }}
        >
          <CustomQuote
            referenceWork={referenceWork}
            referenceProduct={quoteProduct}
          />
        </Modal>
      )}
    </div>
  );
}
export default App;
