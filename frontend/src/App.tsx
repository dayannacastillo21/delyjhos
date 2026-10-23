import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { categories as sampleCategories, money } from "./catalog";
import { api, assetUrl } from "./api";
import { Checkout, CustomQuote, Tracking } from "./CustomerForms";
import type { Product } from "./catalog";
import "./App.css";
import "./HeaderResponsive.css";
import ProductGallery from "./ProductGallery";
import SnackCatalog from "./SnackCatalog";
import WorksGallery from "./WorksGallery";
import type { Work } from "./workTypes";

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
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [bag, setBag] = useState<number[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [referenceWork, setReferenceWork] = useState<Work | null>(null);
  const [notice, setNotice] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState(sampleCategories);
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
        setCategories([
          ...cats.map((c) => ({
            name: c.name,
            icon: sampleCategories.find((s) => s.name === c.name)?.icon || "🎂",
          })),
          { name: "Pedidos especiales", icon: "🎁" },
        ]);
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
      (category === "Todas" || p.category === category) &&
      p.name
        .toLocaleLowerCase("es")
        .includes(query.toLocaleLowerCase("es").trim()),
  );
  const chosen = products.filter((p) => bag.includes(p.id));

  function addProduct(product: Product) {
    setBag((current) =>
      current.includes(product.id) ? current : [...current, product.id],
    );
    setNotice(`${product.name} está en tu lista para cotizar.`);
    setSelected(null);
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#inicio" aria-label="DelyJhos, inicio">
            <span className="logo-picture" />
          </a>
          <button
            className="icon-button mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Abrir menú"
          >
            <Icon name="menu" />
          </button>
          <nav
            className={menuOpen ? "navigation is-open" : "navigation"}
            aria-label="Navegación principal"
          >
            <a
              className="active"
              href="#inicio"
              onClick={() => setMenuOpen(false)}
            >
              Inicio
            </a>
            <a href="#productos" onClick={() => setMenuOpen(false)}>
              Tortas
            </a>
            <a href="#bocaditos" onClick={() => setMenuOpen(false)}>
              Bocaditos
            </a>
            <a href="#arma-tu-mesa" onClick={() => setMenuOpen(false)}>
              Arma tu mesa
            </a>
            <a href="#nuestros-trabajos" onClick={() => setMenuOpen(false)}>
              Nuestros trabajos
            </a>
            <button
              onClick={() => {
                setCustomOpen(true);
                setMenuOpen(false);
              }}
            >
              Personaliza tu torta
            </button>
            <a href="#nosotros" onClick={() => setMenuOpen(false)}>
              Nosotros
            </a>
            <a href="#contacto" onClick={() => setMenuOpen(false)}>
              Contacto
            </a>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => {
                setSearchOpen(!searchOpen);
                document
                  .getElementById("productos")
                  ?.scrollIntoView({ behavior: "smooth" });
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

      <main>
        <section className="hero" id="inicio">
          <div
            className="hero-photo"
            role="img"
            aria-label="Torta rosada con flores de crema, imagen de referencia"
          />
          <div className="hero-inner">
            <div className="hero-copy">
              <span className="eyebrow">PASTELERÍA FINA · HECHA CON AMOR</span>
              <h1>
                Endulzamos
                <br />
                <em>tus momentos</em>
              </h1>
              <p>
                Tortas temáticas, bocaditos, dulces y más,
                <br className="desktop-break" /> hechos con amor para cada
                ocasión especial.
              </p>
              <div className="hero-buttons">
                <a className="button button-primary" href="#productos">
                  <Icon name="cake" /> Ver catálogo
                </a>
                <button
                  className="button button-outline"
                  onClick={() => setCustomOpen(true)}
                >
                  <Icon name="edit" /> Personaliza tu torta
                </button>
              </div>
              <ul className="promises">
                <li>
                  <Icon name="truck" size={27} /> Pedidos personalizados
                </li>
                <li>
                  <Icon name="heart" size={27} /> Elaboración con amor
                </li>
                <li>
                  <Icon name="star" size={27} /> Cuidamos cada detalle
                </li>
              </ul>
            </div>
          </div>
          <span className="hero-note">
            Tortas que
            <br /> hacen historias <span>♡</span>
          </span>
        </section>

        <div className="page-content">
          <section
            className="category-grid"
            aria-label="Categorías de productos"
          >
            {categories.map((item) => (
              <button
                key={item.name}
                className={`category-card ${category === item.name ? "selected" : ""}`}
                aria-pressed={category === item.name}
                onClick={() => {
                  if (item.name === "Pedidos especiales") setCustomOpen(true);
                  else
                    setCategory(category === item.name ? "Todas" : item.name);
                }}
              >
                <span className="category-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </button>
            ))}
          </section>

          <section id="productos" className="products-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow small-eyebrow">
                  UN ANTOJO PARA CADA OCASIÓN
                </p>
                <h2>
                  {category === "Todas" ? "Productos destacados" : category}
                </h2>
                <p>Algunas de nuestras delicias más solicitadas.</p>
              </div>
              <button
                className="text-button"
                onClick={() => {
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
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busca una torta, cupcakes, galletas…"
                  aria-label="Buscar por nombre"
                />
                <button
                  className="icon-button"
                  aria-label="Cerrar búsqueda"
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
              <p role="status" className="empty-state">
                Cargando nuestro catálogo…
              </p>
            )}
            {catalogError && (
              <p role="alert" className="form-error">
                No pudimos cargar el catálogo. {catalogError}. Recarga la página
                cuando vuelva la conexión.
              </p>
            )}
            <div className="product-grid">
              {shown.map((product) => (
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
                  Prueba con otro nombre o consulta una creación personalizada.
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
                ? "Catálogo inicial de muestra. Imágenes y precios referenciales; confirma"
                : "Consulta"}
              ingredientes, cantidades y disponibilidad antes de realizar un
              pedido.
            </p>
          </section>

          <SnackCatalog />
          <WorksGallery
            onQuote={(work) => {
              setReferenceWork(work);
              setCustomOpen(true);
            }}
          />
          <section className="about-section" id="nosotros">
            <div>
              <span className="eyebrow">NUESTRA ESENCIA</span>
              <h2>
                Hecho en familia,
                <br />
                <em>para tus mejores momentos.</em>
              </h2>
            </div>
            <div>
              <p>
                En DelyJhos nos encanta ser parte de tus celebraciones.
                Preparamos tortas y detalles personalizados con dedicación,
                desde la idea inicial hasta la decoración final.
              </p>
              <button
                className="text-button"
                onClick={() => setCustomOpen(true)}
              >
                Cuéntanos qué estás imaginando <Icon name="arrow" size={18} />
              </button>
            </div>
          </section>
          <section className="contact-section" id="contacto">
            <Icon name="heart" size={32} />
            <h2>Tu próxima celebración empieza con una idea.</h2>
            <p>Elige tus favoritos o cuéntanos cómo imaginas tu torta.</p>
            <button
              className="button button-primary"
              onClick={() => setCustomOpen(true)}
            >
              <Icon name="edit" size={18} /> Crear mi solicitud
            </button>
          </section>
        </div>
      </main>
      <footer>
        <span className="footer-brand">
          DelyJhos <span>Pastelería fina</span>
        </span>
        <p>Endulzamos tus momentos.</p>
        <span>Hecho con cariño ♡</span>
        <button className="text-button" onClick={() => setTrackingOpen(true)}>
          Seguir mi pedido
        </button>
        <a className="text-button" href="#/admin">
          Administración
        </a>
        {whatsapp && (
          <a
            className="text-button"
            href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        )}
      </footer>
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

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <ProductGallery product={selected} />
          <p className="detail-description">{selected.description}</p>
          <p className="detail-price">
            {money(selected.price)} <small>Precio del catálogo</small>
          </p>
          <p className="dialog-note">
            Imagen referencial. La cotización final depende del tamaño, cantidad
            y personalización. Consulta ingredientes y alérgenos.
          </p>
          <button
            className="button button-primary full-width"
            onClick={() => addProduct(selected)}
          >
            <Icon name="bag" size={18} />
            {bag.includes(selected.id)
              ? "Ya está en tu lista"
              : "Añadir a mi lista para cotizar"}
          </button>
        </Modal>
      )}
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
              document
                .getElementById("productos")
                ?.scrollIntoView({ behavior: "smooth" });
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
          title="Personaliza tu torta"
          onClose={() => {
            setCustomOpen(false);
            setReferenceWork(null);
          }}
        >
          <CustomQuote referenceWork={referenceWork} />
        </Modal>
      )}
    </>
  );
}
export default App;
