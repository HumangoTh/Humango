/* ============================================================
   HUMANgo — Assessment Engine
   ใช้ร่วมกันทุกแบบประเมิน แก้ไฟล์นี้ = เปลี่ยนทุกแบบประเมินพร้อมกัน
   ไฟล์แบบประเมินแต่ละตัวมีหน้าที่แค่ประกาศตัวแปร QUIZ แล้วเรียก HUMANgoQuiz.mount(QUIZ)

   โครงสร้าง QUIZ
   ---------------------------------------------------------------
   title        ชื่อแบบประเมิน
   lead         ย่อหน้าเกริ่นนำ
   minutes      เวลาโดยประมาณ (ตัวเลข)
   scaleTitle   หัวข้อกล่องคำชี้แจงมาตรวัด
   scale        [{ value, label }]  มาตรวัดกี่ระดับก็ได้ (0–3, 1–5, 1–7)
   questions    [{ text, dim, reverse }]
                  dim     = key ของมิติที่ข้อนี้สังกัด
                  reverse = true ถ้าเป็นข้อที่ต้องกลับคะแนน
   dimensions   [{ key, name, desc, direction, levels:[...] }]
                  desc   = คำอธิบายสั้นๆ ว่ามิตินี้วัดอะไร (ไม่ใส่ก็ได้)
                  levels = ["ระดับสูง", ...] หรือแบบมีคำอธิบาย
                           [{ label:"ระดับสูง", text:"อธิบาย 2-3 บรรทัด" }, ...]
                  direction "low"  = คะแนนยิ่งต่ำยิ่งดี/ยิ่งมีลักษณะนั้น
                  direction "high" = คะแนนยิ่งสูงยิ่งมีลักษณะนั้น
                  levels เรียงจาก "ดี/สูง" ไป "ต้องพัฒนา/ต่ำ" ตาม direction
   overall      null ถ้าไม่มีคะแนนรวม (เช่น Big Five)
                หรือ { direction, note, levels:[{min,max,title,summary}] }
   showScores   false = ไม่แสดงตัวเลขคะแนนข้างตัวเลือก (กันผู้ตอบเดาว่าข้อไหนได้แต้มมาก)
                ไม่ใส่ = แสดงตามปกติ
   sortDimensions  true = เรียงผลรายมิติจากจุดเด่นมากไปน้อย (แบบวัดบุคลิกภาพ)
                   false/ไม่ใส่ = เรียงตามลำดับที่ประกาศไว้
   perPage      1 = ถามทีละข้อ, มากกว่านั้น = แสดงหลายข้อต่อหน้า (เหมาะกับแบบวัดยาว)
   guidance     { title, text }  กล่องคำแนะนำท้ายผล
   cta          { title, text, primary:{label,href}, secondary:{label,href} }
   disclaimer   ข้อความขอบเขตการใช้งาน
   ============================================================ */

