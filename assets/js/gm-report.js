/* ============================================================
   HUMANgo — แสดงรายงาน Growth Mindset ฉบับเต็มบนหน้าผล
   ต้องโหลด gm-report-content.js ก่อนไฟล์นี้
   คิดคะแนนจากคำตอบดิบ (ข้อกลับคะแนนต้องตรงกับ QUIZ ใน assess-growth-mindset.html)
   ============================================================ */
(function () {
  const REVERSE = [3, 6, 9, 12, 15, 16, 17, 18, 22, 25];
  const SCALE_MAX = 3, PER_DIM = 5;

  function score(answers) {
    const R = window.GM_REPORT;
    const item = answers.map((raw, i) => (REVERSE.indexOf(i + 1) >= 0 ? SCALE_MAX - raw : raw));
    const dims = R.dimensions.map((d, k) => {
      let s = 0;
      for (let j = k * PER_DIM; j < (k + 1) * PER_DIM; j++) s += item[j];
      return { key: d.key, score: s };
    });
    const total = dims.reduce((a, d) => a + d.score, 0);
    const low = Math.min.apply(null, dims.map((d) => d.score));
    const focusKeys = dims.filter((d) => d.score === low).map((d) => d.key);
    return { total, dims, focusKeys };
  }

  const pick = (levels, s) => levels.filter((l) => s >= l.min && s <= l.max)[0] || levels[levels.length - 1];
  const inline = (s) => String(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const quote = (s) => '<blockquote class="rep-quote">' + inline(s) + "</blockquote>";
  const para = (s) => {
    if (s.indexOf("## ") === 0) return '<h4 class="rep-h4">' + inline(s.slice(3)) + "</h4>";
    if (s.indexOf("> ") === 0) return quote(s.slice(2));
    return "<p>" + inline(s) + "</p>";
  };
  const paras = (arr) => (arr || []).map(para).join("");
  const write = (lines, label) =>
    '<div class="rep-write" contenteditable="true" role="textbox" aria-multiline="true" aria-label="' + label +
    '" style="min-height:' + (lines * 2.1) + 'em"></div>';
  const bar = (s, max) => '<span class="rep-bar"><span style="width:' + Math.round((s / max) * 100) + '%"></span></span>';

  function build(answers) {
    const R = window.GM_REPORT;
    const sc = score(answers);
    const overall = pick(R.overall, sc.total);
    const scoreOf = {};
    sc.dims.forEach((d) => { scoreOf[d.key] = d.score; });
    const focusDims = R.dimensions.filter((d) => sc.focusKeys.indexOf(d.key) >= 0);
    const multi = focusDims.length > 1;
    const today = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    let h = "";

    /* ---------- หัวรายงาน + สรุปคะแนน ---------- */
    h += '<img class="rep-print-logo" src="assets/img/logo.png" alt="HUMANgo">';
    h += '<p class="eyebrow">HUMANgo · Growth Mindset Report</p>';
    h += '<h1 class="result-title rep-title">' + R.title + "</h1>";
    h += '<p class="rep-date">วันที่ทำแบบประเมิน ' + today + "</p>";

    h += '<div class="rep-card">';
    h += '<div class="rep-card-top"><div><p class="rep-small">ผลคะแนนรวม</p><p class="rep-overall" id="result-title-rep">' + overall.title + "</p></div>" +
      '<p class="rep-total"><strong>' + sc.total + "</strong><span>/ 75 คะแนน</span></p></div>";
    h += '<ol class="rep-dimlist">';
    R.dimensions.forEach((d) => {
      const s = scoreOf[d.key], lv = pick(d.levels, s), isFocus = sc.focusKeys.indexOf(d.key) >= 0;
      h += "<li><div class=\"rep-dimrow\"><span>" + d.name +
        (isFocus ? ' <a class="rep-tag" href="#plan30">แผน 30 วัน</a>' : "") + "</span>" +
        '<span class="rep-dimscore"><b>' + s + "</b>/15 · " + lv.label + "</span></div>" + bar(s, 15) + "</li>";
    });
    h += "</ol></div>";

    h += '<div class="rep-toolbar">' +
      '<button type="button" class="btn btn-primary" data-rep="print">บันทึกรายงานเป็น PDF</button>' +
      '<a class="btn btn-ghost" href="#plan30" data-rep="plan">ดูแผนพัฒนาตัวเอง 30 วัน ↓</a></div>';

    /* ---------- ทำความเข้าใจ + วิธีอ่านผล ---------- */
    h += '<section class="rep-sec"><h2>ทำความเข้าใจ Growth Mindset</h2>' + paras(R.understanding) + "</section>";
    h += '<section class="rep-sec"><h2>การอ่านผลของคุณ</h2>' + paras(R.reading) + "</section>";

    /* ---------- ผลรวม ---------- */
    h += '<section class="rep-sec"><h2>ผลคะแนนรวม Growth Mindset</h2>' +
      '<p class="rep-small">' + overall.min + "–" + overall.max + " คะแนน · คะแนนของคุณ " + sc.total + "</p>" +
      '<h3 class="rep-h3">' + overall.title + "</h3>" + paras(overall.body) + "</section>";

    /* ---------- ผลรายด้าน ---------- */
    h += '<section class="rep-sec"><h2>ผลรายด้าน</h2>';
    R.dimensions.forEach((d, i) => {
      const s = scoreOf[d.key], lv = pick(d.levels, s);
      h += '<div class="rep-dim"><h3 class="rep-h3">' + (i + 1) + ". " + d.name + '</h3><p class="rep-small">' + d.en + "</p>" +
        paras(d.intro) +
        '<div class="rep-levelbox"><p class="rep-levelhead">คะแนนของคุณ ' + s + "/15 — " + lv.label + " (" + lv.min + "–" + lv.max + " คะแนน)</p>" +
        paras(lv.body) + "</div>" +
        '<p class="rep-label">แนวทางพัฒนา</p>' + paras(d.guide) +
        '<p class="rep-label">คำถามสำหรับสะท้อนตนเอง</p>' + quote(d.reflect) + "</div>";
    });
    h += "</section>";

    /* ---------- เริ่มพัฒนาอย่างไร ---------- */
    h += '<section class="rep-sec"><h2>จะเริ่มพัฒนา Growth Mindset อย่างไร</h2>' + paras(R.howToStart.intro);
    R.howToStart.steps.forEach((st) => { h += '<h3 class="rep-h3">' + st.title + "</h3>" + paras(st.body); });
    h += "</section>";

    /* ---------- แผน 30 วัน ---------- */
    h += '<section class="rep-sec rep-plan" id="plan30"><p class="eyebrow">30-Day Plan</p><h2>' + R.plan.title + "</h2>" +
      '<p class="rep-sub">' + R.plan.subtitle + "</p>";
    const intro = R.plan.intro.slice();
    if (multi) intro[intro.length - 1] = R.plan.introMulti.replace("{n}", focusDims.length);
    h += paras(intro);
    h += '<div class="rep-focus"><p class="eyebrow" style="margin-bottom:6px">My Development Focus</p>' +
      "<p><b>ด้านที่ฉันต้องการพัฒนา:</b> " + focusDims.map((d) => d.name).join(" · ") + "</p>" +
      "<p><b>คะแนนปัจจุบัน:</b> " + scoreOf[focusDims[0].key] + " / 15" + (multi ? " (เท่ากันทุกด้านที่ระบุ)" : "") + "</p></div>";
    h += paras(R.plan.focusNote);
    focusDims.forEach((fd) => {
      const p = R.plan.byDimension[fd.key];
      h += '<div class="rep-plan-dim">';
      if (multi) h += '<p class="rep-small">' + R.plan.multiHeading + '</p><h3 class="rep-h3" style="margin-top:2px">' + fd.name + "</h3>";
      h += '<h4 class="rep-h4">เป้าหมาย 30 วัน</h4>' + para(p.goal);
      h += '<h4 class="rep-h4">3 Micro Actions</h4><ol class="rep-ol">' + p.actions.map((a) => "<li>" + inline(a) + "</li>").join("") + "</ol>";
      h += paras(p.extra);
      h += '<h4 class="rep-h4">ประโยคเตือนใจ</h4>' + quote(p.reminder) + "</div>";
    });
    h += "</section>";

    /* ---------- Commitment + Reflection (พิมพ์ได้ ไม่เก็บข้อมูล) ---------- */
    h += '<section class="rep-sec"><h2>' + R.commitment.title + "</h2>" +
      '<p class="rep-note">พิมพ์คำตอบลงในช่องได้ก่อนบันทึกเป็น PDF หรือเว้นว่างไว้แล้วเขียนด้วยมือหลังพิมพ์ ระบบไม่เก็บสิ่งที่คุณพิมพ์</p>';
    R.commitment.prompts.forEach((p) => { h += '<h4 class="rep-h4">' + p.q + "</h4>" + write(p.lines, p.q); });
    h += "</section>";
    h += '<section class="rep-sec"><h2>' + R.reflection30.title + "</h2>" + para(R.reflection30.intro);
    R.reflection30.prompts.forEach((p) => { h += '<h4 class="rep-h4">' + p.q + "</h4>" + write(p.lines, p.q); });
    h += "</section>";

    /* ---------- ปิดท้าย ---------- */
    h += '<section class="rep-sec"><h2>' + R.takeaway.title + "</h2>" + paras(R.takeaway.body) + "</section>";
    h += '<div class="rep-notes"><h3>' + R.notes.title + "</h3>" + paras(R.notes.body) + "</div>";
    h += '<p class="rep-print-foot">HUMANgo · humango.co · humangothailand@gmail.com · 087-303-2305</p>';

    return { html: h, total: sc.total, focusKeys: sc.focusKeys };
  }

  function track(name, params) {
    try { if (typeof gtag === "function") gtag("event", name, params || {}); } catch (e) {}
  }

  window.HUMANgoReport = {
    score: score,
    render: function (answers, el) {
      const out = build(answers);
      el.innerHTML = out.html;
      el.hidden = false;
      el.querySelectorAll('[data-rep="print"]').forEach((b) =>
        b.addEventListener("click", () => { track("report_print", { assessment: "growth_mindset_v2" }); window.print(); }));
      el.querySelectorAll('a[href="#plan30"]').forEach((a) =>
        a.addEventListener("click", (e) => {
          e.preventDefault();
          track("report_plan_click", { assessment: "growth_mindset_v2" });
          const head = document.querySelector(".masthead");
          const off = (head ? head.getBoundingClientRect().height : 0) + 16;
          const top = document.getElementById("plan30").getBoundingClientRect().top + window.scrollY - off;
          window.scrollTo({ top: top, behavior: "smooth" });
        }));
      return out;
    }
  };
})();
