(function(){
  // ═══ MARIJASMIN CUSTOM THEME v3 — Redesign LV Store Style ═══

  // 1. Inject Google Fonts
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap';
  document.head.appendChild(link);

  // 2. Inject Custom CSS
  var style = document.createElement('style');
  style.id = 'mj-custom-css';
  style.textContent = `
    /* ═══ CSS Variables ═══ */
    :root {
      --raspberry: #810947;
      --raspberry-dark: #7B1148;
      --raspberry-light: #9B1A5A;
      --petal: #BB7B9C;
      --petal-light: #D4A5BC;
      --bg-site: #F7F5F2;
      --bg-card: #FFFFFF;
      --bg-warm: #FAF8F5;
      --text-primary: #2E2E2E;
      --text-muted: #8C8C8C;
      --border: #E8E6E0;
      --border-light: #F0EDE8;
    }

    /* ═══ Typography ═══ */
    h1, h2, h3, h4, .js-item-name, .item-name,
    .banner-texts h1, .banner-texts h2,
    .section-title, .category-header h1,
    .js-section-title, .home-section-title {
      font-family: 'Cormorant Garamond', serif !important;
      font-weight: 500;
      color: var(--text-primary);
      letter-spacing: 0.5px;
    }
    body, p, span, a, button, input, select, textarea, li,
    .js-item-price, .item-price, .breadcrumb,
    .description, .product-description {
      font-family: 'Inter', sans-serif !important;
    }
    body {
      background-color: var(--bg-site) !important;
      color: var(--text-primary) !important;
    }

    /* ═══ TOPBAR — Estilo LV Store (faixa marquee larga + sticky) ═══ */
    #mj-topbar {
      background-color: #000000 !important;
      color: #FFFFFF !important;
      text-align: center !important;
      padding: 12px 16px !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 12px !important;
      letter-spacing: 0.8px !important;
      position: sticky !important;
      top: 0 !important;
      z-index: 10000 !important;
      overflow: hidden !important;
      line-height: 1.4 !important;
      white-space: nowrap !important;
    }
    #mj-topbar .topbar-marquee {
      display: inline-block;
      animation: mjMarquee 30s linear infinite;
    }
    #mj-topbar .topbar-marquee span {
      margin: 0 40px;
      font-size: 12px;
      letter-spacing: 0.8px;
    }
    #mj-topbar .topbar-marquee span::before {
      content: '•';
      margin-right: 40px;
      opacity: 0.5;
    }
    #mj-topbar .topbar-marquee span:first-child::before {
      display: none;
    }
    @keyframes mjMarquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* ═══ Header — Sticky abaixo do topbar ═══ */
    .js-head-main, header, .head-main, .nav-header {
      background-color: #FFFFFF !important;
      border-bottom: 1px solid var(--border) !important;
      box-shadow: none !important;
      position: sticky !important;
      top: 42px !important;
      z-index: 9999 !important;
    }
    .nav-primary a, .nav-desktop a {
      font-family: 'Inter', sans-serif !important;
      font-size: 12px !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase !important;
      color: var(--text-primary) !important;
      transition: color 0.25s ease !important;
    }
    .nav-primary a:hover, .nav-desktop a:hover {
      color: var(--raspberry) !important;
    }

    /* ═══ Buttons — Modernos com hover elegante ═══ */
    .btn-primary, .js-addtocart, .js-buy-now,
    button[type="submit"], .btn--primary,
    .btn-checkout, .js-open-cart,
    .js-cart-widget-btn, .cart-btn,
    .btn-submit, #btn-add-to-cart {
      background-color: var(--raspberry) !important;
      border: 2px solid var(--raspberry) !important;
      color: #FFFFFF !important;
      border-radius: 30px !important;
      text-transform: uppercase !important;
      letter-spacing: 1.5px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      box-shadow: none !important;
      transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
      padding: 14px 32px !important;
      cursor: pointer !important;
    }
    .btn-primary:hover, .js-addtocart:hover, .js-buy-now:hover,
    button[type="submit"]:hover, .btn--primary:hover,
    .btn-checkout:hover {
      background-color: transparent !important;
      color: var(--raspberry) !important;
      border-color: var(--raspberry) !important;
      transform: translateY(-1px) !important;
    }
    .btn-secondary, .btn--secondary, .btn-link {
      background: transparent !important;
      border: 2px solid var(--raspberry) !important;
      color: var(--raspberry) !important;
      border-radius: 30px !important;
      text-transform: uppercase !important;
      letter-spacing: 1.5px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      padding: 14px 32px !important;
      transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
      cursor: pointer !important;
    }
    .btn-secondary:hover, .btn--secondary:hover {
      background-color: var(--raspberry) !important;
      color: #FFFFFF !important;
      transform: translateY(-1px) !important;
    }
    a { color: var(--raspberry); }
    a:hover { color: var(--raspberry-dark); }

    /* ═══ Product Cards — Proporção natural, estilo LV ═══ */
    .js-item-product, .item-product, .product-card {
      background: var(--bg-card) !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      transition: all 0.3s ease !important;
      overflow: hidden !important;
      position: relative !important;
    }
    .js-item-product:hover, .item-product:hover {
      transform: translateY(-2px) !important;
    }
    /* Zoom suave na imagem ao hover */
    .js-item-product img, .item-product img, .product-card img {
      transition: transform 0.6s ease !important;
    }
    .js-item-product:hover img, .item-product:hover img, .product-card:hover img {
      transform: scale(1.05) !important;
    }
    /* Fotos com proporção natural — sem crop retangular */
    .js-item-product .item-image,
    .item-product .item-image,
    .product-card .item-image {
      overflow: hidden !important;
      aspect-ratio: 3/4 !important;
    }
    .js-item-product .item-image img,
    .item-product .item-image img,
    .product-card .item-image img {
      object-fit: cover !important;
      width: 100% !important;
      height: 100% !important;
    }
    /* Grid 4 colunas no desktop (LV style) */
    @media (min-width: 769px) {
      .js-product-table.row-fluid,
      .product-table.row-fluid,
      .products-grid {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 16px !important;
      }
      .js-product-table .span3,
      .product-table .span3 {
        width: 100% !important;
        margin-left: 0 !important;
      }
    }
    /* Mobile: 2 colunas */
    @media (max-width: 768px) {
      .js-product-table.row-fluid,
      .product-table.row-fluid,
      .products-grid {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
      }
      .js-product-table .span3,
      .product-table .span3,
      .js-product-table .span6 {
        width: 100% !important;
        margin-left: 0 !important;
      }
    }
    /* ═══ Home Product Carousel ═══ */
    #mj-home-carousel {
      position: relative;
      overflow: hidden;
      padding: 0 16px;
    }
    #mj-home-carousel .carousel-track {
      display: flex;
      transition: transform 0.6s cubic-bezier(0.4,0,0.2,1);
      gap: 16px;
    }
    #mj-home-carousel .carousel-track .item-product {
      flex: 0 0 calc(25% - 12px);
      min-width: calc(25% - 12px);
    }
    @media (max-width: 768px) {
      #mj-home-carousel .carousel-track .item-product {
        flex: 0 0 calc(50% - 8px);
        min-width: calc(50% - 8px);
      }
    }
    /* Info do produto abaixo da imagem */
    .js-item-product .item-info,
    .item-product .item-info {
      padding: 12px 8px !important;
      text-align: left !important;
    }
    .js-item-name, .item-name {
      font-family: 'Inter', sans-serif !important;
      font-size: 13px !important;
      font-weight: 400 !important;
      color: var(--text-primary) !important;
      letter-spacing: 0 !important;
      text-transform: none !important;
    }
    /* Preço destaque */
    .js-price-display, .item-price, .price,
    .js-product-price, .product-price {
      color: var(--text-primary) !important;
      font-weight: 600 !important;
      font-size: 14px !important;
    }
    /* Preço antigo riscado */
    .js-compare-price-display, .compare-at-price,
    .price-compare, .item-price-compare {
      color: var(--text-muted) !important;
      text-decoration: line-through !important;
      font-size: 12px !important;
    }
    /* Parcelas visíveis (LV Store insight) */
    .js-installment, .installment, .item-installment {
      font-size: 11px !important;
      color: var(--text-muted) !important;
    }
    /* Wishlist heart */
    .js-item-product .js-wishlist-btn,
    .item-product .wishlist-btn {
      position: absolute !important;
      bottom: 10px !important;
      left: 10px !important;
      z-index: 10 !important;
    }

    /* ═══ Labels/Badges — Tag de Atacado ═══ */
    .label, .badge, .js-stock-label, .product-label {
      background-color: #000000 !important;
      color: #FFFFFF !important;
      border-radius: 0 !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 10px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      padding: 4px 8px !important;
    }
    .label-accent, .label-discount {
      background-color: var(--raspberry) !important;
    }
    .js-last-item, .last-item-label {
      color: #dd7774 !important;
      font-size: 11px !important;
      font-weight: 600 !important;
    }

    /* ═══ Home Sections Spacing ═══ */
    .js-home-sections-container > section,
    .js-home-sections-container > div {
      padding-top: 48px !important;
      padding-bottom: 48px !important;
    }
    @media (min-width: 769px) {
      .js-home-sections-container > section,
      .js-home-sections-container > div {
        padding-top: 64px !important;
        padding-bottom: 64px !important;
      }
    }
    .js-home-slider-section {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }

    /* ═══ Home Section Titles ═══ */
    .js-home-sections-container h2,
    .home-section-title,
    [data-store] h2 {
      font-family: 'Cormorant Garamond', serif !important;
      font-size: 28px !important;
      font-weight: 500 !important;
      text-align: center !important;
      color: var(--text-primary) !important;
      margin-bottom: 32px !important;
      letter-spacing: 1px !important;
    }
    @media (min-width: 769px) {
      .js-home-sections-container h2,
      .home-section-title,
      [data-store] h2 {
        font-size: 36px !important;
      }
    }

    /* ═══ Banner Services / Informatives ═══ */
    .banner-services-container, .js-informative-banners {
      background-color: var(--bg-warm) !important;
      border-top: 0.5px solid var(--border-light) !important;
      border-bottom: 0.5px solid var(--border-light) !important;
    }
    .banner-services-item, .service-item { text-align: center !important; }
    .banner-services-item h3, .service-item h3,
    .banner-services-item .title {
      font-family: 'Inter', sans-serif !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      color: var(--text-primary) !important;
    }
    .banner-services-item p, .service-item p,
    .banner-services-item .description {
      font-size: 12px !important;
      color: var(--text-muted) !important;
    }
    .banner-services-item svg, .service-item svg,
    .banner-services-item i, .service-item i {
      color: var(--raspberry) !important;
      fill: var(--raspberry) !important;
    }

    /* ═══ Welcome / Institutional Messages ═══ */
    [data-store="home-welcome-message"],
    [data-store="home-institutional-message"] {
      text-align: center !important;
      max-width: 720px !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    [data-store="home-welcome-message"] h2,
    [data-store="home-institutional-message"] h2 {
      font-family: 'Cormorant Garamond', serif !important;
      font-size: 32px !important;
      font-weight: 500 !important;
      color: var(--text-primary) !important;
    }
    [data-store="home-welcome-message"] p,
    [data-store="home-institutional-message"] p {
      font-size: 15px !important;
      line-height: 1.7 !important;
      color: var(--text-muted) !important;
      max-width: 600px !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    /* ═══ Newsletter — Raspberry da paleta (#810947) ═══ */
    .section-newsletter, [data-store="home-newsletter"],
    .newsletter-section, .js-newsletter {
      background-color: var(--raspberry) !important;
      color: #FFFFFF !important;
      text-align: center !important;
      padding: 80px 24px !important;
      border: none !important;
      position: relative !important;
    }
    .section-newsletter h2, [data-store="home-newsletter"] h2 {
      color: #FFFFFF !important;
      font-family: 'Cormorant Garamond', serif !important;
      font-size: 36px !important;
      font-weight: 400 !important;
      margin-bottom: 8px !important;
      letter-spacing: 2px !important;
      text-transform: uppercase !important;
    }
    .section-newsletter p, [data-store="home-newsletter"] p,
    .section-newsletter .text-small {
      color: rgba(255,255,255,0.75) !important;
      font-size: 14px !important;
      margin-bottom: 32px !important;
      font-family: 'Inter', sans-serif !important;
      line-height: 1.6 !important;
      font-style: italic !important;
    }
    .section-newsletter form, [data-store="home-newsletter"] form {
      display: flex !important;
      justify-content: center !important;
      gap: 0 !important;
      max-width: 480px !important;
      margin: 0 auto !important;
    }
    .section-newsletter input[type="email"],
    [data-store="home-newsletter"] input[type="email"],
    .section-newsletter input[type="text"],
    [data-store="home-newsletter"] input[type="text"],
    .section-newsletter input,
    [data-store="home-newsletter"] input:not([type="submit"]):not([type="button"]) {
      background: rgba(255,255,255,0.15) !important;
      border: 1px solid rgba(255,255,255,0.5) !important;
      border-right: none !important;
      color: #FFFFFF !important;
      border-radius: 0 !important;
      padding: 16px 20px !important;
      flex: 1 !important;
      font-size: 13px !important;
      font-family: 'Inter', sans-serif !important;
      letter-spacing: 0.5px !important;
    }
    .section-newsletter input::placeholder,
    [data-store="home-newsletter"] input::placeholder {
      color: rgba(255,255,255,0.6) !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      font-size: 11px !important;
    }
    .section-newsletter button,
    [data-store="home-newsletter"] button,
    .section-newsletter input[type="submit"],
    [data-store="home-newsletter"] input[type="submit"] {
      background-color: #FFFFFF !important;
      color: var(--raspberry) !important;
      border: 1px solid #FFFFFF !important;
      border-radius: 0 !important;
      padding: 16px 32px !important;
      text-transform: uppercase !important;
      letter-spacing: 2px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
      font-family: 'Inter', sans-serif !important;
      white-space: nowrap !important;
    }
    .section-newsletter button:hover,
    [data-store="home-newsletter"] button:hover {
      background-color: transparent !important;
      color: #FFFFFF !important;
    }
    @media (max-width: 768px) {
      .section-newsletter, [data-store="home-newsletter"] {
        padding: 56px 16px !important;
      }
      .section-newsletter h2, [data-store="home-newsletter"] h2 {
        font-size: 26px !important;
      }
      .section-newsletter form, [data-store="home-newsletter"] form {
        flex-direction: column !important;
        gap: 0 !important;
      }
      .section-newsletter input[type="email"],
      [data-store="home-newsletter"] input[type="email"],
      .section-newsletter input:not([type="submit"]):not([type="button"]) {
        border-right: 1px solid rgba(255,255,255,0.5) !important;
        border-bottom: none !important;
      }
      .section-newsletter button, [data-store="home-newsletter"] button {
        width: 100% !important;
      }
    }

    /* ═══ Editorial Section — Fotos sobrepostas + texto grande (Principessa) ═══ */
    #mj-editorial {
      position: relative;
      padding: 100px 5%;
      background: var(--bg-site);
      overflow: hidden;
      min-height: 600px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #mj-editorial .editorial-text {
      position: absolute;
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(80px, 14vw, 200px);
      font-weight: 300;
      color: rgba(129, 9, 71, 0.15);
      text-transform: uppercase;
      letter-spacing: 12px;
      line-height: 0.9;
      z-index: 5;
      pointer-events: none;
      white-space: nowrap;
    }
    #mj-editorial .editorial-text.top {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -70%);
    }
    #mj-editorial .editorial-text.bottom {
      top: 50%;
      left: 50%;
      transform: translate(-50%, 10%);
    }
    #mj-editorial .editorial-photos {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      position: relative;
      z-index: 2;
      gap: 0;
      max-width: 750px;
      margin: 0 auto;
    }
    #mj-editorial .editorial-photo {
      box-shadow: 0 12px 50px rgba(0,0,0,0.12);
      overflow: hidden;
    }
    #mj-editorial .editorial-photo:first-child {
      width: 48%;
      transform: translateX(40px) translateY(-20px);
      z-index: 3;
    }
    #mj-editorial .editorial-photo:last-child {
      width: 48%;
      transform: translateX(-40px) translateY(50px);
      z-index: 2;
    }
    #mj-editorial .editorial-photo img {
      width: 100%;
      height: auto;
      display: block;
    }
    @media (max-width: 768px) {
      #mj-editorial {
        padding: 60px 16px;
        min-height: 380px;
      }
      #mj-editorial .editorial-text {
        font-size: 50px;
        letter-spacing: 5px;
      }
      #mj-editorial .editorial-photo:first-child {
        width: 55%;
        transform: translateX(20px) translateY(-10px);
      }
      #mj-editorial .editorial-photo:last-child {
        width: 55%;
        transform: translateX(-20px) translateY(30px);
      }
    }

    /* ═══ Frases elegantes na Home (estilo Principessa) ═══ */
    #mj-editorial-phrase {
      text-align: center;
      padding: 56px 24px;
      background: var(--bg-site);
    }
    #mj-editorial-phrase .phrase-main {
      font-family: 'Cormorant Garamond', serif;
      font-size: 38px;
      font-weight: 400;
      color: var(--text-primary);
      letter-spacing: 2px;
      text-transform: uppercase;
      line-height: 1.3;
      margin-bottom: 12px;
    }
    #mj-editorial-phrase .phrase-main em {
      font-style: italic;
      color: var(--raspberry);
      text-transform: lowercase;
    }
    #mj-editorial-phrase .phrase-sub {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: var(--text-muted);
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    @media (max-width: 768px) {
      #mj-editorial-phrase .phrase-main {
        font-size: 26px;
      }
      #mj-editorial-phrase .phrase-sub {
        font-size: 11px;
        letter-spacing: 2px;
      }
    }

    /* ═══ Testimonials ═══ */
    .section-testimonials, [data-store="home-testimonials"] {
      background-color: var(--bg-warm) !important;
    }
    .testimonial-item, .js-testimonial { text-align: center !important; }
    .testimonial-item blockquote, .testimonial-quote {
      font-family: 'Cormorant Garamond', serif !important;
      font-style: italic !important;
      font-size: 18px !important;
      line-height: 1.6 !important;
      color: var(--text-primary) !important;
    }
    .testimonial-item .name, .testimonial-name {
      font-family: 'Inter', sans-serif !important;
      font-size: 12px !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      color: var(--raspberry) !important;
      font-weight: 500 !important;
    }

    /* ═══ Banners / Categories Grid ═══ */
    .section-banners-home { box-shadow: none !important; }
    .section-banners-home img { border-radius: 0 !important; }
    .banner-overlay, .banner-texts {
      background: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 60%) !important;
    }
    .banner-texts h3, .banner-texts .title {
      font-family: 'Inter', sans-serif !important;
      color: #FFFFFF !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 2px !important;
    }

    /* ═══ Slider ═══ */
    .js-home-slider .swiper-button-next,
    .js-home-slider .swiper-button-prev,
    .home-slider .swiper-button-next,
    .home-slider .swiper-button-prev {
      color: #FFFFFF !important;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }
    .js-home-slider .swiper-button-next:hover,
    .js-home-slider .swiper-button-prev:hover { opacity: 1; }
    .swiper-pagination-bullet-active {
      background-color: var(--raspberry) !important;
    }

    /* ═══ Category Page ═══ */
    .category-header {
      text-align: center !important;
      padding: 32px 0 !important;
    }
    .category-header h1 { font-size: 32px !important; }

    /* ═══ Product Page ═══ */
    .product-page h1, .js-product-name {
      font-family: 'Cormorant Garamond', serif !important;
      font-size: 28px !important;
      font-weight: 500 !important;
    }
    .product-description {
      line-height: 1.7 !important;
      color: var(--text-primary) !important;
      font-size: 14px !important;
    }
    .variant-label, .js-variant-label {
      font-size: 12px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      font-weight: 500 !important;
    }
    /* Color swatches — estilo LV */
    .js-color-variant, .color-variant,
    .variant-swatch, .js-btn-variant {
      border-radius: 50% !important;
      width: 28px !important;
      height: 28px !important;
      border: 2px solid transparent !important;
      transition: border-color 0.2s ease !important;
      cursor: pointer !important;
    }
    .js-color-variant.selected, .color-variant.active,
    .js-btn-variant.selected {
      border-color: var(--raspberry) !important;
    }

    /* ═══ Cart / Mini-Cart ═══ */
    .cart-summary, .js-ajax-cart-wrapper {
      background-color: var(--bg-card) !important;
      box-shadow: none !important;
      border: 1px solid var(--border) !important;
    }
    .js-alert-added-to-cart, .notification-cart,
    .js-cart-notification {
      background-color: #000000 !important;
      color: #FFFFFF !important;
      border-radius: 0 !important;
    }
    /* Barra de frete grátis */
    .js-ship-free-progress, .free-shipping-bar,
    .js-free-shipping-bar {
      background-color: var(--border-light) !important;
      border-radius: 0 !important;
      overflow: hidden !important;
    }
    .js-ship-free-progress-bar, .free-shipping-bar-fill {
      background-color: var(--raspberry) !important;
      transition: width 0.4s ease !important;
    }
    .js-ship-free-text, .free-shipping-text {
      font-size: 12px !important;
      color: var(--text-primary) !important;
    }
    /* Checkout button no carrinho */
    .cart-btn-checkout, .js-cart-checkout-btn,
    .btn-to-checkout {
      background-color: #000000 !important;
      color: #FFFFFF !important;
      font-size: 13px !important;
      text-transform: uppercase !important;
      letter-spacing: 1.5px !important;
      padding: 16px 24px !important;
      border-radius: 30px !important;
      border: 2px solid #000000 !important;
      width: 100% !important;
      transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
      font-weight: 600 !important;
      cursor: pointer !important;
    }
    .cart-btn-checkout:hover, .js-cart-checkout-btn:hover,
    .btn-to-checkout:hover {
      background-color: var(--raspberry) !important;
      border-color: var(--raspberry) !important;
    }
    .cart-subtotal, .js-cart-subtotal {
      font-weight: 600 !important;
      color: var(--text-primary) !important;
    }

    /* ═══ Product Page — Conversão ═══ */
    .product-page .js-product-price,
    .product-page .product-price {
      font-size: 24px !important;
      color: var(--text-primary) !important;
      font-weight: 700 !important;
    }
    .product-page .js-compare-price-display,
    .product-page .compare-at-price {
      font-size: 16px !important;
      color: var(--text-muted) !important;
    }
    .product-page .js-installment,
    .product-page .installment {
      font-size: 14px !important;
      color: var(--text-muted) !important;
      margin-top: 4px !important;
    }
    .product-page .js-addtocart,
    .product-page #btn-add-to-cart {
      font-size: 14px !important;
      padding: 18px 32px !important;
      width: 100% !important;
      background-color: #000000 !important;
      border: 2px solid #000000 !important;
      border-radius: 30px !important;
      letter-spacing: 2px !important;
    }
    .product-page .js-addtocart:hover,
    .product-page #btn-add-to-cart:hover {
      background-color: var(--raspberry) !important;
      border-color: var(--raspberry) !important;
    }
    /* Frete calculator */
    .shipping-calculator, .js-shipping-calculator-container {
      border: 1px solid var(--border) !important;
      border-radius: 0 !important;
      padding: 16px !important;
      background: var(--bg-warm) !important;
    }

    /* ═══ Atacado Progress Bar (carrinho + checkout) ═══ */
    #mj-atacado-bar {
      background: linear-gradient(135deg, #FAF8F5 0%, #FFF 100%);
      border: 1px solid var(--border);
      padding: 14px 20px;
      margin: 12px 0;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: var(--text-primary);
    }
    #mj-atacado-bar .atacado-progress {
      background: var(--border-light);
      height: 4px;
      margin-top: 8px;
      overflow: hidden;
    }
    #mj-atacado-bar .atacado-progress-fill {
      background: var(--raspberry);
      height: 100%;
      transition: width 0.4s ease;
    }
    #mj-atacado-bar strong { color: var(--raspberry); }

    /* ═══ Esconder newsletter duplicada do footer ═══ */
    footer .js-newsletter,
    footer .js-newsletter.newsletter,
    footer.js-footer .js-newsletter,
    footer.js-footer .newsletter,
    footer.js-footer .js-newsletter.newsletter,
    footer .newsletter {
      display: none !important;
      height: 0 !important;
      overflow: hidden !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* ═══ Footer — PRETO elegante (estilo LV Store) ═══ */
    footer, .footer {
      background-color: #0A0A0A !important;
      color: #FFFFFF !important;
      border-top: none !important;
      padding: 56px 32px 32px !important;
    }
    footer a, .footer a {
      color: rgba(255,255,255,0.7) !important;
      transition: color 0.2s ease !important;
      font-size: 13px !important;
    }
    footer a:hover, .footer a:hover { color: #FFFFFF !important; }
    footer h3, .footer h3 {
      font-family: 'Cormorant Garamond', serif !important;
      font-size: 16px !important;
      color: #FFFFFF !important;
      text-transform: uppercase !important;
      letter-spacing: 3px !important;
      font-weight: 500 !important;
      margin-bottom: 20px !important;
      border-bottom: 1px solid rgba(255,255,255,0.1) !important;
      padding-bottom: 12px !important;
    }
    footer p, .footer p {
      color: rgba(255,255,255,0.5) !important;
      font-size: 13px !important;
      line-height: 1.7 !important;
    }
    footer li, .footer li {
      margin-bottom: 8px !important;
    }
    /* Footer payment/shipping icons — sem filtro para manter visíveis */
    footer img, .footer img {
      filter: none !important;
      opacity: 0.85 !important;
      transition: opacity 0.2s ease !important;
      max-height: 28px !important;
    }
    footer img:hover, .footer img:hover {
      opacity: 1 !important;
    }
    /* Selos de segurança e stamps */
    .footer-payments, .payment-icons, .js-payment-icons,
    .footer-shipping, .shipping-icons {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      align-items: center !important;
    }
    .footer-payments img, .payment-icons img,
    .footer-shipping img, .shipping-icons img {
      background: #FFFFFF !important;
      padding: 4px 6px !important;
      border-radius: 4px !important;
      max-height: 24px !important;
    }
    /* Footer bottom / copyright */
    .footer-legal, .powered-by, .footer-bottom {
      border-top: 1px solid rgba(255,255,255,0.1) !important;
      margin-top: 32px !important;
      padding-top: 20px !important;
      font-size: 11px !important;
      color: rgba(255,255,255,0.4) !important;
    }

    /* ═══ Inputs ═══ */
    input, select, textarea {
      border: 1px solid var(--border) !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--raspberry) !important;
      outline: none !important;
    }

    /* ═══ Breadcrumb ═══ */
    .breadcrumb {
      font-size: 12px !important;
      color: var(--text-muted) !important;
    }
    .breadcrumb a { color: var(--text-muted) !important; }
    .breadcrumb a:hover { color: var(--raspberry) !important; }

    /* ═══ Responsive — Mobile Fixes ═══ */
    @media (max-width: 768px) {
      #mj-topbar {
        font-size: 10px !important;
        padding: 10px 12px !important;
        letter-spacing: 0.5px !important;
      }
      .js-head-main, header, .head-main, .nav-header {
        top: 38px !important;
      }
      .js-home-sections-container h2,
      [data-store] h2 { font-size: 24px !important; }
      .product-page h1, .js-product-name { font-size: 22px !important; }

      /* Mobile buttons fix */
      .btn-primary, .js-addtocart, .js-buy-now,
      button[type="submit"], .btn--primary {
        padding: 14px 24px !important;
        font-size: 12px !important;
        min-height: 48px !important;
        touch-action: manipulation !important;
        border-radius: 30px !important;
        width: 100% !important;
      }
      /* Mobile product page */
      .product-page .js-addtocart,
      .product-page #btn-add-to-cart {
        padding: 16px 24px !important;
        font-size: 13px !important;
        min-height: 52px !important;
        border-radius: 30px !important;
      }
      /* Mobile cart */
      .cart-btn-checkout, .js-cart-checkout-btn,
      .btn-to-checkout {
        min-height: 52px !important;
        font-size: 12px !important;
        border-radius: 30px !important;
      }
      /* Fix variant buttons mobile */
      .js-color-variant, .color-variant,
      .variant-swatch, .js-btn-variant {
        min-width: 40px !important;
        min-height: 40px !important;
      }
      .js-btn-variant, .variant-btn {
        min-height: 44px !important;
        padding: 10px 16px !important;
        font-size: 13px !important;
      }
      /* Footer mobile padding */
      footer, .footer {
        padding: 32px 16px !important;
      }
    }

    /* ═══ Scrollbar ═══ */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-site); }
    ::-webkit-scrollbar-thumb { background: var(--petal); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--raspberry); }

    /* ═══ Selection ═══ */
    ::selection { background-color: var(--petal-light); color: var(--text-primary); }

    /* ═══ Smooth scroll ═══ */
    html { scroll-behavior: smooth; }
  `;
  document.head.appendChild(style);

  // ═══ 3. Create MARQUEE topbar (estilo LV Store) ═══
  var topbar = document.createElement('div');
  topbar.id = 'mj-topbar';
  var msgs = [
    'ATACAREJO MARIJASMIN — COMPRE A PARTIR DE 1 PEÇA OU MONTE SEU ATACADO',
    'FRETE GRÁTIS NO ATACADO ACIMA DE R$1.500',
    'ATACADO A PARTIR DE 5 PEÇAS — PREÇOS EXCLUSIVOS PARA REVENDEDORAS',
    'PARCELAMOS EM ATÉ 3X SEM JUROS',
    'JUNTE-SE À COMUNIDADE — MAIS DE 500 REVENDEDORAS NO BRASIL'
  ];
  var marqueeHTML = '<span class="topbar-marquee">';
  // Duplicate messages for seamless loop
  var allMsgs = msgs.concat(msgs);
  allMsgs.forEach(function(m) {
    marqueeHTML += '<span>' + m + '</span>';
  });
  marqueeHTML += '</span>';
  topbar.innerHTML = marqueeHTML;
  document.body.insertBefore(topbar, document.body.firstChild);

  // ═══ 4. Replace product label tags (somente nos cards de produto, nunca no header/carrinho) ═══
  function replaceProductLabels() {
    var productContainers = document.querySelectorAll(
      '.js-item-product, .item-product, .product-card, .product-page, ' +
      '.js-product-table, .product-table, #mj-home-carousel'
    );
    productContainers.forEach(function(container) {
      var labels = container.querySelectorAll('.label, .badge, .product-label, .js-stock-label');
      labels.forEach(function(label) {
        var text = label.textContent.trim();
        if (text.match(/\d+%/) || text.match(/^\-?\d+/)) {
          label.textContent = 'COMPRE NO ATACADO A PARTIR DE 5 PEÇAS';
          label.style.backgroundColor = '#000000';
          label.style.color = '#FFFFFF';
          label.style.fontWeight = '600';
          label.style.fontSize = '9px';
          label.style.letterSpacing = '0.3px';
          label.style.padding = '5px 10px';
        }
      });
    });
  }

  // ═══ 5. Atacado progress bar in cart ═══
  function injectAtacadoBar() {
    var cartContainer = document.querySelector(
      '.cart-summary, .js-ajax-cart-wrapper, .js-cart-container, ' +
      '.cart-table, #cart-page, .js-cart-widget-content'
    );
    if (!cartContainer || document.getElementById('mj-atacado-bar')) return;

    // Count items in cart
    var cartItems = document.querySelectorAll(
      '.js-cart-item, .cart-item, .js-ajax-cart-item, tr.cart-row'
    );
    var totalQty = 0;
    cartItems.forEach(function(item) {
      var qtyInput = item.querySelector('input[type="number"], .js-cart-quantity, .cart-item-quantity');
      if (qtyInput) {
        totalQty += parseInt(qtyInput.value || qtyInput.textContent || 1);
      } else {
        totalQty += 1;
      }
    });

    var bar = document.createElement('div');
    bar.id = 'mj-atacado-bar';

    if (totalQty >= 5) {
      bar.innerHTML = '<span>🎉 <strong>Parabéns!</strong> Você está comprando no <strong>atacado</strong>! Preços exclusivos aplicados.</span>';
    } else {
      var remaining = 5 - totalQty;
      var pct = Math.min((totalQty / 5) * 100, 100);
      bar.innerHTML = '<span>Adicione mais <strong>' + remaining + ' peça' + (remaining > 1 ? 's' : '') + '</strong> para comprar no <strong>atacado</strong> com preços exclusivos!</span>' +
        '<div class="atacado-progress"><div class="atacado-progress-fill" style="width:' + pct + '%"></div></div>';
    }

    cartContainer.insertBefore(bar, cartContainer.firstChild);
  }

  // ═══ 5b. Hide footer newsletter (keep only the home one) ═══
  function hideFooterNewsletter() {
    var footer = document.querySelector('footer, .js-footer');
    if (!footer) return;
    var nl = footer.querySelector('.js-newsletter, .newsletter');
    if (nl) {
      nl.style.display = 'none';
    }
  }

  // ═══ 6. Fix category menu links + remove non-product pages from menu ═══
  function fixCategoryLinks() {
    // Pages to hide from main navigation (not product categories)
    var pagesToHide = [
      'quem-somos', 'politica-de-troca', 'politica-troca',
      'faq', 'perguntas-frequentes', 'termos', 'termos-de-uso',
      'politica-de-privacidade', 'politica-privacidade',
      'contato', 'atacado'
    ];

    var navLinks = document.querySelectorAll(
      '.nav-primary a, .nav-desktop a, .nav-mobile a, ' +
      '.nav-primary li a, .nav-desktop li a, .nav-mobile li a, ' +
      'nav.nav a, .js-nav-list a'
    );
    navLinks.forEach(function(link) {
      var href = (link.getAttribute('href') || '').toLowerCase();
      var text = (link.textContent || '').trim().toLowerCase();

      // Fix double slashes
      if (href.match(/\/\//g) && !href.match(/^https?:/)) {
        link.setAttribute('href', href.replace(/\/\//g, '/'));
      }

      // Hide non-product pages from main menu
      var shouldHide = pagesToHide.some(function(page) {
        return href.includes(page) || text.includes(page.replace(/-/g, ' '));
      });
      // Also hide by common page names
      if (text === 'quem somos' || text === 'política de troca' ||
          text === 'faq' || text === 'termos de uso' ||
          text === 'política de privacidade' || text === 'contato' ||
          text === 'atacado') {
        shouldHide = true;
      }

      if (shouldHide) {
        var li = link.closest('li');
        if (li) {
          li.style.display = 'none';
        } else {
          link.style.display = 'none';
        }
      }
    });
  }

  // ═══ 7. Check if current page is cart/checkout ═══
  function isCartOrCheckoutPage() {
    var path = window.location.pathname.toLowerCase();
    return path.includes('cart') || path.includes('carrinho') ||
           path.includes('checkout') || path.includes('comprar');
  }

  // ═══ 8. Home product carousel ═══
  function initHomeCarousel() {
    if (window.location.pathname !== '/' && window.location.pathname !== '') return;
    var productSection = document.querySelector('.js-product-table, .product-table, .products-grid');
    if (!productSection) return;
    var items = productSection.querySelectorAll('.js-item-product, .item-product, .product-card, .span3');
    if (items.length < 5) return;

    // Create carousel wrapper
    var carousel = document.createElement('div');
    carousel.id = 'mj-home-carousel';
    var track = document.createElement('div');
    track.className = 'carousel-track';

    // Clone items into carousel
    items.forEach(function(item) {
      var clone = item.cloneNode(true);
      clone.style.width = '';
      clone.style.marginLeft = '';
      clone.classList.add('item-product');
      track.appendChild(clone);
    });
    // Duplicate for infinite scroll effect
    items.forEach(function(item) {
      var clone = item.cloneNode(true);
      clone.style.width = '';
      clone.style.marginLeft = '';
      clone.classList.add('item-product');
      track.appendChild(clone);
    });

    carousel.appendChild(track);
    productSection.parentNode.insertBefore(carousel, productSection);
    productSection.style.display = 'none';

    // Animate carousel
    var itemsPerView = window.innerWidth > 768 ? 4 : 2;
    var totalOriginal = items.length;
    var currentIndex = 0;

    function slideNext() {
      currentIndex++;
      var itemWidth = track.children[0].offsetWidth + 16; // 16px gap
      track.style.transform = 'translateX(-' + (currentIndex * itemWidth) + 'px)';

      // Reset seamlessly when we've scrolled through all original items
      if (currentIndex >= totalOriginal) {
        setTimeout(function() {
          track.style.transition = 'none';
          currentIndex = 0;
          track.style.transform = 'translateX(0)';
          setTimeout(function() {
            track.style.transition = 'transform 0.6s cubic-bezier(0.4,0,0.2,1)';
          }, 50);
        }, 600);
      }
    }

    setInterval(slideNext, 5000);

    // Re-run label replacement on carousel clones
    replaceProductLabels();
  }

  // ═══ 9. Inject editorial section with overlapping photos (Principessa style) ═══
  function injectEditorialSection() {
    if (window.location.pathname !== '/' && window.location.pathname !== '') return;
    if (document.getElementById('mj-editorial')) return;

    // Helper to extract best URL from lazy-loaded image
    function getImgUrl(img) {
      // Try currentSrc first, then src, then data attributes
      if (img.currentSrc) return img.currentSrc;
      if (img.src && !img.src.includes('data:image')) return img.src;
      // data-srcset has multiple URLs — get the largest one
      var srcset = img.dataset.srcset || img.srcset || '';
      if (srcset) {
        var parts = srcset.split(',');
        // Get last entry (usually largest)
        var last = parts[parts.length - 1].trim().split(' ')[0];
        if (last) return last;
      }
      // Fallback to data-src
      return img.dataset.src || '';
    }

    // Find images from banner-categories section (has 2 editorial photos)
    var bannerSection = document.querySelector('[data-store="home-banner-categories"]');
    var bannerImages = bannerSection
      ? bannerSection.querySelectorAll('img')
      : document.querySelectorAll('.js-textbanner-image');

    if (bannerImages.length < 2) return;

    var img1Src = getImgUrl(bannerImages[0]);
    var img2Src = getImgUrl(bannerImages[1]);
    if (!img1Src || !img2Src) return;

    var section = document.createElement('div');
    section.id = 'mj-editorial';
    section.innerHTML =
      '<div class="editorial-text top">MODA</div>' +
      '<div class="editorial-photos">' +
        '<div class="editorial-photo"><img src="' + img1Src + '" alt="Marijasmin Editorial" loading="eager"></div>' +
        '<div class="editorial-photo"><img src="' + img2Src + '" alt="Marijasmin Editorial" loading="eager"></div>' +
      '</div>' +
      '<div class="editorial-text bottom">CRISTÃ</div>';

    // Insert after featured products section
    var productSection = document.querySelector('[data-store="home-products-featured"]');
    if (productSection && productSection.parentNode) {
      productSection.parentNode.insertBefore(section, productSection.nextSibling);
    }

    // Hide original banner-categories since we're using its images
    if (bannerSection) {
      bannerSection.style.display = 'none';
    }
  }

  // ═══ 9b. Inject editorial phrase on homepage ═══
  function injectEditorialPhrase() {
    if (window.location.pathname !== '/' && window.location.pathname !== '') return;
    if (document.getElementById('mj-editorial-phrase')) return;

    var phrases = [
      { main: 'A POESIA DE SER <em>única</em>', sub: 'MODA CRISTÃ COM PROPÓSITO' },
      { main: 'ELEGÂNCIA QUE <em>inspira</em>', sub: 'DO CEARÁ PARA TODO O BRASIL' },
      { main: 'MODÉSTIA E <em>sofisticação</em>', sub: 'CADA PEÇA CONTA UMA HISTÓRIA' }
    ];
    var phrase = phrases[Math.floor(Math.random() * phrases.length)];

    var section = document.createElement('div');
    section.id = 'mj-editorial-phrase';
    section.innerHTML =
      '<div class="phrase-main">' + phrase.main + '</div>' +
      '<div class="phrase-sub">' + phrase.sub + '</div>';

    // Insert after banner/slider, before products
    var slider = document.querySelector('.js-home-slider-section, .home-slider, .js-home-slider');
    var productSection = document.querySelector('.js-home-sections-container');
    if (slider && slider.parentNode) {
      slider.parentNode.insertBefore(section, slider.nextSibling);
    } else if (productSection) {
      productSection.insertBefore(section, productSection.firstChild);
    }
  }

  // ═══ 10. Run everything on DOM ready ═══
  function init() {
    replaceProductLabels();
    fixCategoryLinks();
    hideFooterNewsletter();
    injectEditorialPhrase();
    setTimeout(injectEditorialSection, 2500); // Wait for lazy images to load

    // Inject atacado bar ONLY on cart/checkout pages
    if (isCartOrCheckoutPage()) {
      injectAtacadoBar();
    }

    // Init home carousel
    setTimeout(initHomeCarousel, 1000);

    // Re-run on dynamic content changes
    var observer = new MutationObserver(function(mutations) {
      replaceProductLabels();
      fixCategoryLinks();
      // Only inject atacado bar on cart/checkout pages
      if (isCartOrCheckoutPage() && !document.getElementById('mj-atacado-bar')) {
        injectAtacadoBar();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ═══ 8. Inject LocalBusiness structured data (SEO) ═══
  var ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "name": "Marijasmin",
    "description": "Atacarejo de moda feminina cristã e modesta. Compre a partir de 1 peça ou monte seu atacado a partir de 5 peças. De Fortaleza para todo o Brasil.",
    "url": "https://www.marijasmin.com.br",
    "logo": "https://www.marijasmin.com.br/logo.png",
    "image": "https://www.marijasmin.com.br/logo.png",
    "telephone": "+55-85-99254-2937",
    "email": "contato@marijasmin.com.br",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Rua Fernando Fialho, 112 - Mart Office L25",
      "addressLocality": "Fortaleza",
      "addressRegion": "CE",
      "postalCode": "60711-120",
      "addressCountry": "BR"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -3.7927,
      "longitude": -38.5570
    },
    "sameAs": [
      "https://instagram.com/usemarijasmin",
      "https://www.facebook.com/usemarijasmin"
    ],
    "priceRange": "$$",
    "paymentAccepted": "Cartão de Crédito, Pix, Boleto",
    "currenciesAccepted": "BRL",
    "areaServed": {
      "@type": "Country",
      "name": "Brasil"
    },
    "brand": {
      "@type": "Brand",
      "name": "Marijasmin"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Moda Feminina Cristã",
      "itemListElement": [
        {"@type": "OfferCatalog", "name": "Vestidos"},
        {"@type": "OfferCatalog", "name": "Conjuntos"},
        {"@type": "OfferCatalog", "name": "Macacões"},
        {"@type": "OfferCatalog", "name": "Blusas"},
        {"@type": "OfferCatalog", "name": "Saias"},
        {"@type": "OfferCatalog", "name": "Calças"}
      ]
    }
  });
  document.head.appendChild(ld);

})();