const HUMANgoQuiz = (function () {
  let Q = null;
  let answers = [];
  let page = 0;
  let pages = [];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function scaleBounds() {
    const vals = Q.scale.map((o) => o.value);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }

  function itemScore(i) {
    const raw = answers[i];
    if (raw === null || raw === undefined) return null;
    if (!Q.questions[i].reverse) return raw;
    const { min, max } = scaleBounds();
    return min + max - raw;
  }

  function buildPages() {
    pages = [];
    const per = Math.max(1, Q.perPage || 1);
    for (let i = 0; i < Q.questions.length; i += per) {
      pages.push(Q.questions.map((_, idx) => idx).slice(i, i + per));
    }
  }

  /* ---------------- render: intro ---------------- */
  function renderIntro() {
    const s = scaleBounds();
    $("quiz-title").textContent = Q.title;
    $("quiz-lead").textContent = Q.lead;
    $("fact-count").textContent = Q.questions.length + " คำถาม";
    $("fact-time").textContent = "ประมาณ " + Q.minutes + " นาที";
    $("scale-title").textContent = Q.scaleTitle || "พิจารณาว่าคุณเห็นด้วยกับแต่ละข้อความมากน้อยเพียงใด";
    $("scale-list").innerHTML = Q.scale
      .map((o) => '<div class="scale-item"><span class="scale-num">' + o.value + "</span><p>" + esc(o.label) + "</p></div>")
      .join("");
    $("disclaimer-text").innerHTML = "<b>ขอบเขตการใช้งาน</b> — " + Q.disclaimer;
    document.title = Q.title + " — HUMANgo";
  }

  /* ---------------- render: questions ---------------- */
  function renderPage() {
    const items = pages[page];
    const done = Math.round(((page + 1) / pages.length) * 100);
    $("progress-label").textContent =
      pages.length === Q.questions.length
        ? "ข้อ " + (items[0] + 1) + " / " + Q.questions.length
        : "ชุดที่ " + (page + 1) + " / " + pages.length;
    $("progress-percent").textContent = done + "%";
    $("progress-fill").style.width = done + "%";
    $("progress-fill").parentElement.setAttribute("aria-valuenow", String(done));
    $("back-btn").setAttribute("aria-label", page === 0 ? "กลับหน้าคำชี้แจง" : "ย้อนกลับ");

    const box = $("question-area");
    box.replaceChildren();

    items.forEach((qi) => {
      const wrap = document.createElement("div");
      wrap.className = "q-block";
      wrap.innerHTML =
        '<p class="q-no">คำถามข้อที่ ' + (qi + 1) + "</p>" +
        '<h2 class="q-text" tabindex="-1">' + esc(Q.questions[qi].text) + "</h2>" +
        '<div class="choices" role="radiogroup" aria-label="' + esc(Q.questions[qi].text) + '"></div>';
      const choices = wrap.querySelector(".choices");
      const showScores = Q.showScores !== false;
      Q.scale.forEach((opt) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = showScores ? "choice" : "choice no-score";
        if (!showScores) b.style.gridTemplateColumns = "1fr";   // กันกรณีเบราว์เซอร์ใช้ CSS ตัวเก่าที่แคชไว้
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", answers[qi] === opt.value ? "true" : "false");
        b.innerHTML =
          (showScores ? '<span class="choice-score">' + opt.value + "</span>" : "") +
          '<span class="choice-text">' + esc(opt.label) + "</span>";
        b.addEventListener("click", () => answer(qi, opt.value));
        choices.appendChild(b);
      });
      box.appendChild(wrap);
    });

    $("next-btn").hidden = Q.perPage === 1;
    if (Q.perPage !== 1) {
      $("next-btn").textContent = page === pages.length - 1 ? "ดูผลประเมิน →" : "ถัดไป →";
      $("next-btn").disabled = !items.every((i) => answers[i] !== null);
    }
    $("kbd-hint").hidden = Q.perPage !== 1;
    if (Q.perPage === 1) {
      $("kbd-hint").textContent = "กดปุ่มตัวเลข 1–" + Q.scale.length + " บนแป้นพิมพ์เพื่อเลือกตัวเลือกที่ 1–" + Q.scale.length;
    }
  }

  function answer(qi, value) {
    answers[qi] = value;
    const items = pages[page];

    if (Q.perPage === 1) {
      if (page < pages.length - 1) {
        page += 1;
        renderPage();
        const h = document.querySelector(".q-text");
        if (h) h.focus({ preventScroll: true });
      } else {
        renderResults();
      }
      return;
    }

    // page mode: อัปเดตเฉพาะข้อที่ตอบ ไม่ render ใหม่ทั้งหน้า (ไม่ให้จอกระโดด)
    const blocks = $("question-area").querySelectorAll(".q-block");
    const pos = items.indexOf(qi);
    if (pos >= 0 && blocks[pos]) {
      blocks[pos].querySelectorAll(".choice").forEach((btn, k) => {
        btn.setAttribute("aria-checked", Q.scale[k].value === value ? "true" : "false");
      });
    }
    $("next-btn").disabled = !items.every((i) => answers[i] !== null);
  }

  function goNext() {
    if (page < pages.length - 1) {
      page += 1;
      renderPage();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      renderResults();
    }
  }

  /* ---------------- render: results ---------------- */
  function bandLevel(pct, levels, direction) {
    // levels เรียงจาก "ดี/สูง" ไป "ต่ำ" เสมอ; แบ่งช่วงเท่าๆ กันตามจำนวน level
    const n = levels.length;
    const good = direction === "low" ? 100 - pct : pct;
    // ลบค่าน้อยมากก่อน floor เพื่อให้คะแนนที่ตกบนรอยต่อพอดี ไปอยู่ระดับที่ดีกว่า
    const idx = Math.max(0, Math.min(n - 1, Math.floor(((100 - good) / 100) * n - 1e-9)));
    const lv = levels[idx];
    return typeof lv === "string" ? { label: lv, text: "" } : lv;
  }

  function renderResults() {
    const s = scaleBounds();
    const perItemMax = s.max;

    /* overall */
    if (Q.overall) {
      const total = Q.questions.reduce((sum, _, i) => sum + itemScore(i), 0);
      const lvl = Q.overall.levels.find((l) => total >= l.min && total <= l.max) || Q.overall.levels[Q.overall.levels.length - 1];
      const maxTotal = Q.questions.length * perItemMax;
      $("overall-block").hidden = false;
      $("result-title").textContent = lvl.title;
      $("result-summary").textContent = lvl.summary;
      $("total-score").textContent = String(total);
      $("total-max").textContent = "คะแนน จาก " + maxTotal;
      $("score-note").textContent = Q.overall.note || "";
      $("score-note").hidden = !Q.overall.note;
      document.title = lvl.title + " — HUMANgo";
    } else {
      $("overall-block").hidden = true;
      $("profile-head").hidden = false;
      $("profile-title").textContent = Q.title;
      document.title = "ผลประเมิน " + Q.title + " — HUMANgo";
    }

    /* dimensions */
    const list = $("dimension-list");
    list.replaceChildren();

    const rows = Q.dimensions.map((d, i) => {
      const items = Q.questions.map((q, idx) => (q.dim === d.key ? idx : -1)).filter((x) => x >= 0);
      const score = items.reduce((sum, idx) => sum + itemScore(idx), 0);
      const max = items.length * perItemMax;
      const pctExact = (score / max) * 100;              // ใช้ตัดสินระดับ (ไม่ปัดเศษ)
      const pct = Math.round(pctExact);                  // ใช้แสดงผลเท่านั้น
      const barPct = d.direction === "low" ? 100 - pct : pct;
      return { d: d, order: i, score: score, max: max, pct: pctExact, barPct: barPct };
    });

    // sortDimensions: true = เรียงจากจุดเด่นมากไปน้อย (เหมาะกับแบบวัดบุคลิกภาพ)
    if (Q.sortDimensions) rows.sort((a, b) => b.barPct - a.barPct);

    rows.forEach((r, i) => {
      const lv = bandLevel(r.pct, r.d.levels, r.d.direction);
      const tag = Q.sortDimensions ? "อันดับที่ " + (i + 1) : "มิติที่ " + (r.order + 1);
      const el = document.createElement("article");
      el.className = "dim";
      el.innerHTML =
        '<div class="dim-top"><div><p class="dim-idx">' + tag + "</p><h3>" + esc(r.d.name) + "</h3>" +
        (r.d.desc ? '<p class="dim-desc">' + esc(r.d.desc) + "</p>" : "") + "</div>" +
        '<div class="dim-score">' + r.score + "<small>/" + r.max + "</small></div></div>" +
        '<div class="bar" aria-label="ระดับ ' + r.barPct + ' เปอร์เซ็นต์"><span style="width:' + r.barPct + '%"></span></div>' +
        '<p class="dim-result">' + esc(lv.label) + "</p>" +
        (lv.text ? '<p class="dim-text">' + esc(lv.text) + "</p>" : "") +
        (r.d.note ? '<p class="dim-helper">' + esc(r.d.note) + "</p>" : "");
      list.appendChild(el);
    });

    /* guidance + cta */
    if (Q.guidance) {
      $("guidance-title").textContent = Q.guidance.title;
      $("guidance-text").textContent = Q.guidance.text;
    } else {
      $("guidance").hidden = true;
    }
    if (Q.cta) {
      $("cta-title").textContent = Q.cta.title;
      $("cta-text").textContent = Q.cta.text;
      const a1 = $("cta-primary"), a2 = $("cta-secondary");
      a1.textContent = Q.cta.primary.label; a1.href = Q.cta.primary.href;
      if (Q.cta.secondary) { a2.textContent = Q.cta.secondary.label; a2.href = Q.cta.secondary.href; }
      else a2.hidden = true;
    } else {
      $("cta").hidden = true;
    }

    show("results");
  }

  /* ---------------- screens ---------------- */
  function show(name) {
    ["intro", "quiz", "results"].forEach((k) => { $(k).hidden = k !== name; });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    answers = Array(Q.questions.length).fill(null);
    page = 0;
    document.title = Q.title + " — HUMANgo";
  }

  /* ---------------- mount ---------------- */
  function mount(config) {
    Q = config;
    if (Q.perPage === undefined) Q.perPage = Q.questions.length > 14 ? 5 : 1;
    buildPages();
    reset();
    renderIntro();

    $("start-btn").addEventListener("click", () => { reset(); renderPage(); show("quiz"); });
    $("restart-btn").addEventListener("click", () => { reset(); renderPage(); show("quiz"); });
    $("print-btn").addEventListener("click", () => window.print());
    $("next-btn").addEventListener("click", goNext);
    $("back-btn").addEventListener("click", () => {
      if (page === 0) { show("intro"); return; }
      page -= 1;
      renderPage();
    });

    document.addEventListener("keydown", (e) => {
      if ($("quiz").hidden || Q.perPage !== 1) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= Q.scale.length) {
        answer(pages[page][0], Q.scale[n - 1].value);
      }
    });
  }

  return { mount };
})();
