import "./AboutPage.css";

type Props = { onRequestQuote: () => void };

export default function AboutPage({ onRequestQuote }: Props) {
  return (
    <article className="about-page" id="nosotros">
      <section className="about-intro" aria-labelledby="about-title">
        <div className="about-intro-copy">
          <p className="about-kicker">DELYJHOS · PASTELERÍA EN FAMILIA</p>
          <h1 id="about-title">Detrás de cada torta,<br /><em>una historia para celebrar.</em></h1>
          <p className="about-lead">La tuya empieza con una idea. La nuestra, con las ganas de darle forma.</p>
          <p>Somos una pastelería familiar que prepara tortas personalizadas y bocaditos dulces y salados. Nos gusta acompañarte en esos días que reúnen a las personas que quieres.</p>
          <a className="about-inline-link" href="#/nuestros-trabajos">Conoce nuestras creaciones <span aria-hidden="true">↗</span></a>
        </div>
        <div className="about-photo-composition">
          <figure className="about-photo-main">
            <img src="/media/works/work-02/detail-1.webp" alt="Torta de bautizo DelyJhos con decoración blanca y cruz dorada" width="576" height="1024" fetchPriority="high" />
            <figcaption>Un detalle que se vuelve recuerdo.</figcaption>
          </figure>
          <figure className="about-photo-inset">
            <img src="/media/works/work-01/detail-1.webp" alt="Torta temática K-pop de dos niveles en tonos lila elaborada por DelyJhos" width="576" height="1024" />
            <figcaption>Hecho en DelyJhos</figcaption>
          </figure>
          <span className="about-photo-note">Tus ideas,<br />nuestros detalles.</span>
        </div>
      </section>

      <section className="about-story" aria-labelledby="about-story-title">
        <div><p className="about-kicker">LO QUE NOS MUEVE</p><h2 id="about-story-title">No hay dos celebraciones iguales.<br /><em>Y eso nos encanta.</em></h2></div>
        <div className="about-story-copy"><p>Un personaje favorito, una combinación de colores, un nombre o una ocasión especial. Esos pequeños detalles nos ayudan a entender qué quieres celebrar y cómo te gustaría recordarlo.</p><p>Por eso conversamos contigo sobre el diseño, los sabores y las porciones antes de confirmar una propuesta. Desde una torta temática hasta una mesa de bocaditos, buscamos que cada elección tenga sentido para tu evento.</p></div>
      </section>

      <section className="about-process" aria-labelledby="about-process-title">
        <div className="about-process-heading"><p className="about-kicker">DE TU IDEA A LA MESA</p><h2 id="about-process-title">Lo hacemos contigo.</h2><p>Una conversación, los detalles claros y algo especial para compartir.</p></div>
        <ol className="about-steps">
          <li><span className="about-step-number">01</span><h3>Te escuchamos</h3><p>Cuéntanos la ocasión, la fecha y cuántas personas celebrarán contigo. Puedes compartir una imagen de referencia.</p></li>
          <li><span className="about-step-number">02</span><h3>Damos forma a tu idea</h3><p>Revisamos el diseño, las porciones y los sabores. Coordinamos la disponibilidad y la cotización antes de confirmar.</p></li>
          <li><span className="about-step-number">03</span><h3>Cuidamos los detalles</h3><p>Con la propuesta acordada, coordinamos la preparación y la entrega de tu pedido para esa celebración.</p></li>
        </ol>
      </section>

      <section className="about-invitation" aria-labelledby="about-invitation-title">
        <img src="/images/logo-original.png" alt="DelyJhos, pastelería fina" width="112" height="112" loading="lazy" />
        <div><p className="about-kicker">ENDULZAMOS TUS MOMENTOS</p><h2 id="about-invitation-title">Ahora, cuéntanos tu historia.</h2><p>¿Qué te gustaría preparar para tu próxima celebración?</p></div>
        <button type="button" className="button button-primary" onClick={onRequestQuote}>Cuéntanos tu idea <span aria-hidden="true">↗</span></button>
      </section>
    </article>
  );
}
