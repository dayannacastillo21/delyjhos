import "./HomePage.css";

const cakes = [
  { slug: "work-01", name: "Una fiesta en tonos lila", occasion: "Tortas temáticas" },
  { slug: "work-04", name: "Sus personajes favoritos", occasion: "Cumpleaños" },
  { slug: "work-02", name: "Un día para recordar", occasion: "Celebraciones especiales" },
];

export default function HomePage({ onCustomize }: { onCustomize: () => void }) {
  return (
    <div className="home-page">
      <section className="home-hero" id="inicio" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="home-eyebrow"><span /> DELYJHOS · PASTELERÍA FINA</p>
          <h1 id="home-title">Hay momentos<br />que merecen<br /><em>algo especial.</em></h1>
          <p className="home-hero-description">Una torta que cuente tu historia.<br />Pequeñas delicias que reúnan a los tuyos.<br />Y muchos motivos para celebrar.</p>
          <div className="home-hero-actions"><a className="button button-primary" href="#/tortas">Descubre nuestras tortas <span aria-hidden="true">↗</span></a><button type="button" className="home-subtle-link" onClick={onCustomize}>Personaliza tu torta <span aria-hidden="true">→</span></button></div>
          <div className="home-hero-footnote"><span aria-hidden="true">✧</span><p>Hecho en familia.<br /><strong>Pensado para tu celebración.</strong></p></div>
        </div>
        <div className="home-hero-visual">
          <span className="home-visual-word" aria-hidden="true">celebra</span>
          <figure className="home-hero-photo"><img src="/media/works/work-01/detail-1.webp" alt="Torta real de DelyJhos de dos niveles, con temática K-pop y decoración en tonos lila" width="576" height="1024" fetchPriority="high" /><figcaption>Una idea tuya. Una creación nuestra.</figcaption></figure>
          <a className="home-snack-note" href="#/bocaditos"><img src="/media/snacks/empanaditas-de-carne.webp" alt="Empanaditas de carne del catálogo DelyJhos" width="96" height="96" /><span>¿Y para compartir?<strong>Descubre los bocaditos <span aria-hidden="true">↗</span></strong></span></a>
          <span className="home-photo-credit">CREACIÓN REAL DE DELYJHOS</span>
        </div>
      </section>

      <div className="home-brand-ribbon" aria-label="Nuestra propuesta"><span>Pastelería en familia</span><i aria-hidden="true">✧</i><span>Diseños personalizados</span><i aria-hidden="true">✧</i><span>Dulces y salados</span><i aria-hidden="true">✧</i><span>Detalles para celebrar</span></div>

      <section className="home-discover" aria-labelledby="discover-title">
        <div className="home-section-heading"><div><p className="home-eyebrow">ELIGE CÓMO CELEBRAR</p><h2 id="discover-title">Cada ocasión,<br /><em>su pequeño gran detalle.</em></h2></div><p>Para el centro de la mesa,<br />para compartir y para sorprender.</p></div>
        <div className="home-discover-grid">
          <a href="#/tortas" className="home-discover-card"><div className="home-discover-image"><img src="/media/works/work-02/detail-1.webp" alt="Torta de bautizo blanca con detalles dorados elaborada por DelyJhos" loading="lazy" width="576" height="1024" /><span>01 / EL GRAN MOMENTO</span></div><div><h3>Tortas con tu historia</h3><p>Encuentra la inspiración para ese día especial.</p><span className="home-card-link">Explorar tortas <span aria-hidden="true">↗</span></span></div></a>
          <a href="#/bocaditos" className="home-discover-card"><div className="home-discover-image snack"><img src="/media/snacks/mini-alfajores-de-maicena.webp" alt="Mini alfajores de maicena del catálogo DelyJhos" loading="lazy" width="600" height="450" /><span>02 / UNO MÁS, POR FAVOR</span></div><div><h3>Pequeños irresistibles</h3><p>Bocaditos dulces y salados para compartir.</p><span className="home-card-link">Ver bocaditos <span aria-hidden="true">↗</span></span></div></a>
          <a href="#/arma-tu-mesa" className="home-discover-card"><div className="home-discover-image snack"><img src="/media/snacks/empanaditas-de-carne.webp" alt="Empanaditas de carne para una mesa de bocaditos" loading="lazy" width="600" height="450" /><span>03 / TODOS A LA MESA</span></div><div><h3>Una mesa a tu gusto</h3><p>Combina tus variedades y prepara tu selección.</p><span className="home-card-link">Armar mi mesa <span aria-hidden="true">↗</span></span></div></a>
        </div>
      </section>

      <section className="home-real-work" aria-labelledby="real-work-title">
        <div className="home-section-heading"><div><p className="home-eyebrow">DE NUESTRAS MANOS A TU CELEBRACIÓN</p><h2 id="real-work-title">Así se ven<br /><em>las ideas hechas torta.</em></h2></div><a href="#/tortas" className="home-subtle-link">Ver todas las tortas <span aria-hidden="true">↗</span></a></div>
        <div className="home-real-grid">{cakes.map((cake) => <a href="#/tortas" className="home-real-card" key={cake.slug}><div><img src={`/media/works/${cake.slug}/poster.webp`} alt={`${cake.name}: creación real de DelyJhos`} width="576" height="1024" loading="lazy" /><span aria-hidden="true">↗</span></div><p>{cake.occasion}</p><h3>{cake.name}</h3></a>)}</div>
        <p className="home-real-caption">Fotografías de nuestros trabajos reales. Cada diseño se adapta y cotiza para tu ocasión.</p>
      </section>

      <section className="home-personal" aria-labelledby="personal-title">
        <div className="home-personal-heading"><p className="home-eyebrow">LO BONITO EMPIEZA CONTIGO</p><h2 id="personal-title">Tú pones la idea.<br /><em>Nosotros, los detalles.</em></h2><p>Una temática, unos colores, un nombre.<br />Cuéntanos qué hace especial tu celebración.</p><button className="button button-primary" type="button" onClick={onCustomize}>Quiero una torta a mi medida <span aria-hidden="true">↗</span></button></div>
        <ol className="home-personal-steps"><li><span>01</span><div><h3>Imagina</h3><p>Comparte tu idea o una imagen que te inspire.</p></div></li><li><span>02</span><div><h3>Lo conversamos</h3><p>Coordinamos fecha, porciones, diseño y cotización.</p></div></li><li><span>03</span><div><h3>Prepara la celebración</h3><p>Confirmamos los detalles y la entrega contigo.</p></div></li></ol>
      </section>
      <div className="home-family-note"><span aria-hidden="true">♡</span><p>Somos una pastelería familiar.<br /><em>Nos gusta ser parte de lo que celebras.</em></p><a href="#/nosotros" className="home-subtle-link">Conoce DelyJhos <span aria-hidden="true">↗</span></a></div>
    </div>
  );
}
