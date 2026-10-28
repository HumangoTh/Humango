/* ============================================================
   หน้าแบบวัดทดลองสำหรับอาสาสมัคร (pilot)
   ผู้ตอบเห็นแค่ข้อคำถามและหน้า "เสร็จแล้ว ขอบคุณมาก" — ไม่เห็นคะแนน
   คำตอบดิบ + คะแนนส่งเข้า Google Sheet ผ่าน Apps Script (ENDPOINT)
   ============================================================ */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- การคิดคะแนน (ใช้ร่วมกับหน้า pilot-report.html) ---------- */
  const SCORE = {
    strengths: function (ans) { // ans[i] = 1–5 ตามลำดับข้อที่แสดง
      const D = window.PILOT_ITEMS.strengths;
      const s = D.strengths.map(() => 0);
      D.items.forEach((it, i) => { s[it.s] += Number(ans[i]) || 0; });
      return s; // 24 ค่า (2–10)
    },
    career: function (ans) { // ans[i] = "A" | "B"
      const t = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
      window.PILOT_ITEMS.career.items.forEach((it, i) => { if (ans[i]) t[it[ans[i]].t] += 1; });
      return t;
    },
    personality: function (ans) { // ans[i] = {most: idx, second: idx}
      const t = { O: 0, C: 0, E: 0, A: 0, ES: 0 };
      window.PILOT_ITEMS.personality.blocks.forEach((b, i) => {
        const a = ans[i]; if (!a) return;
        t[b[a.most].d] += 2; t[b[a.second].d] += 1;
      });
      return t;
    }
  };
  const RIASEC = ["R", "I", "A", "S", "E", "C"];
  function code3(t) {
    return RIASEC.slice().sort((a, b) => t[b] - t[a] || RIASEC.indexOf(a) - RIASEC.indexOf(b)).slice(0, 3).join("");
  }
  window.PILOT_SCORE = SCORE;
  window.PILOT_CODE3 = code3;

  /* ---------- ตัวทำแบบวัด ---------- */
  function mount(cfg) {
    const items = cfg.getItems();
    const N = items.length;
    const answers = new Array(N).fill(null);
    const pages = [];
    for (let i = 0; i < N; i += cfg.perPage) pages.push([...Array(Math.min(cfg.perPage, N - i)).keys()].map((k) => i + k));
    let page = 0, startedAt = 0, sent = false;

    const nameEl = $("p-name"), startBtn = $("p-start");
    function checkStart() { startBtn.disabled = nameEl.value.trim().length < 2; }
    nameEl.addEventListener("input", checkStart);
    checkStart();

    startBtn.addEventListener("click", () => {
      startedAt = Date.now();
      show("p-quiz"); render(); window.scrollTo(0, 0);
    });
    $("p-next").addEventListener("click", () => {
      const miss = pages[page].filter((i) => !done(i));
      if (miss.length) { warn(miss); return; }
      if (page < pages.length - 1) { page += 1; render(); scrollTop(); }
      else submit();
    });
    $("p-back").addEventListener("click", () => { if (page > 0) { page -= 1; render(); scrollTop(); } });

    function scrollTop() { const q = $("p-quiz"); window.scrollTo({ top: q.getBoundingClientRect().top + window.scrollY - 12 }); }
    function show(id) { ["p-intro", "p-quiz", "p-done"].forEach((s) => { $(s).hidden = s !== id; }); }
    function done(i) { return cfg.isAnswered(answers[i]); }

    function render() {
      const box = $("p-items"); box.innerHTML = "";
      pages[page].forEach((i) => { const el = cfg.renderItem(items[i], i, answers[i], (v) => { answers[i] = v; if (done(i)) el.classList.remove("p-miss"); update(); }); el.dataset.idx = i; box.appendChild(el); });
      $("p-hint").hidden = true;
      $("p-back").hidden = page === 0;
      update();
    }
    function update() {
      const answered = answers.filter((a, i) => done(i)).length;
      $("p-bar").style.width = Math.round((answered / N) * 100) + "%";
      $("p-count").textContent = "ตอบแล้ว " + answered + " / " + N + " ข้อ · หน้า " + (page + 1) + " / " + pages.length;
      const ok = pages[page].every(done);
      $("p-next").classList.toggle("p-wait", !ok);
      if (ok) $("p-hint").hidden = true;
      $("p-next").textContent = page === pages.length - 1 ? "ส่งคำตอบ" : "ถัดไป →";
    }

    function warn(miss) {
      document.querySelectorAll("#p-items .p-item").forEach((el) => el.classList.toggle("p-miss", miss.indexOf(Number(el.dataset.idx)) >= 0));
      $("p-hint").textContent = "ยังตอบไม่ครบ ข้อ " + miss.map((i) => i + 1).join(", ") + (cfg.missText ? " · " + cfg.missText : "");
      $("p-hint").hidden = false;
      const first = document.querySelector("#p-items .p-miss");
      if (first) window.scrollTo({ top: first.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
    }

    function submit() {
      if (sent) return; sent = true;
      $("p-next").disabled = true; $("p-next").textContent = "กำลังส่ง…";
      const row = {
        name: nameEl.value.trim(),
        client_time: new Date().toISOString(),
        duration_sec: Math.round((Date.now() - startedAt) / 1000),
        device: window.matchMedia("(max-width: 700px)").matches ? "mobile" : "desktop"
      };
      cfg.toRow(answers, row);
      const fin = () => { show("p-done"); window.scrollTo(0, 0); };
      if (!cfg.endpoint) { console.warn("ยังไม่ได้ตั้ง ENDPOINT — ไม่ได้ส่งข้อมูล", row); fin(); return; }
      fetch(cfg.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ form: cfg.form, row: row }) })
        .then(fin)
        .catch(() => { sent = false; $("p-next").disabled = false; $("p-next").textContent = "ส่งคำตอบ";
          $("p-err").hidden = false; });
    }
  }

  /* ---------- รูปแบบข้อคำถาม 3 แบบ ---------- */
  function likert(scale) {
    return {
      isAnswered: (a) => a != null,
      renderItem: function (it, i, cur, set) {
        const el = document.createElement("div"); el.className = "p-item";
        el.innerHTML = '<p class="p-q"><span class="p-no">' + (i + 1) + "</span>" + esc(it.text) + "</p>";
        const row = document.createElement("div"); row.className = "p-scale"; row.setAttribute("role", "radiogroup");
        scale.forEach((s) => {
          const b = document.createElement("button"); b.type = "button"; b.className = "p-opt";
          b.setAttribute("role", "radio"); b.setAttribute("aria-checked", cur === s.v ? "true" : "false");
          b.innerHTML = "<b>" + s.v + "</b><span>" + esc(s.label) + "</span>";
          b.addEventListener("click", () => {
            set(s.v); row.querySelectorAll(".p-opt").forEach((x) => x.setAttribute("aria-checked", x === b ? "true" : "false"));
          });
          row.appendChild(b);
        });
        el.appendChild(row); return el;
      }
    };
  }
  function pair() {
    return {
      isAnswered: (a) => a === "A" || a === "B",
      renderItem: function (it, i, cur, set) {
        const el = document.createElement("div"); el.className = "p-item";
        el.innerHTML = '<p class="p-q"><span class="p-no">' + (i + 1) + "</span>เลือกสิ่งที่ท่านชอบหรือตรงกับตัวท่านมากกว่า</p>";
        const row = document.createElement("div"); row.className = "p-pair"; row.setAttribute("role", "radiogroup");
        ["A", "B"].forEach((k) => {
          const b = document.createElement("button"); b.type = "button"; b.className = "p-card";
          b.setAttribute("role", "radio"); b.setAttribute("aria-checked", cur === k ? "true" : "false");
          b.innerHTML = '<span class="p-key">' + k + "</span><span>" + esc(it[k].text) + "</span>";
          b.addEventListener("click", () => {
            set(k); row.querySelectorAll(".p-card").forEach((x) => x.setAttribute("aria-checked", x === b ? "true" : "false"));
          });
          row.appendChild(b);
        });
        el.appendChild(row); return el;
      }
    };
  }
  function triad() {
    return {
      missText: "แต่ละชุดต้องเลือก 2 ข้อความ: ตรงที่สุด และตรงรองลงมา",
      isAnswered: (a) => a && a.most != null && a.second != null,
      renderItem: function (blk, i, cur, set) {
        let st = cur ? { most: cur.most, second: cur.second } : { most: null, second: null };
        const el = document.createElement("div"); el.className = "p-item";
        const head = document.createElement("p"); head.className = "p-q";
        const list = document.createElement("div"); list.className = "p-triad";
        const reset = document.createElement("button"); reset.type = "button"; reset.className = "p-reset"; reset.textContent = "เลือกใหม่";
        function hint() {
          return st.most == null ? "แตะข้อความที่ <b>ตรงกับตัวท่านมากที่สุด</b>"
            : st.second == null ? "ขั้นที่ 2: จากอีกสองข้อความที่เหลือ แตะข้อความที่ <b>ตรงกับตัวท่านมากกว่า</b>" : "เรียบร้อย";
        }
        function draw() {
          head.innerHTML = '<span class="p-no">' + (i + 1) + "</span><span" + (st.most != null && st.second == null ? ' class="p-next-step"' : "") + ">" + hint() + "</span>";
          list.innerHTML = "";
          blk.forEach((s, k) => {
            const b = document.createElement("button"); b.type = "button"; b.className = "p-card";
            const tag = st.most === k ? "ตรงที่สุด" : st.second === k ? "ตรงรองลงมา" : "";
            b.setAttribute("aria-pressed", tag ? "true" : "false");
            if (tag) b.dataset.rank = st.most === k ? "1" : "2";
            b.innerHTML = (tag ? '<span class="p-rank">' + tag + "</span>" : "") + "<span>" + esc(s.text) + "</span>";
            b.addEventListener("click", () => {
              if (st.most == null) st.most = k;
              else if (st.second == null && k !== st.most) st.second = k;
              else return;
              set(st.second != null ? { most: st.most, second: st.second } : null); draw();
            });
            list.appendChild(b);
          });
          reset.hidden = st.most == null;
        }
        reset.addEventListener("click", () => { st = { most: null, second: null }; set(null); draw(); });
        draw();
        el.appendChild(head); el.appendChild(list); el.appendChild(reset); return el;
      }
    };
  }

  window.PilotQuiz = { mount: mount, likert: likert, pair: pair, triad: triad };
})();
