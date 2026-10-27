import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { money } from "./catalog";
import { api, assetUrl } from "./api";
import { Checkout, CustomQuote, Tracking } from "./CustomerForms";
import type { Product } from "./catalog";
import "./App.css";
import "./HeaderResponsive.css";
import ProductGallery from "./ProductGallery";
import SnackCatalog from "./SnackCatalog";
import WorksGallery from "./WorksGallery";
import type { Work } from "./workTypes";
import "./Storefront.css";
import AboutPage from "./AboutPage";

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
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

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
  const [demoCatalog, setDemoCatalog] = useState(true);
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
        setDemoCatalog(s.demo_catalog);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const shown = products.filter(
    (p) =>
      (page !== "tortas" ||
        p.category.toLocaleLowerCase("es").includes("torta")) &&
      (category === "Todas" || p.category === category) &&
      p.name
        .toLocaleLowerCase("es")
        .includes(query.toLocaleLowerCase("es").trim()),
  );
  const featured = [...shown]
    .sort(
      (a, b) =>
        Number(b.category.toLocaleLowerCase("es").includes("torta")) -
        Number(a.category.toLocaleLowerCase("es").includes("torta")),
    )
    .slice(0, 4);
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
          </a>
          <button
            className="icon-button mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-controls="store-navigation"
          >
            <Icon name="menu" />
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
                  setCategory("Todas");
                  setQuery("");
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
                setSearchOpen(!searchOpen);
              }}
              aria-label="Buscar productos"
              aria-expanded={searchOpen}
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
        {page === "inicio" && (
          <section className="hero" id="inicio">
            <div
              className="hero-photo"
              role="img"
              aria-label="Torta rosada con corona y flores, imagen decorativa de ambientación"
            />
            <div className="hero-inner">
              <div className="hero-copy">
                <span className="eyebrow">
                  PASTELERÍA FINA · HECHA CON AMOR
                </span>
                <h1>
                  Momentos
                  <br />
                  <em>que endulzamos</em>
                </h1>
                <p>
                  Tortas temáticas, bocaditos, dulces y más,
                  <br className="desktop-break" /> hechos con amor para cada
                  ocasión especial.
                </p>
                <div className="hero-buttons">
                  <a className="button button-primary" href="#/tortas">
                    <Icon name="cake" /> Ver tortas
                  </a>
                  <a
                    className="button button-outline hero-snacks"
                    href="#/bocaditos"
                  >
                    Ver bocaditos
                  </a>
                  <button
                    className="hero-custom-link"
                    onClick={() => setCustomOpen(true)}
                  >
                    <Icon name="edit" /> Personaliza tu torta
                  </button>
                </div>
                <span className="hero-signature">
                  Pastelería fina, para celebrar bonito.
                </span>
              </div>
            </div>
            <span className="hero-art-label">Imagen de ambientación</span>
          </section>
        )}
        {page === "inicio" && (
          <section className="craft-values" aria-label="Nuestra pastelería">
            <div>
              <Icon name="cake" size={30} />
              <span>
                Productos
                <br />
                artesanales
              </span>
            </div>
            <div>
              <Icon name="heart" size={30} />
              <span>
                Elaboración
                <br />
                con cariño
              </span>
            </div>
            <div>
              <Icon name="edit" size={30} />
              <span>
                Diseños
                <br />
                personalizados
              </span>
            </div>
            <div>
              <Icon name="truck" size={30} />
              <span>
                Atención
                <br />
                para eventos
              </span>
            </div>
          </section>
        )}
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
                  {loading ? "Cargando torta…" : "No encontramos esta torta"}
                </h1>
                <a href="#/tortas">Volver al catálogo</a>
              </div>
            ))}

          {page === "inicio" && (
            <section
              className="home-categories"
              aria-labelledby="categories-title"
            >
              <h2 id="categories-title">Nuestras categorías</h2>
              <div className="home-category-grid">
                <a href="#/tortas">
                  <span className="category-cover category-cover-cake" />
                  <h3>Tortas</h3>
                  <p>Diseños únicos para tu celebración.</p>
                  <span className="category-link">Ver catálogo →</span>
                </a>
                <a href="#/bocaditos">
                  <span className="category-cover category-cover-snacks" />
                  <h3>Bocaditos</h3>
                  <p>Dulces y salados para compartir.</p>
                  <span className="category-link">Ver catálogo →</span>
                </a>
                <a href="#/personaliza">
                  <img
                    src="/media/works/work-02/detail-1.webp"
                    alt="Torta de bautizo de DelyJhos"
                    loading="lazy"
                  />
                  <h3>Tu torta a medida</h3>
                  <p>Cuéntanos la idea para tu celebración.</p>
                  <span className="category-link">Personalizar mi torta →</span>
                </a>
              </div>
            </section>
          )}

          {page === "inicio" && (
            <section id="productos" className="products-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow small-eyebrow">
                    UN ANTOJO PARA CADA OCASIÓN
                  </p>
                  <h2>
                    Nuestros favoritos
                  </h2>
                  <p>Algunas de nuestras delicias más solicitadas.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    navigate("tortas");
                    setCategory("Todas");
                    setQuery("");
                  }}
                >
                  Ver todo <Icon name="arrow" size={18} />
                </button>
              </div>
              {searchOpen && (
                <label className="search-field">
                  <Icon name="search" />
                  <input
                    autoFocus={searchOpen}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Busca una torta, cupcakes, galletas…"
                    aria-label="Buscar por nombre"
                  />
                  <button
                    className="icon-button"
                    aria-label={
                      "Cerrar búsqueda"
                    }
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                    }}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </label>
              )}
              {loading && (
                <div
                  className="catalog-loading"
                  role="status"
                  aria-label="Cargando nuestro catálogo"
                >
                  <span className="sr-only">Cargando nuestro catálogo…</span>
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="catalog-skeleton"
                      aria-hidden="true"
                    >
                      <div />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              )}
              {catalogError && (
                <div role="alert" className="catalog-unavailable">
                  <h3>El catálogo no está disponible en este momento</h3>
                  <p>
                    Puedes intentar de nuevo o contarnos qué te gustaría
                    preparar para tu celebración.
                  </p>
                  <div>
                    <button
                      className="button button-outline"
                      onClick={() => window.location.reload()}
                    >
                      Volver a intentar
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setCustomOpen(true)}
                    >
                      Solicitar una torta personalizada →
                    </button>
                  </div>
                </div>
              )}
              <div className="product-grid">
                {featured.map((product) => (
                  <article className="product-card" key={product.id}>
                    <button
                      className="product-image-button"
                      onClick={() => setSelected(product)}
                      aria-label={`Ver ${product.name}`}
                    >
                      <span
                        role="img"
                        aria-label={product.name}
                        className={`product-photo product-photo-${product.photo}`}
                        style={
                          product.image_url
                            ? {
                                backgroundImage: `url("${assetUrl(product.image_url)}")`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                      />
                      <span className="photo-label">Imagen referencial</span>
                    </button>
                    <div className="product-info">
                      <p className="product-category">{product.category}</p>
                      <h3>{product.name}</h3>
                      <p className="product-price">
                        {money(product.price)} <span>referencial</span>
                      </p>
                      <button
                        className="button product-button"
                        onClick={() => setSelected(product)}
                      >
                        <Icon name="bag" size={16} /> Ver detalles
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!loading && !catalogError && shown.length === 0 && (
                <div className="empty-state">
                  <h3>No encontramos ese antojo</h3>
                  <p>
                    Prueba con otro nombre o consulta una creación
                    personalizada.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setQuery("");
                      setCategory("Todas");
                    }}
                  >
                    Mostrar todos los productos <Icon name="arrow" size={18} />
                  </button>
                </div>
              )}
              <p className="sample-note">
                {demoCatalog
                  ? "Catálogo inicial de muestra. Imágenes y precios referenciales; confirma "
                  : "Consulta "}
                ingredientes, cantidades y disponibilidad antes de realizar un
                pedido.
              </p>
            </section>
          )}

          {(page === "bocaditos" || page === "arma-tu-mesa") && (
            <SnackCatalog
              view={page === "arma-tu-mesa" ? "table" : "catalog"}
            />
          )}
          {page === "personaliza" && (
            <section className="standalone-form">
              <p className="eyebrow">A TU MEDIDA</p>
              <h1>Tu idea, nuestra próxima torta.</h1>
              <p>
                Cuéntanos la ocasión, la fecha y los detalles que te gustaría
                incluir.
              </p>
              <CustomQuote referenceWork={null} />
            </section>
          )}
          {page === "tortas" && !productId && (
            <WorksGallery view="cakes" onQuote={(work) => {
              setReferenceWork(work);
              setCustomOpen(true);
            }} />
          )}
          {page === "nosotros" && (<AboutPage onRequestQuote={() => setCustomOpen(true)} />)}
          {page === "contacto" && (
            <section className="contact-section" id="contacto">
              <Icon name="heart" size={32} />
              <h2>Tu próxima celebración empieza con una idea.</h2>
              <p>
                Cuéntanos la fecha, el número de invitados y lo que tienes en
                mente. Revisaremos los detalles contigo antes de confirmar.
              </p>
              {whatsapp && (
                <a
                  className="contact-whatsapp"
                  href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="chat" size={25} />
                  <span>
                    Conversemos por WhatsApp
                    <small>Atención y coordinación de tu celebración</small>
                  </span>
                  <Icon name="arrow" size={18} />
                </a>
              )}
              <button
                className="button button-primary"
                onClick={() => setCustomOpen(true)}
              >
                <Icon name="edit" size={18} /> Crear mi solicitud
              </button>
            </section>
          )}
          {page === "inicio" && (
            <section className="home-story">
              <div>
                <p className="eyebrow">HECHO EN DELYJHOS</p>
                <h2>
                  De nuestra pastelería
                  <br />a tu celebración.
                </h2>
                <p>
                  Conoce nuestras tortas personalizadas y encuentra una idea
                  para ese día especial.
                </p>
                <a className="text-button" href="#/tortas">
                  Explorar nuestras tortas <Icon name="arrow" size={18} />
                </a>
              </div>
              <div className="home-preview">
                {[1, 4, 6].map((n) => (
                  <a
                    key={n}
                    href="#/tortas"
                    aria-label="Ver tortas de DelyJhos"
                  >
                    <img
                      src={`/media/works/work-0${n}/poster.webp`}
                      alt="Torta personalizada de DelyJhos"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <footer className="store-footer">
        <div className="footer-intro">
          <a className="footer-brand" href="#/">
            DelyJhos <span>Pastelería fina</span>
          </a>
          <p>
            Endulzamos tus momentos.
            <br />
            Tortas y detalles para celebrar en familia.
          </p>
          <small>Hecho con cariño, desde la primera idea.</small>
        </div>
        <nav aria-label="Explorar DelyJhos">
          <strong>Descubre</strong>
          <a href="#/tortas">Nuestras tortas</a>
          <a href="#/bocaditos">Bocaditos dulces y salados</a>
          <a href="#/nosotros">Conoce DelyJhos</a>
        </nav>
        <div className="footer-service">
          <strong>Tu celebración</strong>
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
        </div>
        <div className="footer-bottom">
          <span>DelyJhos · Pastelería fina</span>
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
