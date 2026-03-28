/**
 * MARIJASMIN - Checkout Customization
 * Substitui "41% OFF em comprando 5 ou mais" por mensagem de atacado
 */
(function() {
  function fixPromoText() {
    var elements = document.querySelectorAll("td, span, div, p, small, strong");
    var found = false;
    elements.forEach(function(el) {
      var txt = el.textContent.trim();
      if (txt.match(/\d+%\s*OFF\s*(em\s*)?comprando\s*\d+\s*ou\s*mais/i) && !el.classList.contains("mj-fixed")) {
        el.innerHTML = "\uD83D\uDCE6 Desconto Atacado Marijasmin";
        el.style.color = "#810947";
        el.style.fontWeight = "bold";
        el.classList.add("mj-fixed");
        found = true;
      }
    });

    /* Se achou desconto atacado, adicionar badge */
    if (found && !document.querySelector(".marijasmin-atacado-badge")) {
      var orderSummary = document.querySelector("[class*='summary'], [class*='order'], [class*='total'], .product-list, .cart-summary");
      if (orderSummary) {
        var badge = document.createElement("div");
        badge.className = "marijasmin-atacado-badge";
        badge.style.cssText = "background:linear-gradient(135deg,#810947 0%,#a3125e 100%);color:#fff;padding:12px 16px;border-radius:8px;font-size:13px;margin:12px 0;text-align:center;line-height:1.5;";
        badge.innerHTML = "<strong style='display:block;font-size:15px;margin-bottom:4px;'>\uD83C\uDF89 Compra no Atacado!</strong>Voc\u00ea atingiu 5+ pe\u00e7as e est\u00e1 comprando com pre\u00e7o especial de atacado.";
        orderSummary.parentNode.insertBefore(badge, orderSummary);
      }
    }
  }

  /* Executar quando DOM estiver pronto */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      fixPromoText();
      var observer = new MutationObserver(function() { fixPromoText(); });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    fixPromoText();
    var observer = new MutationObserver(function() { fixPromoText(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
