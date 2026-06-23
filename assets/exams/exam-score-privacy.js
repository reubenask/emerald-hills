(function () {
  var message = [
    "Section submitted.",
    "Your answers have been saved under your Emerald Hills account.",
    "Scores open only after the full monthly test is submitted. Speaking and writing remain pending until the teacher marks them."
  ];

  function addStyle() {
    if (document.getElementById("eh-score-privacy-style")) return;
    var style = document.createElement("style");
    style.id = "eh-score-privacy-style";
    style.textContent = [
      ".eh-score-privacy-card{margin:18px auto;padding:22px 24px;max-width:780px;border-radius:12px;background:#f7f3ea;border:1px solid rgba(31,122,92,.22);box-shadow:0 10px 26px rgba(0,0,0,.08);text-align:center;color:#10231c;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".eh-score-privacy-card strong{display:block;margin-bottom:8px;font-family:Georgia,serif;font-size:1.45rem}",
      ".eh-score-privacy-card span{display:block;color:#5f6b64;line-height:1.55}",
      ".correct,.wrong,.is-correct,.is-wrong,.answered-correct,.answered-incorrect{background:inherit!important;border-color:rgba(31,122,92,.18)!important;color:inherit!important}",
      ".correct::after,.wrong::after,.is-correct::after,.is-wrong::after{content:''!important}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function privacyCard() {
    return '<div class="eh-score-privacy-card"><strong>' + message[0] + '</strong><span>' + message[1] + '<br>' + message[2] + '</span></div>';
  }

  function maskElement(el) {
    if (!el || el.dataset.ehScoreMasked === "true") return;
    var text = (el.textContent || "").trim();
    if (!/score|correct|wrong|result|submitted|complete|answer review/i.test(text)) return;
    el.dataset.ehScoreMasked = "true";
    el.innerHTML = privacyCard();
    el.style.display = "block";
  }

  function maskScores() {
    addStyle();
    [
      "#scoreSummary",
      "#results",
      ".score-panel",
      ".score-banner",
      ".result-panel",
      ".results-panel",
      ".answer-review",
      ".review-panel"
    ].forEach(function (selector) {
      document.querySelectorAll(selector).forEach(maskElement);
    });
  }

  function scheduleMask() {
    window.setTimeout(maskScores, 900);
    window.setTimeout(maskScores, 1800);
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target) return;
    var text = ((target.textContent || "") + " " + (target.value || "") + " " + (target.id || "")).toLowerCase();
    if (/submit|complete|finish|grade|score/.test(text)) scheduleMask();
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    addStyle();
    var observer = new MutationObserver(scheduleMask);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  });

  window.addEventListener("load", addStyle);
})();
