// app.js (fixed + debug)
let allQuestions = [];
let questions = [];
let currentIndex = 0;
let currentSection = null;

const STORAGE_KEY = "quizProgress_v2";



const SECTION_META = {
  "digital-images-and-image-processing": "Digital images and image processing",
  "image-filtering-and-edge-detection": "Image filtering and edge detection",
  "image-matching-interest-point-detection-and-feature-descriptors": "Image matching: interest point detection and feature descriptors"
};
/** ---------- Helpers ---------- **/
function $(id) { return document.getElementById(id); }

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
  // IDs are strings
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
  // If the quiz HTML is older / cached and doesn't include the score row,
  // create it dynamically so the feature always shows up.
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

        // Insert right after the progress bar
        progressBar.insertAdjacentElement("afterend", row);
      }
    }
  }

  const scoreEl2 = $("sectionScore");
  const counterEl2 = $("questionCounter");
  if (!scoreEl2 && !counterEl2) return;

  // Question counter (where you are in this section)
  if (counterEl2) {
    const shownIndex = Math.min(currentIndex + 1, questions.length || 1);
    counterEl2.innerText = `Question ${shownIndex}/${questions.length || 1}`;
  }

  // Score for this section (persisted via localStorage)
  if (scoreEl2) {
    const s = computeSectionScore(currentSection);
    const pct = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
    scoreEl2.innerText = `Score: ${s.correct}/${s.answered} (${pct}%)`;
  }
}

/** ---------- Load Questions ---------- **/
async function loadQuestionsJson() {
  // cache-bust so browser doesn’t use an old file
  const res = await fetch("questions.json?v=" + Date.now());
  if (!res.ok) throw new Error("Could not load questions.json (HTTP " + res.status + ")");
  const data = await res.json();

  if (!Array.isArray(data)) throw new Error("questions.json must be an array [ ... ]");

  // Validate minimum structure
  for (let i = 0; i < data.length; i++) {
    const q = data[i];
    if (!q.section || !q.question || !q.choices || !q.answer) {
      throw new Error("Invalid question format at index " + i);
    }
  }

  // Add stable IDs (so progress works)
  data.forEach((q, idx) => { if (!q.id) q.id = String(idx + 1); });

  return data;
}

/** ---------- Home Page ---------- **/
function initHome() {
  const progress = loadProgress();
  const answeredCount = Object.keys(progress.answered).length;
  const total = allQuestions.length;

  const pct = total ? Math.round((answeredCount / total) * 100) : 0;
  const bar = $("overallProgress");
  const txt = $("progressText");

  if (bar) bar.style.width = pct + "%";
  if (txt) txt.innerText = pct + "%";

  // Optional: show totals if you add elements later
}

/** ---------- Quiz Page ---------- **/
function loadQuestion() {
  if (!questions.length) {
    showError(
      "No questions found for this section. " +
      "Check that your questions.json uses one of these section keys: " + Object.keys(SECTION_META).join(", ") +
      " and your URL is quiz.html?section=<section-key>."
    );
    return;
  }

  if (currentIndex >= questions.length) {
    // go to results page when finished
    location.href = "results.html";
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
    const feedback = document.getElementById("feedback");
  
    // Disable all buttons after selection
    buttons.forEach(btn => btn.disabled = true);
  
    buttons.forEach(btn => {
      const btnKey = btn.innerText.trim().charAt(0); // first letter A/B/C/D
  
      if (btnKey === correctKey) {
        btn.classList.add("correct");
      }
  
      if (btnKey === selectedKey && selectedKey !== correctKey) {
        btn.classList.add("wrong");
      }
    });
  
    if (selectedKey === correctKey) {
      feedback.style.color = "#1e8e3e";
      feedback.innerText = "Correct!";
    } else {
      feedback.style.color = "#d93025";
      feedback.innerText = "Wrong! Correct answer: " + correctKey;
    }
  
    // Save progress
    const progress = loadProgress();
    progress.answered[q.id] = {
      chosen: selectedKey,
      correct: selectedKey === correctKey
    };
    saveProgress(progress);

    // Update per-section score UI immediately after answering
    updateSectionScoreUI();
  }

function updateSectionProgress() {
  const bar = $("sectionProgress");
  if (!bar) return;
  const pct = questions.length ? Math.round((currentIndex / questions.length) * 100) : 0;
  bar.style.width = pct + "%";
}

/** ---------- Results Page ---------- **/
function initResults() {
  const progress = loadProgress();
  const answeredIds = Object.keys(progress.answered);

  let correct = 0;
  answeredIds.forEach(id => {
    if (progress.answered[id].correct) correct++;
  });

  if ($("answered")) $("answered").innerText = answeredIds.length;
  if ($("correct")) $("correct").innerText = correct;
  if ($("accuracy")) {
    $("accuracy").innerText = answeredIds.length ? Math.round((correct / answeredIds.length) * 100) : 0;
  }
}

/** ---------- Router ---------- **/
(async function main() {
  try {
    allQuestions = await loadQuestionsJson();
  } catch (err) {
    showError(err.message + "\n\nMost common fix: run a local server (python3 -m http.server 8000) and open http://localhost:8000/");
    return;
  }

  // Detect section from URL (quiz page)
  const params = new URLSearchParams(window.location.search);
  currentSection = params.get("section"); // one of the keys in SECTION_META

  if ($("questionText")) {
    // quiz page
    if (!currentSection) {
      showError("Missing section in URL. Use quiz.html?section=<section-key>, where <section-key> is one of: " + Object.keys(SECTION_META).join(", "));
      return;
    }

    questions = allQuestions.filter(q => q.section === currentSection);

    // set title if present
    const title = $("sectionTitle");
    if (title) title.innerText = "Quiz — " + (SECTION_META[currentSection] || currentSection);

    $("nextBtn")?.addEventListener("click", () => {
      currentIndex++;
      loadQuestion();
    });

    loadQuestion();
  } else if ($("overallProgress")) {
    // home page
    initHome();
  } else if ($("answered")) {
    // results page
    initResults();
  }
})();