let allQuestions = [];
let questions = [];
let currentIndex = 0;
let currentSection = null;

// "all" = normal run through the whole section
// "wrong" = only questions previously answered incorrectly in this section
let quizMode = "all";

const STORAGE_KEY = "quizProgress_v2";

const SECTION_META = {
  "digital-images-and-image-processing": "Digital images and image processing",
  "image-filtering-and-edge-detection": "Image filtering and edge detection",
  "image-matching-interest-point-detection-and-feature-descriptors":
    "Image matching: interest point detection and feature descriptors"
};

/** ---------- Helpers ---------- **/
function $(id) {
  return document.getElementById(id);
}

function showError(msg) {
  console.error(msg);
  const box = $("feedback") || $("errorBox");
  if (box) {
    box.style.color = "#ff6b6b";
    box.style.padding = "12px";
    box.style.marginTop = "12px";
    box.style.border = "1px solid rgba(255,107,107,.6)";
    box.style.background = "rgba(255,107,107,.08)";
    box.style.borderRadius = "10px";
    box.innerText = "ERROR: " + msg;
  } else {
    alert("ERROR: " + msg);
  }
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { answered: {} };
  } catch {
    return { answered: {} };
  }
}

function saveProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

window.resetProgress = resetProgress;

function getQuestionById(id) {
  return allQuestions.find(q => String(q.id) === String(id));
}

function computeSectionScore(sectionKey) {
  const progress = loadProgress();
  const sectionQs = allQuestions.filter(q => q.section === sectionKey);
  let answered = 0;
  let correct = 0;

  sectionQs.forEach(q => {
    const rec = progress.answered?.[q.id];
    if (rec) {
      answered++;
      if (rec.correct) correct++;
    }
  });

  return { answered, correct, total: sectionQs.length };
}

function updateSectionScoreUI() {
  const scoreEl = $("sectionScore");
  const counterEl = $("questionCounter");

  if (!scoreEl || !counterEl) {
    const container = document.querySelector(".container");
    const progressBar = document.querySelector(".progress-bar");
    if (container && progressBar) {
      let row = document.querySelector(".score-row");
      if (!row) {
        row = document.createElement("div");
        row.className = "score-row";

        const counter = document.createElement("span");
        counter.id = "questionCounter";
        counter.innerText = "Question 1/1";

        const score = document.createElement("span");
        score.id = "sectionScore";
        score.innerText = "Score: 0/0 (0%)";

        row.appendChild(counter);
        row.appendChild(score);
        progressBar.insertAdjacentElement("afterend", row);
      }
    }
  }

  const scoreEl2 = $("sectionScore");
  const counterEl2 = $("questionCounter");

  if (counterEl2) {
    const shownIndex = Math.min(currentIndex + 1, questions.length || 1);
    counterEl2.innerText = `Question ${shownIndex}/${questions.length || 1}`;
  }

  if (scoreEl2) {
    const s = computeSectionScore(currentSection);
    const pct = s.answered
      ? Math.round((s.correct / s.answered) * 100)
      : 0;
    scoreEl2.innerText = `Score: ${s.correct}/${s.answered} (${pct}%)`;
  }
}

/** ---------- Load Questions ---------- **/
async function loadQuestionsJson() {
  const res = await fetch("./questions.json?v=" + Date.now());
  if (!res.ok)
    throw new Error(
      "Could not load questions.json (HTTP " + res.status + ")"
    );

  const data = await res.json();

  if (!Array.isArray(data))
    throw new Error("questions.json must be an array [ ... ]");

  for (let i = 0; i < data.length; i++) {
    const q = data[i];
    if (!q.section || !q.question || !q.choices || !q.answer) {
      throw new Error("Invalid question format at index " + i);
    }
  }

  data.forEach((q, idx) => {
    if (!q.id) q.id = String(idx + 1);
  });

  return data;
}

/** ---------- Home Page ---------- **/
function initHome() {
  const progress = loadProgress();
  const answeredCount = Object.keys(progress.answered).length;
  const total = allQuestions.length;

  const pct = total
    ? Math.round((answeredCount / total) * 100)
    : 0;

  const bar = $("overallProgress");
  const txt = $("progressText");

  if (bar) bar.style.width = pct + "%";
  if (txt) txt.innerText = pct + "%";
}

/** ---------- Quiz Page ---------- **/
function loadQuestion() {
  if (!questions.length) {
    showError(
      "No questions found for this section. Check that your questions.json uses a valid section key."
    );
    return;
  }

  if (currentIndex >= questions.length) {
    const qs = new URLSearchParams();
    if (currentSection) qs.set("section", currentSection);
    if (quizMode === "wrong") qs.set("mode", "wrong");
    location.href = "results.html?" + qs.toString();
    return;
  }

  const q = questions[currentIndex];

  $("questionText").innerText = q.question;
  const choicesDiv = $("choices");
  choicesDiv.innerHTML = "";
  $("feedback").innerText = "";

  Object.keys(q.choices).forEach(key => {
    const btn = document.createElement("button");
    btn.innerText = `${key}. ${q.choices[key]}`;
    btn.style.display = "block";
    btn.style.margin = "10px 0";
    btn.style.width = "100%";
    btn.onclick = () => checkAnswer(q, key);
    choicesDiv.appendChild(btn);
  });

  updateSectionProgress();
  updateSectionScoreUI();
}

