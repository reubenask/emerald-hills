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

  function collectMarkedReview() {
    var rows = [];
    document.querySelectorAll("input[type='radio']:checked, input[type='checkbox']:checked, select").forEach(function (el, index) {
      var question = el.name || el.id || el.getAttribute("data-q") || el.getAttribute("data-qnum") || "Q" + (index + 1);
      var holder = el.closest("label") || el.closest(".question") || el.closest(".question-card") || el.parentElement;
      var classText = "";
      var text = "";
      if (holder) {
        classText = holder.className || "";
        text = (holder.textContent || "").trim().replace(/\s+/g, " ");
      }
      var result = /wrong|incorrect|is-wrong|answered-incorrect/i.test(classText)
        ? "Incorrect"
        : /correct|is-correct|answered-correct/i.test(classText)
          ? "Correct"
          : "Saved";
      var correctMatch = text.match(/correct answer[:\s-]+([A-D]|\w+)/i);
      rows.push({
        question: question,
        studentAnswer: el.value || "",
        correctAnswer: correctMatch ? correctMatch[1] : "",
        correct: result === "Correct" ? true : result === "Incorrect" ? false : null,
        result: result
      });
    });
    document.querySelectorAll(".is-wrong,.wrong,.answered-incorrect,.is-correct,.correct,.answered-correct").forEach(function (el, index) {
      var text = (el.textContent || "").trim().replace(/\s+/g, " ");
      if (!text) return;
      rows.push({
        question: el.getAttribute("data-q") || el.getAttribute("data-qnum") || "Marked item " + (index + 1),
        studentAnswer: text,
        correctAnswer: "",
        correct: /wrong|incorrect/i.test(el.className || "") ? false : /correct/i.test(el.className || "") ? true : null,
        result: /wrong|incorrect/i.test(el.className || "") ? "Incorrect" : /correct/i.test(el.className || "") ? "Correct" : "Saved"
      });
    });
    return rows.filter(function (row, index, all) {
      var key = row.question + "|" + row.studentAnswer + "|" + row.result;
      return all.findIndex(function (item) {
        return (item.question + "|" + item.studentAnswer + "|" + item.result) === key;
      }) === index;
    });
  }

  function notify(autoSubmitted) {
    if (!isComplete() || window.__ehExamSubmitted) return;
    window.__ehExamSubmitted = true;
    var scoreText = visibleText("#scoreDetail") || visibleText("#scoreDisplay") || visibleText("#results") || "Submitted for teacher review";
    window.parent.postMessage({
      type: "eh-exam-submitted",
      section: document.title || "Junior exam",
      answers: collectAnswers(),
      marked: collectMarkedReview(),
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
