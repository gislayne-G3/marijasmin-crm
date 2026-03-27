(function(){
  // ═══ MARIJASMIN CUSTOM THEME ═══
  
  // 1. Inject Google Fonts
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap';
  document.head.appendChild(link);

  // 2. Inject Custom CSS
  var style = document.createElement('style');
  style.id = 'mj-custom-css';
  style.textContent = `
    :root {
      --raspberry: #810947;
      --raspberry-dark: #7B1148;
      --petal: #BB7B9C;
      --bg-site: #F7F5F2;
      --bg-card: #FFFFFF;
      --text-primary: #2E2E2E;
      --text-muted: #8C8C8C;
      --border: #E8E6E0;
    }
    h1, h2, h3, .js-item-name, .item-name,
    .banner-texts h1, .banner-texts h2,
    .section-title, .category-header h1 {
      font-family: 'Cormorant Garamond', serif !important;
      font-weight: 500;
      color: var(--text-primary);
    }
    body, p, span, a, button, input, select, textarea, li,
    .js-item-price, .item-price, .breadcrumb {
      font-family: 'Inter', sans-serif !important;
    }
    body { background-color: var(--bg-site) !important; }

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
      letter-spacing: 1px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      box-shadow: none !important;
      transition: background-color 0.2s ease !important;
    }
    .btn-primary:hover, .js-addtocart:hover, .js-buy-now:hover,
    button[type="submit"]:hover, .btn--primary:hover,
    .btn-checkout:hover {
      background-color: var(--raspberry-dark) !important;
      border-color: var(--raspberry-dark) !important;
    }
    .btn-secondary, .btn--secondary {
      background: transparent !important;
      border: 0.5px solid var(--raspberry) !important;
      color: var(--raspberry) !important;
      border-radius: 2px !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      font-size: 12px !important;
    }
    .btn-secondary:hover, .btn--secondary:hover {
      background-color: var(--raspberry) !important;
      color: #FFFFFF !important;
    }
    a { color: var(--raspberry); }
    a:hover { color: var(--raspberry-dark); }
    
    .js-head-main, header, .head-main, .nav-header {
      background-color: #FEFEFE !important;
      border-bottom: 0.5px solid var(--border) !important;
      box-shadow: none !important;
    }
    .js-item-product, .item-product, .product-card {
      background: var(--bg-card) !important;
      border: 0.5px solid var(--border) !important;
      border-radius: 6px !important;
      box-shadow: none !important;
      transition: border-color 0.2s ease !important;
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
      border-radius: 2px !important;
      font-size: 10px !important;
      text-transform: uppercase !important;
    }
    footer, .footer {
      background-color: #2E2E2E !important;
      color: #FFFFFF !important;
    }
    footer a, .footer a { color: #CCCCCC !important; }
    footer a:hover, .footer a:hover { color: #FFFFFF !important; }
    
    input, select, textarea {
      border: 0.5px solid var(--border) !important;
      border-radius: 2px !important;
      box-shadow: none !important;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--raspberry) !important;
      outline: none !important;
    }

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
    @media (max-width: 768px) {
      #mj-topbar { font-size: 10px !important; padding: 6px 12px !important; }
    }
  `;
  document.head.appendChild(style);

  // 3. Create top communication bar
  var topbar = document.createElement('div');
  topbar.id = 'mj-topbar';
  var messages = [
    'Moda feminina cristã e modesta — Fortaleza para o Brasil',
    'Frete grátis acima de R$299 para todo o Brasil',
    'Parcelamos em até 3x sem juros',
    'Troca grátis em até 7 dias após entrega',
    'Atacado a partir de R$350 — Seja revendedora Marijasmin'
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

})();
