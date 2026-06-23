(function () {
  function params() {
    return new URLSearchParams(window.location.search);
  }

  function setFirst(ids, value) {
    if (!value) return;
    ids.some(function (id) {
      var el = document.getElementById(id);
      if (!el) return false;
      el.value = value;
      return true;
    });
  }

  function prefillStudent() {
    var search = params();
    setFirst(["studentName"], search.get("student"));
    setFirst(["studentClass", "className"], search.get("className"));
    setFirst(["studentDate", "examDate", "testDate"], search.get("date"));
  }

  function visibleText(selector) {
    var el = document.querySelector(selector);
    if (!el) return "";
    var style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return "";
    return (el.textContent || "").trim();
  }

  function isComplete() {
    if (document.querySelector(".test-complete.show")) return true;
    if (visibleText("#scoreSummary") || visibleText("#results")) return true;
    if (document.getElementById("submitBtn") && document.getElementById("submitBtn").disabled) return true;
    if (document.getElementById("btnSubmit") && document.getElementById("btnSubmit").disabled) return true;
    if (document.getElementById("submitTestBtn") && document.getElementById("submitTestBtn").disabled) return true;
    return /Answer Review|Speaking Practice Complete|Score:/i.test(document.body ? document.body.textContent || "" : "");
  }

  function collectAnswers() {
    var rows = [];
    document.querySelectorAll("input, textarea, select").forEach(function (el) {
      var type = (el.type || "").toLowerCase();
      if (["button", "submit", "reset", "file"].includes(type)) return;
      if ((type === "radio" || type === "checkbox") && !el.checked) return;
      var key = el.name || el.id || el.getAttribute("data-q") || el.getAttribute("data-qnum") || el.getAttribute("data-eq") || "answer";
      var value = el.value || el.textContent || "";
      if (String(value).trim()) rows.push(key + ": " + String(value).trim());
    });
    document.querySelectorAll(".selected, .is-correct, .is-wrong, .answered-correct, .answered-incorrect").forEach(function (el) {
      var text = (el.textContent || "").trim().replace(/\s+/g, " ");
      if (text) rows.push(text);
    });
    return rows;
  }

  function notify(autoSubmitted) {
    if (!isComplete() || window.__ehExamSubmitted) return;
    window.__ehExamSubmitted = true;
    var scoreText = visibleText("#scoreDetail") || visibleText("#scoreDisplay") || visibleText("#results") || "Submitted for teacher review";
    window.parent.postMessage({
      type: "eh-exam-submitted",
      section: document.title || "Junior exam",
      answers: collectAnswers(),
      scoreLabel: scoreText,
      autoSubmitted: Boolean(autoSubmitted)
    }, "*");
  }

  function wrap(name) {
    var original = window[name];
    if (typeof original !== "function" || original.__ehWrapped) return;
    window[name] = function () {
      var result = original.apply(this, arguments);
      var autoSubmitted = arguments && arguments[0] === true;
      setTimeout(function () {
        notify(autoSubmitted);
      }, 300);
      return result;
    };
    window[name].__ehWrapped = true;
  }

  function install() {
    prefillStudent();
    ["submitTest", "submitExam", "gradeQuiz", "completeTest", "advanceWizard"].forEach(wrap);
  }

  install();
  document.addEventListener("DOMContentLoaded", install);
  window.addEventListener("load", install);
})();