function checkAnswer(q, selectedKey) {
  const correctKey = q.answer;
  const buttons = document.querySelectorAll("#choices button");
  const feedback = $("feedback");

  buttons.forEach(btn => (btn.disabled = true));

  buttons.forEach(btn => {
    const btnKey = btn.innerText.trim().charAt(0);
    if (btnKey === correctKey) btn.classList.add("correct");
    if (btnKey === selectedKey && selectedKey !== correctKey)
      btn.classList.add("wrong");
  });

  if (selectedKey === correctKey) {
    feedback.style.color = "#1e8e3e";
    feedback.innerText = "Correct!";
  } else {
    feedback.style.color = "#d93025";
    feedback.innerText =
      "Wrong! Correct answer: " + correctKey;
  }

  const progress = loadProgress();
  progress.answered[q.id] = {
    chosen: selectedKey,
    correct: selectedKey === correctKey
  };
  saveProgress(progress);

  updateSectionScoreUI();
}

function updateSectionProgress() {
  const bar = $("sectionProgress");
  if (!bar) return;
  const pct = questions.length
    ? Math.round((currentIndex / questions.length) * 100)
    : 0;
  bar.style.width = pct + "%";
}

/** ---------- Results Page ---------- **/
function initResults() {
  const progress = loadProgress();
  const params = new URLSearchParams(window.location.search);
  const section = params.get("section");
  const mode = params.get("mode");

  const scopeQs = section
    ? allQuestions.filter(q => q.section === section)
    : allQuestions;

  let answered = 0;
  let correct = 0;
  let wrongIds = [];

  scopeQs.forEach(q => {
    const rec = progress.answered?.[q.id];
    if (rec) {
      answered++;
      if (rec.correct) correct++;
      else wrongIds.push(q.id);
    }
  });

  if ($("answered")) $("answered").innerText = answered;
  if ($("correct")) $("correct").innerText = correct;
  if ($("accuracy"))
    $("accuracy").innerText = answered
      ? Math.round((correct / answered) * 100)
      : 0;

  const title = $("resultsTitle");
  if (title) {
    if (section) {
      title.innerText =
        (SECTION_META[section] || section) + " — Results";
      if (mode === "wrong")
        title.innerText =
          (SECTION_META[section] || section) +
          " — Wrong Questions Review";
    } else {
      title.innerText = "Overall Results";
    }
  }

  const reviewWrap = $("reviewWrongWrap");
  const reviewBtn = $("reviewWrongBtn");
  const wrongCount = $("wrongCount");

  if (reviewWrap && reviewBtn && wrongCount) {
    if (section && wrongIds.length > 0) {
      wrongCount.innerText = String(wrongIds.length);
      reviewBtn.onclick = () => {
        const qp = new URLSearchParams();
        qp.set("section", section);
        qp.set("mode", "wrong");
        location.href = "quiz.html?" + qp.toString();
      };
      reviewWrap.style.display = "block";
    } else {
      reviewWrap.style.display = "none";
    }
  }
}

/** ---------- Router ---------- **/
(async function main() {
  try {
    allQuestions = await loadQuestionsJson();
  } catch (err) {
    showError(
      err.message +
        "\n\nIf deployed on GitHub Pages, ensure questions.json exists in the same folder as app.js."
    );
    return;
  }

  const params = new URLSearchParams(window.location.search);
  currentSection = params.get("section");
  quizMode = params.get("mode") === "wrong" ? "wrong" : "all";

  if ($("questionText")) {
    if (!currentSection) {
      showError(
        "Missing section in URL. Use quiz.html?section=<section-key>."
      );
      return;
    }

    const sectionQs = allQuestions.filter(
      q => q.section === currentSection
    );

    if (quizMode === "wrong") {
      const prog = loadProgress();
      questions = sectionQs.filter(q => {
        const rec = prog.answered?.[q.id];
        return rec && rec.correct === false;
      });
    } else {
      questions = sectionQs;
    }

    if (quizMode === "wrong" && questions.length === 0) {
      const qs = new URLSearchParams();
      qs.set("section", currentSection);
      qs.set("mode", "wrong");
      location.href = "results.html?" + qs.toString();
      return;
    }

    const title = $("sectionTitle");
    if (title) {
      const base =
        SECTION_META[currentSection] || currentSection;
      title.innerText =
        quizMode === "wrong"
          ? `Review Wrong — ${base}`
          : `Quiz — ${base}`;
    }

    $("nextBtn")?.addEventListener("click", () => {
      currentIndex++;
      loadQuestion();
    });

    loadQuestion();
  } else if ($("overallProgress")) {
    initHome();
  } else if ($("answered")) {
    initResults();
  }
})();
