(function(){
  // ═══ MARIJASMIN CUSTOM THEME v2 ═══

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

    /* ═══ Header ═══ */
    .js-head-main, header, .head-main, .nav-header {
      background-color: #FEFEFE !important;
      border-bottom: 0.5px solid var(--border) !important;
      box-shadow: none !important;
    }
    .nav-primary a, .nav-desktop a {
      font-family: 'Inter', sans-serif !important;
      font-size: 12px !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase !important;
      color: var(--text-primary) !important;
    }
    .nav-primary a:hover, .nav-desktop a:hover {
      color: var(--raspberry) !important;
    }

    /* ═══ Buttons ═══ */
    .btn-primary, .js-addtocart, .js-buy-now,
    button[type="submit"], .btn--primary,
    .btn-checkout, .js-open-cart,
    .js-cart-widget-btn, .cart-btn,
    .btn-submit, #btn-add-to-cart {
      background-color: var(--raspberry) !important;
      border-color: var(--raspberry) !important;
      color: #FFFFFF !important;
      border-radius: 2px !important;
      text-transform: uppercase !important;
      letter-spacing: 1.2px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      box-shadow: none !important;
      transition: all 0.25s ease !important;
      padding: 12px 28px !important;
    }
    .btn-primary:hover, .js-addtocart:hover, .js-buy-now:hover,
    button[type="submit"]:hover, .btn--primary:hover,
    .btn-checkout:hover {
      background-color: var(--raspberry-dark) !important;
      border-color: var(--raspberry-dark) !important;
    }
    .btn-secondary, .btn--secondary, .btn-link {
      background: transparent !important;
      border: 0.5px solid var(--raspberry) !important;
      color: var(--raspberry) !important;
      border-radius: 2px !important;
      text-transform: uppercase !important;
      letter-spacing: 1.2px !important;
      font-size: 12px !important;
      transition: all 0.25s ease !important;
    }
    .btn-secondary:hover, .btn--secondary:hover {
      background-color: var(--raspberry) !important;
      color: #FFFFFF !important;
    }
    a { color: var(--raspberry); }
    a:hover { color: var(--raspberry-dark); }

    /* ═══ Product Cards ═══ */
    .js-item-product, .item-product, .product-card {
      background: var(--bg-card) !important;
      border: 0.5px solid var(--border) !important;
      border-radius: 4px !important;
      box-shadow: none !important;
      transition: border-color 0.25s ease !important;
      overflow: hidden;
    }
    .js-item-product:hover, .item-product:hover {
      border-color: var(--petal) !important;
    }
    .js-price-display, .item-price, .price,
    .js-product-price, .product-price {
      color: var(--raspberry) !important;
      font-weight: 600 !important;
    }
    .label, .badge, .js-stock-label, .product-label {
      background-color: var(--raspberry) !important;
      color: #FFFFFF !important;
      border-radius: 0 !important;
      font-size: 10px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
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
    .banner-services-item, .service-item {
      text-align: center !important;
    }
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

    /* ═══ Newsletter ═══ */
    .section-newsletter, [data-store="home-newsletter"] {
      background-color: var(--raspberry) !important;
      color: #FFFFFF !important;
      text-align: center !important;
    }
    .section-newsletter h2, [data-store="home-newsletter"] h2 {
      color: #FFFFFF !important;
      font-family: 'Cormorant Garamond', serif !important;
    }
    .section-newsletter p, [data-store="home-newsletter"] p,
    .section-newsletter .text-small {
      color: rgba(255,255,255,0.85) !important;
    }
    .section-newsletter input[type="email"],
    [data-store="home-newsletter"] input[type="email"] {
      background: rgba(255,255,255,0.15) !important;
      border: 0.5px solid rgba(255,255,255,0.3) !important;
      color: #FFFFFF !important;
      border-radius: 2px !important;
    }
    .section-newsletter input[type="email"]::placeholder {
      color: rgba(255,255,255,0.6) !important;
    }
    .section-newsletter button,
    [data-store="home-newsletter"] button {
      background-color: #FFFFFF !important;
      color: var(--raspberry) !important;
      border: none !important;
    }
    .section-newsletter button:hover,
    [data-store="home-newsletter"] button:hover {
      background-color: var(--bg-site) !important;
    }

    /* ═══ Testimonials ═══ */
    .section-testimonials, [data-store="home-testimonials"] {
      background-color: var(--bg-warm) !important;
    }
    .testimonial-item, .js-testimonial {
      text-align: center !important;
    }
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
    .section-banners-home {
      box-shadow: none !important;
    }
    .section-banners-home img {
      border-radius: 4px !important;
    }
    .banner-overlay, .banner-texts {
      background: linear-gradient(0deg, rgba(0,0,0,0.45) 0%, transparent 60%) !important;
    }
    .banner-texts h3, .banner-texts .title {
      font-family: 'Cormorant Garamond', serif !important;
      color: #FFFFFF !important;
      font-size: 22px !important;
      font-weight: 500 !important;
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
    .js-home-slider .swiper-button-prev:hover {
      opacity: 1;
    }
    .swiper-pagination-bullet-active {
      background-color: var(--raspberry) !important;
    }

    /* ═══ Category Page ═══ */
    .category-header {
      text-align: center !important;
      padding: 32px 0 !important;
    }
    .category-header h1 {
      font-size: 32px !important;
    }

    /* ═══ Product Page ═══ */
    .product-page h1, .js-product-name {
      font-family: 'Cormorant Garamond', serif !important;
      font-size: 28px !important;
      font-weight: 500 !important;
    }
    .product-description {
      line-height: 1.7 !important;
      color: var(--text-primary) !important;
    }
    .variant-label, .js-variant-label {
      font-size: 12px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      font-weight: 500 !important;
    }

    /* ═══ Cart ═══ */
    .cart-summary, .js-ajax-cart-wrapper {
      background-color: var(--bg-card) !important;
      box-shadow: none !important;
      border: 0.5px solid var(--border) !important;
    }

    /* ═══ Footer ═══ */
    footer, .footer {
      background-color: #2E2E2E !important;
      color: #FFFFFF !important;
      border-top: 3px solid var(--raspberry) !important;
    }
    footer a, .footer a { color: #CCCCCC !important; }
    footer a:hover, .footer a:hover { color: #FFFFFF !important; }
    footer h3, .footer h3 {
      font-family: 'Cormorant Garamond', serif !important;
      font-size: 16px !important;
      color: #FFFFFF !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
    }

    /* ═══ Inputs ═══ */
    input, select, textarea {
      border: 0.5px solid var(--border) !important;
      border-radius: 2px !important;
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

    /* ═══ Topbar ═══ */
    #mj-topbar {
      background-color: var(--raspberry) !important;
      color: #FFFFFF !important;
      text-align: center !important;
      padding: 8px 16px !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 11px !important;
      letter-spacing: 0.5px !important;
      position: relative !important;
      z-index: 9999 !important;
      overflow: hidden !important;
      line-height: 1.4 !important;
    }
    #mj-topbar .topbar-msg { display: none; }
    #mj-topbar .topbar-msg.active { display: block; animation: mjFade 0.4s ease; }
    @keyframes mjFade {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ═══ Responsive ═══ */
    @media (max-width: 768px) {
      #mj-topbar { font-size: 10px !important; padding: 6px 12px !important; }
      .js-home-sections-container h2,
      [data-store] h2 { font-size: 24px !important; }
      .product-page h1, .js-product-name { font-size: 22px !important; }
    }

    /* ═══ Scrollbar ═══ */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-site); }
    ::-webkit-scrollbar-thumb { background: var(--petal); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--raspberry); }

    /* ═══ Selection ═══ */
    ::selection { background-color: var(--petal-light); color: var(--text-primary); }
  `;
  document.head.appendChild(style);

  // 3. Create top communication bar
  var topbar = document.createElement('div');
  topbar.id = 'mj-topbar';
  var messages = [
    'Atacarejo Marijasmin \u2014 compre a partir de 1 pe\u00e7a ou monte seu atacado',
    'Frete gr\u00e1tis no atacado acima de R$1.500 para todo o Brasil',
    'Atacado a partir de R$350 \u2014 pre\u00e7os exclusivos para revendedoras',
    'Parcelamos em at\u00e9 3x sem juros \u2014 varejo e atacado',
    'Junte-se \u00e0 comunidade Marijasmin \u2014 mais de 500 revendedoras no Brasil'
  ];
  messages.forEach(function(msg, i) {
    var span = document.createElement('span');
    span.className = 'topbar-msg' + (i === 0 ? ' active' : '');
    span.textContent = msg;
    topbar.appendChild(span);
  });
  document.body.insertBefore(topbar, document.body.firstChild);

  // Rotate messages
  var current = 0;
  setInterval(function() {
    var msgs = topbar.querySelectorAll('.topbar-msg');
    msgs[current].classList.remove('active');
    current = (current + 1) % msgs.length;
    msgs[current].classList.add('active');
  }, 4000);

  // 4. Inject LocalBusiness structured data (SEO)
  var ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "name": "Marijasmin",
    "description": "Atacarejo de moda feminina cristã e modesta. Compre a partir de 1 peça ou monte seu atacado. De Fortaleza para todo o Brasil.",
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
