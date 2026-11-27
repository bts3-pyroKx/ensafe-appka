
  // PREVIEW_DATA is provided only in the separate read-only preview artifact.
  let data = null,
    view = "overview",
    selected = null,
    pendingId = "",
    saving = false;
  const $ = (id) => document.getElementById(id),
    f = () => $("callform").elements;
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const format = (iso, time = false) => {
    if (!iso) return "Bez termínu";
    if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
    return (
      iso.slice(0, 10).split("-").reverse().join(".") +
      (time && iso.slice(11, 16) && iso.slice(11, 16) !== "00:00" ? " · " + iso.slice(11, 16) : "")
    );
  };
  const normalize = (s) =>
    String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const ICONS = {
    phone:
      '<svg xmlns="http://www.w3.org/2000/svg" class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><path d="M5 3.5 H9 L11 8.5 L8.5 10.5 C9.7 13 11 14.3 13.5 15.5 L15.5 13 L20.5 15 V19 C20.5 20.1 19.6 21 18.5 21 C10.5 21 3 13.5 3 5.5 C3 4.4 3.9 3.5 5 3.5 Z"/></svg>',
    mail: '<svg xmlns="http://www.w3.org/2000/svg" class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><path d="M3 5 H21 V19 H3 Z"/><path stroke-linecap="butt" d="M4 6.5 L12 12.5 L20 6.5"/></svg>',
    place:
      '<svg xmlns="http://www.w3.org/2000/svg" class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><path d="M12 21 C12 21 5 14 5 9.5 C5 5.6 8.1 2.5 12 2.5 C15.9 2.5 19 5.6 19 9.5 C19 14 12 21 12 21 Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    date: '<svg xmlns="http://www.w3.org/2000/svg" class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><path d="M4 5 H20 V20 H4 Z M4 10 H20 M8 3 V7 M16 3 V7 M8 14 H10 M14 14 H16"/></svg>',
    link: '<svg xmlns="http://www.w3.org/2000/svg" class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><path d="M10 14 L14 10 M8.5 11.5 L6 14 A3.5 3.5 0 0 0 10 18 L12.5 15.5 M15.5 12.5 L18 10 A3.5 3.5 0 0 0 14 6 L11.5 8.5"/></svg>',
  };
  const line = (icon, html) => (html ? '<p class="contactline">' + ICONS[icon] + "<span>" + html + "</span></p>" : "");
  function pill(label, kind = "") {
    return '<span class="pill ' + kind + '">' + esc(label) + "</span>";
  }
  // [pozadie, text, plná farba pre grafy a mapu]
  const STATUS_COLORS = {
    // jemné tóny (dizajn manuál: biela základ, modrá nesie značku, výrazné farby len striedmo);
    // každý stav má vlastnú farbu – sivá sa nepoužíva, aby žiadny štítok nepôsobil ako bez farby
    Neoslovené: ["#e2e8f0", "#1e3a5f", "#5b7899"],
    Oslovené: ["#e7f0f8", "#0b65b3", "#6fa3d6"],
    "Stav neoverený": ["#f3ead9", "#6b4f1d", "#a8834a"],
    Nezdvihli: ["#fdf0e6", "#9a4a0b", "#e58a3c"],
    "Ozvať sa neskôr": ["#fff6db", "#7a5b00", "#e3b53c"],
    "Zaslať katalóg": ["#e3f4f5", "#0b6e78", "#3fa4ae"],
    "Má záujem": ["#dcebfa", "#0b4f8c", "#0b65b3"],
    "Dohodnúť stretnutie": ["#f5e8f2", "#8a2d74", "#b85aa2"],
    "Termín dohodnutý": ["#ede8f8", "#5a35a0", "#7b5bc4"],
    "Dohodnuté stretnutie": ["#ede8f8", "#5a35a0", "#7b5bc4"],
    "Ukážka absolvovaná": ["#e3f3ea", "#1b6b45", "#2e9a62"],
    "Návšteva absolvovaná": ["#eef6df", "#4a6614", "#8db43c"],
    "Čaká na školenie": ["#e0f2ee", "#0d5c4f", "#2a9d8a"],
    "Školenie absolvované": ["#d9efe0", "#11602f", "#119039"],
    Uzavreté: ["#dcefe5", "#0e4d36", "#16704c"],
    "Nemá záujem": ["#fcede8", "#b3300d", "#da3c11"],
  };
  const statusColor = (s) => STATUS_COLORS[s] || ["#e7f0f8", "#0b65b3", "#6fa3d6"];
  function status(d, noOrder) {
    const c = statusColor(d.status);
    return (
      '<span class="pill" style="background:' +
      c[0] +
      ";color:" +
      c[1] +
      (c[0] === "#ffffff" ? ";border:1px dashed " + c[2] : "") +
      '">' +
      esc(d.status) +
      "</span>" +
      (d.order && !noOrder ? " " + pill("Objednávka", "success") : "") +
      (window.APPKA && window.APPKA.pendingFor && window.APPKA.pendingFor(d.name)
        ? " " + pill("Čaká na odoslanie", "warn")
        : "")
    );
  }
  function nameButton(d) {
    return '<button class="link" data-detail="' + d.row + '">' + esc(d.name) + "</button>";
  }
  function empty(s) {
    return '<div class="empty">' + esc(s) + "</div>";
  }
  // Hlásenie je „popover“ (vrstva nad všetkým), aby ho neprekrylo otvorené modálne okno (showModal); pri každom
  // hlásení sa zobrazí znova, takže je aj nad oknom otvoreným neskôr. Starší prehliadač: obyčajný prvok ako doteraz.
  function toast(s) {
    const t = $("toast"),
      pop = typeof t.showPopover === "function";
    t.textContent = s;
    t.hidden = false;
    if (pop) {
      try {
        if (t.matches(":popover-open")) t.hidePopover();
        t.showPopover();
      } catch (e) {}
    }
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
      t.hidden = true;
      if (pop) {
        try {
          t.hidePopover();
        } catch (e) {}
      }
    }, 6500);
  }
  // V appke (mimo Apps Scriptu) idú volania cez window.APPKA (pwa/appka.js), v dashboarde cez google.script.run.
  function api(name, ...args) {
    if (window.APPKA) return window.APPKA.call(name, args);
    return new Promise((resolve, reject) => {
      let run = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      run[name](...args);
    });
  }
  // Dashboard prichádza skomprimovaný (gzip + base64), ak to prehliadač vie rozbaliť; inak ako bežný objekt.
  const CAN_GZIP = typeof DecompressionStream === "function";
  async function unzipJson(b64) {
    const bin = atob(b64),
      bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    return { data: JSON.parse(text), kB: Math.round(text.length / 1024) };
  }
  // odpoveď getDashboard (skomprimovaná alebo bežný objekt) → údaje dashboardu
  async function unpackDashboard(p) {
    if (!p.z) return { r: p, kB: Math.round(JSON.stringify(p).length / 1024), kBz: undefined, unzip: 0 };
    const t = performance.now(),
      u = await unzipJson(p.z);
    return {
      r: Object.assign(u.data, { readOnly: p.readOnly, timing: p.timing }),
      kB: u.kB,
      kBz: Math.round(p.z.length / 1024),
      unzip: performance.now() - t,
    };
  }
  async function fetchDashboard(force) {
    if (!CAN_GZIP) {
      const r = await api("getDashboard", force === true);
      return { r, kB: Math.round(JSON.stringify(r).length / 1024), kBz: undefined, unzip: 0 };
    }
    return unpackDashboard(await api("getDashboard", force === true, { z: true }));
  }
  // Indexy sa zostavia raz po načítaní – vyhľadanie zariadenia podľa riadku/názvu je potom okamžité.
  let byRow = new Map(),
    byName = new Map(),
    historyRows = [];
  const hayCache = new WeakMap();
  function deviceByName(name) {
    return byName.get(normalize(name));
  }
  // telefón len číslicami bez predvoľby a úvodnej nuly: „+421 905 123 456“ aj „0905/123456“ = „905123456“
  const phoneDigits = (s) =>
    String(s || "")
      .replace(/\D/g, "")
      .replace(/^(00)?421/, "")
      .replace(/^0+/, "");
  function hay(d) {
    let s = hayCache.get(d);
    if (s === undefined) {
      s = normalize(
        [
          d.name,
          d.city,
          d.district,
          d.address,
          d.person,
          d.phone,
          d.email,
          d.web,
          d.action,
          d.taskText,
          d.result,
          d.note,
        ]
          .concat(
            String(d.phone || "")
              .split(/[;,]/)
              .map(phoneDigits),
          )
          .join(" "),
      );
      hayCache.set(d, s);
    }
    return s;
  }
  function buildIndex() {
    byRow = new Map(data.devices.map((d) => [d.row, d]));
    byName = new Map();
    data.devices.forEach((d) => {
      const k = normalize(d.name);
      if (!byName.has(k)) byName.set(k, d);
    });
    historyRows = (data.activities || []).map((a) =>
      Object.assign({}, a, { district: deviceByName(a.name)?.district || "" }),
    );
    // návštevy a ukážky pri zariadení – server ich posiela len raz (data.activities), párujú sa podľa názvu ako na serveri
    const actKey = (s) =>
      String(s || "")
        .trim()
        .toLocaleLowerCase("sk");
    const byAct = new Map();
    (data.activities || []).forEach((a) => {
      const k = actKey(a.name);
      if (!byAct.has(k)) byAct.set(k, []);
      byAct.get(k).push(a);
    });
    data.devices.forEach((d) => {
      d.activities = (byAct.get(actKey(d.name)) || []).slice();
    });
  }
  // ---------- meranie rýchlosti ----------
  // Uchová posledných 20 meraní; klik na riadok „Aktualizované…“ pod nadpisom ich zobrazí na skopírovanie.
  const timings = [];
  let timingLabel = "",
    pendingSave = null;
  const sec = (ms) => (ms / 1000).toLocaleString("sk", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " s";
  function logTiming(entry) {
    timings.unshift(Object.assign({ čas: new Date().toLocaleTimeString("sk") }, entry));
    timings.length = Math.min(timings.length, 20);
    console.log("[EnSafe meranie]", timings[0]);
  }
  function fmtTiming(e) {
    return Object.entries(e)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => k + ": " + (typeof v === "number" && !k.startsWith("kB") ? sec(v) : v))
      .join(" · ");
  }
  function showTimings() {
    let dlg = $("timingdlg");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "timingdlg";
      dlg.innerHTML =
        '<div class="panelhead"><h2>Meranie rýchlosti</h2><button class="btn" data-close="timingdlg">Zavrieť</button></div>' +
        '<div class="dialogbody"><p class="muted">Posledných 20 meraní, najnovšie hore. Text môžeš skopírovať a poslať.</p>' +
        '<pre id="timingtext" style="white-space:pre-wrap;font-size:13px;line-height:1.6;margin:0"></pre></div>';
      document.body.append(dlg);
    }
    $("timingtext").textContent = timings.map(fmtTiming).join("\n\n") || "Zatiaľ žiadne meranie.";
    dlg.showModal();
  }
  function updateLoaded() {
    if (!data) return;
    $("loaded").textContent =
      (data.readOnly ? "Len na čítanie • " : "") +
      "Aktualizované " +
      data.loadedAt +
      (refreshing
        ? " · Obnovujem údaje…"
        : offline
          ? " · bez pripojenia, zobrazujem uložené údaje"
          : timingLabel
            ? " · " + timingLabel
            : "");
    $("loaded").classList.toggle("offline", offline && !refreshing);
  }
  $("loaded").style.cursor = "pointer";
  $("loaded").title = "Klikni pre detail merania rýchlosti";
  $("loaded").addEventListener("click", showTimings);
  async function timedSave(name, arg) {
    const t = performance.now();
    const r = await api(name, arg);
    pendingSave = { name, t, ms: performance.now() - t, timing: (r && r.timing) || {} };
    if (r && r.queued) return r; // appka bez signálu: zápis čaká v zariadení, na server (ani do kalendára) ešte nešiel
    // zápisy, ktoré môžu zmeniť termín ukážky (stĺpec L) → kalendár sa zosynchronizuje na pozadí (zápis na to nečaká)
    if (CAL_WRITES.includes(name) && !(r && r.duplicate)) syncCalendarLater();
    return r;
  }
  // saveContact a prevadzkaSave: miesto a kontakt v udalosti; vykonSave, vykonZrus, nedostatokSet: otvorené nedostatky
  // v popise udalosti výkonu
  const CAL_WRITES = [
    "saveCall",
    "completeTask",
    "setStatus",
    "saveContact",
    "renameDevice",
    "vykonPlan",
    "prevadzkaSave",
    "vykonSave",
    "vykonZrus",
    "nedostatokSet",
  ];
  function syncCalendarLater() {
    api("syncCalendar")
      .then((r) => calSyncResult(r, false))
      .catch((e) =>
        toast("Kalendár ukážok sa nepodarilo aktualizovať (dorobí sa do 15 minút): " + ((e && e.message) || e)),
      );
  }
  // Po uložení sa okno zavrie hneď a dashboard sa obnoví na pozadí (nečaká sa naň).
  async function applySaved(r) {
    const p = pendingSave;
    pendingSave = null;
    if (r && r.queued) {
      toast("Bez pripojenia – zápis je uložený v zariadení a odošle sa sám, keď budeš online.");
      return;
    }
    if (p) {
      logTiming({
        akcia: "uloženie (" + p.name + ")",
        spolu: performance.now() - p.t,
        "volanie servera": p.ms,
        "zápis do tabuľky": p.timing.write,
      });
      timingLabel = "uložené za " + sec(performance.now() - p.t);
    }
    refresh(true, "obnova po uložení");
  }
  let detailRow = null,
    cardBack = 0; // riadok karty, z ktorej sa otvoril formulár – po zatvorení formulára sa karta vráti
  function leaveCard() {
    cardBack = $("detail").open ? detailRow : 0;
    if (cardBack) $("detail").close();
  }
  // Dnešný dátum podľa zariadenia (yyyy-MM-dd). Appka môže ukazovať dashboard uložený pred niekoľkými dňami (bez signálu) –
  // formuláre a zápisy majú brať skutočný dnešok, nie deň posledného načítania.
  function localToday() {
    const d = new Date();
    return (
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
    );
  }
  function install(next) {
    data = next;
    if (data && typeof data.today === "string" && localToday() > data.today) data.today = localToday();
    if (typeof quickState !== "undefined") quickState.clear();
    buildIndex();
    mailingData = null; // prehľad mailingu sa po novom načítaní dashboardu načíta znova, keď bude treba
    const ro = !!data.readOnly;
    document.body.classList.toggle("ro", ro);
    $("source").href = data.sourceUrl;
    updateLoaded();
    $("newcall").disabled = ro;
    $("newvisit").disabled = ro;
    $("devices").hidden = ro && !window.APPKA;
    if (window.APPKA) $("devices").textContent = "Odhlásiť toto zariadenie";
    render();
    if ($("detail").open && detailRow) detail(detailRow); // otvorený detail ukáže čerstvé údaje
  }
  let refreshing = false,
    offline = false, // appka: posledná obnova zlyhala pre výpadok spojenia, zobrazené sú uložené údaje
    lastFresh = 0,
    refreshSeq = 0,
    refreshWaiters = [];
  // Formuláre na zápis sa otvoria až s čerstvými údajmi – inak by predvyplnili stav spred posledného uloženia
  // a server by zápis odmietol (riadok sa medzičasom zmenil) alebo by sa prepísal predchádzajúci zápis.
  function afterRefresh(fn) {
    if (!refreshing) return fn();
    toast("Dokončujem obnovu údajov po uložení, formulár sa otvorí o chvíľu…");
    refreshWaiters.push(fn);
  }
  async function refresh(force, why) {
    if (window.PREVIEW_DATA) {
      toast("Toto je náhľad údajov z 8.10.2026. Živé načítanie bude dostupné po nasadení.");
      return;
    }
    const seq = ++refreshSeq; // pri viacerých obnovách naraz sa použije len posledná
    refreshing = true;
    updateLoaded();
    $("refresh").disabled = true;
    try {
      const t = performance.now();
      const got = await fetchDashboard(force),
        r = got.r;
      if (seq !== refreshSeq) return;
      const net = performance.now() - t - got.unzip,
        tr = performance.now();
      refreshing = false;
      offline = false;
      lastFresh = Date.now();
      install(r);
      const draw = performance.now() - tr,
        tm = r.timing || {};
      logTiming({
        akcia: why || (force === true ? "načítanie (Obnoviť)" : "načítanie"),
        spolu: net + got.unzip + draw,
        server: tm.server,
        pamäť: tm.cache === "hit" ? "použitá" : tm.cache === "skip" ? "vynechaná (Obnoviť)" : "prázdna",
        "čítanie tabuľky": tm.read,
        "skladanie modelu": tm.model,
        komprimácia: tm.zip,
        "prenos a réžia Google": tm.server != null ? Math.max(0, net - tm.server) : undefined,
        rozbalenie: got.unzip || undefined,
        "vykreslenie v prehliadači": draw,
        kB: got.kB,
        "kB prenesené": got.kBz,
      });
      if (!why) timingLabel = "načítané za " + sec(net + got.unzip + draw);
      updateLoaded();
    } catch (e) {
      if (seq !== refreshSeq) return;
      const off = e.code === "offline";
      if (off) {
        // appka bez signálu: uložené údaje ostanú, obnova sa zopakuje sama po návrate spojenia
        if (data && !offline) toast("Bez pripojenia – zobrazujem uložené údaje z " + data.loadedAt + ".");
        offline = true;
      }
      if (data) {
        if (!off) toast("Obnovenie zlyhalo: " + e.message);
      } else if (off)
        $("content").innerHTML =
          '<div class="error">Bez pripojenia. V tomto zariadení zatiaľ nie sú uložené žiadne údaje – pripoj sa a klikni na Obnoviť.</div>';
      else
        $("content").innerHTML =
          '<div class="error">Údaje sa nepodarilo načítať. ' +
          esc(e.message) +
          "<p>Skontroluj účet a prístup k tabuľke a klikni na Obnoviť.</p></div>";
    } finally {
      if (seq === refreshSeq) {
        refreshing = false;
        updateLoaded();
        $("refresh").disabled = false;
        const w = refreshWaiters;
        refreshWaiters = [];
        w.forEach((fn) => fn());
      }
    }
  }
  // ---------- mailing: načíta sa až pri otvorení záložky ----------
  let mailingData = null,
    mailingLoading = false;
  async function loadMailing(force) {
    if (mailingLoading || window.PREVIEW_DATA) return;
    mailingLoading = true;
    const t = performance.now();
    try {
      const m = await api("getMailing", force === true);
      mailingData = m;
      const tm = m.timing || {};
      logTiming({
        akcia: "mailing",
        spolu: performance.now() - t,
        server: tm.server,
        pamäť: tm.cache === "hit" ? "použitá" : "prázdna",
        kB: Math.round(JSON.stringify(m).length / 1024),
      });
    } catch (e) {
      mailingData = { ok: false, error: e.message };
    } finally {
      mailingLoading = false;
      if (view === "mailing") render();
    }
  }
  // Úlohy sa delia na moje a tie, ktoré po odoslaní katalógu vytvoril mailing (d.mailTask zo servera).
  function tasks(kind) {
    return data.devices
      .filter((d) => d.open && (kind === "mail" ? d.mailTask : !d.mailTask))
      .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999") || a.name.localeCompare(b.name, "sk"));
  }
  function appointments() {
    return data.devices.filter((d) => d.appointment).sort((a, b) => a.appointment.localeCompare(b.appointment));
  }
  function mailInfo(d) {
    const x = data.mailDevices && data.mailDevices[d.row];
    if (!x) return "";
    const p = [];
    if (x.sent) p.push("Mail s katalógom odoslaný " + esc(format(x.sent)));
    else if (x.mail) p.push("Mail s katalógom zatiaľ neodoslaný");
    if (x.hold) p.push("Neposielať: " + esc(x.hold));
    if (x.unsub) p.push("Odhlásené z mailingu");
    return p.length ? '<p class="muted">' + p.join(" · ") + "</p>" : "";
  }
  function mlRowsHtml(rows, fallback) {
    const rs = String(rows || "")
      .split(/[,; ]+/)
      .map(Number)
      .filter(Boolean);
    const ds = rs.map((r) => byRow.get(r)).filter(Boolean);
    return ds.length ? ds.map((d) => nameButton(d)).join("<br>") : esc(fallback || "");
  }
  function mlTable(heads, rows) {
    return (
      '<div class="tablewrap"><table><thead><tr>' +
      heads.map((h) => '<th scope="col">' + h + "</th>").join("") +
      "</tr></thead><tbody>" +
      rows.join("") +
      "</tbody></table></div>"
    );
  }
  function mailingView() {
    const m = mailingData;
    if (!m) {
      loadMailing();
      return empty("Načítavam mailing…");
    }
    if (!m.ok) return '<div class="error">Mailing sa nepodarilo načítať: ' + esc(m.error || "") + "</div>";
    const fmt = (s) => (s ? esc(format(s.slice(0, 10))) + (s.length > 10 ? " " + esc(s.slice(11)) : "") : "");
    const bounced = new Set(m.bounced.map((b) => b.mail));
    let h =
      '<div class="metrics">' +
      metric(m.test ? "TEST" : "OSTRO", "Režim mailingu") +
      metric(m.sent.length, "Odoslaných mailov") +
      metric(m.bounced.length, "Nedoručených") +
      metric(m.waiting, "Čaká na mail (" + esc(m.cats) + ")") +
      "</div>";
    h +=
      '<div class="banner">' +
      (m.test ? "<strong>Testovací režim je zapnutý</strong> - maily idú len na testovaciu adresu. " : "") +
      "Denné odosielanie: <strong>" +
      (m.daily ? "zapnuté" : "vypnuté") +
      "</strong>" +
      (m.scheduled ? " · <strong>naplánovaná jednorazová dávka</strong>" : "") +
      (m.bounceCheck ? " · naplánovaná kontrola nedoručených" : "") +
      " · dávka " +
      m.batch +
      ", max " +
      m.perDay +
      " denne" +
      (m.prio ? " · prednostne: " + esc(m.prio) : "") +
      ". Odosiela sa z tabuľky cez menu Mailing.</div>";
    h +=
      '<section class="panel" style="margin-top:16px"><div class="panelhead"><h2>Ďalšia dávka · ' +
      m.next.length +
      " z " +
      m.waiting +
      "</h2></div>" +
      (m.next.length
        ? mlTable(
            ["#", "Zariadenie", "Adresa", "Okres", "Kategória"],
            m.next.map(
              (g, i) =>
                "<tr><td>" +
                (i + 1) +
                "</td><td>" +
                mlRowsHtml(g.rows.join(","), g.names) +
                "</td><td>" +
                esc(g.mail) +
                "</td><td>" +
                esc(g.district) +
                "</td><td>" +
                esc(g.cat) +
                "</td></tr>",
            ),
          )
        : empty("Žiadne zariadenie nečaká na mail.")) +
      "</section>";
    h +=
      '<section class="panel" style="margin-top:16px"><div class="panelhead"><h2>Odoslané · ' +
      m.sent.length +
      "</h2></div>" +
      (m.sent.length
        ? mlTable(
            ["Odoslané", "Zariadenie", "Adresa", "Kategória", "Doručenie"],
            m.sent.map(
              (x) =>
                "<tr><td>" +
                fmt(x.at) +
                "</td><td>" +
                mlRowsHtml(x.rows, x.names) +
                "</td><td>" +
                esc(x.mail) +
                "</td><td>" +
                esc(x.cat) +
                "</td><td>" +
                (bounced.has(x.mail)
                  ? '<span class="pill danger">Nedoručené</span>'
                  : '<span class="pill success">Bez vrátenia</span>') +
                "</td></tr>",
            ),
          )
        : empty("Zatiaľ nebol odoslaný žiadny ostrý mail.")) +
      "</section>";
    h +=
      '<section class="panel" style="margin-top:16px"><div class="panelhead"><h2>Nedoručené · ' +
      m.bounced.length +
      "</h2></div>" +
      (m.bounced.length
        ? mlTable(
            ["Zistené", "Zariadenie", "Adresa", "Vrátená správa"],
            m.bounced.map(
              (x) =>
                "<tr><td>" +
                fmt(x.at) +
                "</td><td>" +
                mlRowsHtml(x.rows, x.names) +
                "</td><td>" +
                esc(x.mail) +
                "</td><td>" +
                esc(x.subject) +
                "</td></tr>",
            ),
          )
        : empty("Žiadne vrátené maily.")) +
      "</section>";
    h +=
      '<details class="panel" style="margin-top:16px;padding:16px"><summary><strong>Vynechané zariadenia · ' +
      m.skipped.length +
      "</strong> (Neoslovené, ale mail nedostanú)</summary>" +
      (m.skipped.length
        ? mlTable(
            ["Zariadenie", "Adresa", "Dôvod"],
            m.skipped.map(
              (x) =>
                "<tr><td>" +
                mlRowsHtml(x.row, x.name) +
                "</td><td>" +
                esc(x.mail) +
                "</td><td>" +
                esc(x.reason) +
                "</td></tr>",
            ),
          )
        : empty("Nič.")) +
      "</details>";
    return h;
  }
  function metric(n, label) {
    return '<div class="metric"><strong>' + n + "</strong><span>" + label + "</span></div>";
  }
  const CAT_COLORS = {
    "Po termíne": ["#fcede8", "#da3c11"],
    Dnes: ["#e7f0f8", "#0b65b3"],
    Naplánované: ["#f3f5f8", "#4b5563"],
    "Bez termínu": ["#f3f5f8", "#4b5563"],
  };
  function catPill(c) {
    const k = CAT_COLORS[c] || CAT_COLORS["Bez termínu"];
    return '<span class="pill" style="background:' + k[0] + ";color:" + k[1] + '">' + esc(c) + "</span>";
  }
  const MISSING = '<span class="pill warn">Ďalší krok nevyplnený</span>';
  function checkBtn(d) {
    return (
      '<button class="check" data-done="' +
      d.row +
      '" title="Označiť ako splnené" aria-label="Označiť úlohu ako splnenú"></button>'
    );
  }
  function taskItem(d) {
    return (
      '<div class="item" style="border-left:3px solid ' +
      statusColor(d.status)[2] +
      ';padding-left:14px"><div style="display:flex;gap:12px;align-items:flex-start">' +
      checkBtn(d) +
      '<div><button class="name" data-detail="' +
      d.row +
      '">' +
      esc(d.name) +
      "</button><p>" +
      esc(d.taskText || d.action) +
      (d.actionMissing ? " " + MISSING : "") +
      "</p><p>" +
      esc(d.district) +
      "</p><p>" +
      status(d) +
      '</p></div></div><div class="date">' +
      (d.deadline ? esc(format(d.deadline)) + "<br>" : "") +
      catPill(d.category) +
      "</div></div>"
    );
  }
  function apptItem(d) {
    return (
      '<div class="item" style="border-left:3px solid ' +
      statusColor(d.status)[2] +
      ';padding-left:14px"><div><button class="name" data-detail="' +
      d.row +
      '">' +
      esc(d.name) +
      "</button><p>" +
      esc(d.city) +
      " · " +
      (d.confirmed ? "Potvrdené" : d.status === "Ukážka absolvovaná" ? "Absolvované" : "Na potvrdenie") +
      '</p></div><div class="date">' +
      esc(format(d.appointment, true)) +
      "</div></div>"
    );
  }
  function barChart(key) {
    const groups = {};
    data.devices.forEach((d) => (groups[d[key]] = (groups[d[key]] || 0) + 1));
    const max = Math.max(...Object.values(groups));
    return (
      '<div class="bars">' +
      Object.entries(groups)
        .sort((a, b) => b[1] - a[1])
        .map(
          ([name, n]) =>
            '<div class="barrow"><span>' +
            esc(name) +
            '</span><div class="bar"><i style="width:' +
            (n / max) * 100 +
            "%" +
            (key === "status" ? ";background:" + statusColor(name)[2] : "") +
            '"></i></div><strong>' +
            n +
            "</strong></div>",
        )
        .join("") +
      "</div>"
    );
  }
  // Agenda dňa: ukážky, plánované výkony BOZP a OPP, termíny úloh Flowii a moje úlohy s termínom v daný deň.
  function agendaItems(iso) {
    const out = [],
      clients = (data.clients || []).filter((c) => !c.hidden);
    data.devices
      .filter((d) => d.appointment && d.appointment.slice(0, 10) === iso)
      .forEach((d) =>
        out.push({
          t: calTime(d.appointment),
          k: "demo",
          btn: '<button class="name" data-detail="' + d.row + '">' + esc(d.name) + "</button>",
          p:
            '<span class="agtag">EnSafe</span>' +
            "Ukážka · " +
            esc(d.city) +
            " · " +
            (d.confirmed ? "potvrdená" : "na potvrdenie"),
        }),
      );
    clients.forEach((c) => {
      const plan = c.plan && c.plan.slice(0, 10) === iso;
      if (plan || (c.next === iso && klNext(c).group !== "done"))
        out.push({
          t: plan ? calTime(c.plan) : "",
          k: "kl",
          btn: '<button class="name" data-klcard="' + esc(c.id) + '">' + esc(c.name) + "</button>",
          p:
            '<span class="agtag kl">BOZP a OPP</span>' +
            (plan ? "Výkon" : "Úloha vo Flowii: ďalší výkon") +
            (c.city ? " · " + esc(c.city) : ""),
        });
    });
    tasks()
      .filter((d) => d.deadline === iso && !(d.appointment && d.appointment.slice(0, 10) === iso))
      .forEach((d) =>
        out.push({
          t: "",
          k: "task",
          btn: '<button class="name" data-detail="' + d.row + '">' + esc(d.name) + "</button>",
          p: '<span class="agtag">EnSafe</span>' + "Úloha: " + esc(d.taskText || d.action || "bez textu"),
        }),
      );
    return out.sort((a, b) => (a.t || "99").localeCompare(b.t || "99"));
  }
  function agendaHtml() {
    const tomorrow = klAddDays(data.today, 1),
      late = tasks().filter((d) => d.category === "Po termíne").length,
      day = (iso, label) => {
        const items = agendaItems(iso);
        return (
          '<div><div class="agday">' +
          label +
          " · " +
          CAL_DOW[(new Date(iso + "T12:00").getDay() + 6) % 7] +
          " " +
          esc(format(iso)) +
          "</div>" +
          (items
            .map(
              (x) =>
                '<div class="item ag-' +
                x.k +
                '"><div>' +
                x.btn +
                "<p>" +
                x.p +
                '</p></div><div class="date">' +
                (x.t || (x.k === "task" ? "" : "celý deň")) +
                "</div></div>",
            )
            .join("") || '<p class="muted agempty">Nič naplánované.</p>') +
          "</div>"
        );
      };
    return (
      '<section class="panel agenda"><div class="panelhead"><h2>Agenda</h2><button class="btn" data-view="calendar">Kalendár</button></div><div class="list agcols">' +
      day(data.today, "Dnes") +
      day(tomorrow, "Zajtra") +
      "</div>" +
      (late
        ? '<p class="agempty agmore"><button class="link" data-view="tasks" data-group="work">Moje úlohy: ' +
          late +
          " po termíne</button></p>"
        : "") +
      "</section>"
    );
  }
  // Klienti BOZP a OPP v Prehľade: počty a klienti po termíne alebo s výkonom tento týždeň.
  function klOverviewHtml() {
    const all = (data.clients || []).filter((c) => !c.hidden);
    if (!all.length) return "";
    const rows = all.map((c) => [c, klNext(c)]),
      late = rows.filter(([, n]) => n.group === "late"),
      week = rows.filter(([, n]) => n.group === "week"),
      defects = klOpenDefects("").filter((x) => all.some((c) => c.id === x.client)).length,
      duty = all.filter((c) => klRemindLines(c).some((x) => x.flag === "late")).length,
      top = late.concat(week).slice(0, 5);
    return (
      '<h2 class="ovsec">Klienti BOZP a OPP</h2>' +
      '<section class="panel"><div class="panelhead"><h2>Výkony po termíne a tento týždeň' +
      (late.length ? ' · <span style="color:var(--accent)">' + late.length + " po termíne</span>" : "") +
      '</h2><button class="btn" data-view="clients">Všetci klienti</button></div>' +
      '<div class="klsum"><span><b>' +
      week.length +
      "</b> výkonov tento týždeň</span>" +
      '<button class="link" data-view="kldefects"><b>' +
      defects +
      "</b> otvorených nedostatkov</button>" +
      "<span" +
      (duty ? ' class="kllate"' : "") +
      "><b>" +
      duty +
      "</b> klientov s povinnosťou po termíne</span></div>" +
      '<div class="list">' +
      (top.map(([c, n]) => klRowHtml(c, n)).join("") || empty("Žiadny výkon po termíne ani tento týždeň.")) +
      "</div></section>"
    );
  }
  function overview() {
    const ds = data.devices,
      upcoming = appointments().filter((d) => d.confirmed && d.appointment.slice(0, 10) >= data.today);
    const overdue = tasks().filter((d) => d.category === "Po termíne").length;
    const mailT = tasks("mail"),
      mailDue = mailT.filter((d) => d.category === "Po termíne" || d.category === "Dnes").length;
    return (
      agendaHtml() +
      '<h2 class="ovsec">EnSafe – evakuačné pomôcky</h2>' +
      (mailT.length
        ? '<div class="banner" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><span>Po mailingu čaká na zavolanie <strong>' +
          mailT.length +
          "</strong> zariadení" +
          (mailDue ? " (" + mailDue + " dnes alebo po termíne)" : "") +
          '. V Mojich úlohách nie sú, majú samostatný zoznam.</span><button class="btn" data-view="mailtasks">Zobraziť Po mailingu</button></div>'
        : "") +
      shipBanner() +
      '<div class="grid"><section class="panel"><div class="panelhead"><h2>Moje úlohy' +
      (overdue ? ' · <span style="color:var(--accent)">' + overdue + " po termíne</span>" : "") +
      '</h2><button class="btn" data-view="tasks">Všetky úlohy</button></div><div class="list">' +
      (tasks().slice(0, 5).map(taskItem).join("") || empty("Všetky úlohy sú vybavené.")) +
      '</div></section><section class="panel"><div class="panelhead"><h2>Najbližšie ukážky</h2><button class="btn" data-view="appointments">Všetky termíny</button></div><div class="list">' +
      (upcoming.slice(0, 5).map(apptItem).join("") || empty("Zatiaľ nie je dohodnutá budúca ukážka.")) +
      "</div></section></div>" +
      '<div class="metrics">' +
      metric(ds.length, "Zariadení") +
      metric(ds.filter((d) => d.contacted).length, "Oslovených pracovísk") +
      metric(upcoming.length, "Dohodnutých ukážok") +
      metric(data.activityStats.demoEvents, "Potvrdených ukážok") +
      metric(data.activityStats.coveredSites, "Pracovísk zastúpených na ukážkach") +
      metric(data.activityStats.visitedSites, "Osobne navštívených pracovísk") +
      metric(tasks().length, "Mojich otvorených úloh") +
      metric(ds.filter((d) => d.order).length, "Potvrdených objednávok") +
      "</div>" +
      '<div class="banner"><strong>Ukážky a návštevy sa počítajú samostatne.</strong> Spoločná ukážka je jedna udalosť; všetky zastúpené pracoviská sú uvedené v histórii.' +
      (data.activityStats.visitOnlySites
        ? " " + data.activityStats.visitOnlySites + " návštevy zatiaľ nemajú potvrdenú praktickú ukážku."
        : "") +
      "</div>" +
      '<div class="grid"><section class="panel"><div class="panelhead"><h2>Stav oslovenia</h2></div>' +
      barChart("status") +
      '</section><section class="panel"><div class="panelhead"><h2>Zariadenia podľa okresu</h2></div>' +
      barChart("district") +
      "</section></div>" +
      klOverviewHtml()
    );
  }
  // ---------- zásielky ----------
  // data.shipments: jeden riadok na zásielku a zariadenie (hárok „Zásielky“); s.dev = riadok zariadenia v Kontaktoch.
  const SHIP = {
    onWay: "Na ceste",
    stock: "Na sklade",
    sentOn: "Poslané zákazníkovi",
    done: "Doručené",
    off: "Zrušené",
  };
  const SHIP_COLORS = {
    "Na ceste": ["#fff6db", "#7a5b00"],
    "Na sklade": ["#e3f3ea", "#1b6b45"],
    "Poslané zákazníkovi": ["#e7f0f8", "#0b65b3"],
    Doručené: ["#f3f5f8", "#4b5563"],
    Zrušené: ["#f3f5f8", "#4b5563"],
  };
  // dopravcovia na výber (rovnaký zoznam ako SHIP.carriers na serveri, podľa ktorého sa rozpoznávajú v maile)
  const SHIP_CARRIERS = [
    "DHL",
    "DPD",
    "GLS",
    "UPS",
    "FedEx",
    "TNT",
    "InPost",
    "Packeta",
    "SPS",
    "Geis",
    "Raben",
    "Schenker",
  ];
  // priame sledovanie u dopravcu; ostatní a neznámy dopravca → univerzálne sledovanie 17TRACK (dopravcu spozná z čísla)
  const SHIP_TRACK = {
    dhl: "https://www.dhl.com/sk-sk/home/tracking.html?tracking-id=",
    gls: "https://gls-group.com/track/",
    ups: "https://www.ups.com/track?tracknum=",
    dpd: "https://tracking.dpd.de/status/sk_SK/parcel/",
    fedex: "https://www.fedex.com/fedextrack/?trknbr=",
    packeta: "https://tracking.packeta.com/sk/?id=",
    inpost: "https://inpost.pl/sledzenie-przesylek?number=",
  };
  const SHIP_TRACK_ANY = "https://t.17track.net/sk#nums=";
  // zásielka po očakávanom doručení stále na ceste; bez očakávaného doručenia viac ako SHIP_LATE_DAYS dní od odoslania
  const SHIP_LATE_DAYS = 10;
  const shipLate = (s) =>
    s.status === SHIP.onWay && (s.eta ? s.eta < data.today : !!s.sent && s.sent < addDays(-SHIP_LATE_DAYS));
  const shipActive = () => (data.shipments || []).filter((s) => s.status !== SHIP.off);
  const shipsOf = (d) => shipActive().filter((s) => s.dev === d.row);
  const shipInStock = (d) => shipsOf(d).some((s) => s.status === SHIP.stock);
  const shipCanEdit = () => !data.readOnly && !window.APPKA; // priradenie, pridanie a pošta sú len v dashboarde
  function shipPill(st) {
    const c = SHIP_COLORS[st] || SHIP_COLORS[SHIP.onWay];
    return '<span class="pill" style="background:' + c[0] + ";color:" + c[1] + '">' + esc(st) + "</span>";
  }
  function shipNo(s) {
    if (!s.no) return "bez čísla";
    const url = SHIP_TRACK[s.carrier.toLowerCase()] || SHIP_TRACK_ANY;
    return '<a target="_blank" rel="noopener" href="' + esc(url + encodeURIComponent(s.no)) + '">' + esc(s.no) + "</a>";
  }
  function shipWhen(s) {
    return s.status === SHIP.done
      ? "doručené " + format(s.delivered)
      : s.status === SHIP.onWay
        ? s.eta
          ? "očakávané " + format(s.eta) + (shipLate(s) ? " – mešká" : "")
          : s.sent
            ? "odoslané " + format(s.sent) + (shipLate(s) ? " – mešká" : "")
            : ""
        : s.stock
          ? "na sklade od " + format(s.stock)
          : "";
  }
  // tlačidlo ďalšieho kroku pri riadku zásielky
  function shipNext(s) {
    if (data.readOnly) return "";
    if (s.status === SHIP.onWay)
      return '<button class="btn" data-shipset="' + s.row + '" data-status="' + SHIP.stock + '">Na sklade</button>';
    if (s.status === SHIP.stock || s.status === SHIP.sentOn)
      return s.name
        ? '<button class="btn primary" data-shipset="' + s.row + '" data-status="' + SHIP.done + '">Doručené</button>'
        : "";
    return "";
  }
  // zásielky zariadenia v detaile a na mape
  function shipInfo(d) {
    return shipsOf(d)
      .sort((a, b) => (b.sent || "").localeCompare(a.sent || ""))
      .map(
        (s) =>
          '<p class="shipline">Zásielka: ' +
          shipPill(s.status) +
          ' <span class="muted">' +
          esc([s.carrier, shipWhen(s)].filter(Boolean).join(" · ")) +
          "</span> " +
          shipNext(s) +
          "</p>",
      )
      .join("");
  }
  function shipGroups() {
    const m = new Map();
    shipActive().forEach((s) => {
      if (!m.has(s.g)) m.set(s.g, []);
      m.get(s.g).push(s);
    });
    return [...m.values()].sort((a, b) => (b[0].sent || "").localeCompare(a[0].sent || "") || b[0].row - a[0].row);
  }
  const shipOpen = (g) => g.some((s) => s.status !== SHIP.done);
  function shipSummary() {
    const open = shipGroups().filter(shipOpen),
      way = open.filter((g) => g.some((s) => s.status === SHIP.onWay)),
      late = way.filter((g) => g.some(shipLate)).length,
      etas = way
        .map((g) => g[0].eta)
        .filter(Boolean)
        .sort();
    return {
      way: way.length,
      late,
      eta: etas[0] || "",
      stock: shipActive().filter((s) => s.status === SHIP.stock && s.name).length,
      free: open.filter((g) => g.every((s) => !s.name)).length,
    };
  }
  function shipBanner() {
    const x = shipSummary();
    if (!x.way && !x.stock && !x.free) return "";
    const p = [];
    if (x.way)
      p.push(
        "<strong>" +
          x.way +
          "</strong> " +
          (x.way === 1 ? "zásielka je" : x.way < 5 ? "zásielky sú" : "zásielok je") +
          " na ceste" +
          (x.late
            ? ", <strong>" + x.late + "</strong> " + (x.late === 1 ? "mešká" : "meškajú")
            : x.eta
              ? " (očakávaná " + esc(format(x.eta)) + ")"
              : ""),
      );
    if (x.stock)
      p.push(
        "tovar pre <strong>" +
          x.stock +
          "</strong> " +
          (x.stock === 1 ? "zariadenie" : x.stock < 5 ? "zariadenia" : "zariadení") +
          " čaká na rozvoz",
      );
    if (x.free)
      p.push(
        "<strong>" +
          x.free +
          "</strong> " +
          (x.free === 1 ? "zásielka nemá" : "zásielky nemajú") +
          " priradené zariadenia",
      );
    return (
      '<div class="banner" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><span>Zásielky: ' +
      p.join(" · ") +
      '.</span><button class="btn" data-view="shipments">Zobraziť zásielky</button></div>'
    );
  }
  function shipGroupHtml(g) {
    const s0 = g[0],
      edit = shipCanEdit(),
      way = g.filter((s) => s.status === SHIP.onWay);
    return (
      '<section class="panel shipgroup"><div class="panelhead"><h2>' +
      esc(s0.carrier || "Zásielka") +
      " · " +
      shipNo(s0) +
      (g.some(shipLate) ? " " + pill("Mešká", "warn") : "") +
      '</h2><div class="quick">' +
      (way.length && !data.readOnly
        ? '<button class="btn primary" data-shipset="' +
          way[0].row +
          '" data-status="' +
          SHIP.stock +
          '" data-all="1">Dorazilo na sklad</button>'
        : "") +
      (edit ? '<button class="btn" data-shipassign="' + s0.row + '">Priradiť zariadenia</button>' : "") +
      (edit ? '<button class="btn" data-shipedit="' + s0.row + '">Opraviť</button>' : "") +
      '</div></div><p class="muted shipmeta">' +
      esc(
        [
          s0.sent ? "Odoslané " + format(s0.sent) : "",
          s0.eta ? "očakávané doručenie " + format(s0.eta) : "",
          s0.src.startsWith("mail:") ? "načítané z pošty" : "zadané ručne",
          s0.note,
        ]
          .filter(Boolean)
          .join(" · "),
      ) +
      '</p><div class="tablewrap"><table><tbody>' +
      g
        .map((s) => {
          const d = s.dev ? byRow.get(s.dev) : null;
          return (
            "<tr><td>" +
            (d
              ? nameButton(d)
              : s.name
                ? esc(s.name)
                : '<span class="muted">Zatiaľ bez zariadenia' +
                  (edit ? " – klikni na Priradiť zariadenia" : "") +
                  "</span>") +
            (s.city ? "<small>" + esc(s.city) + "</small>" : "") +
            "</td><td>" +
            shipPill(s.status) +
            (shipWhen(s) ? "<small" + (shipLate(s) ? ' class="late"' : "") + ">" + esc(shipWhen(s)) + "</small>" : "") +
            (window.APPKA && window.APPKA.pendingFor && s.name && window.APPKA.pendingFor(s.name)
              ? " " + pill("Čaká na odoslanie", "warn")
              : "") +
            '</td><td class="shipact">' +
            (g.length > 1 || s.status !== SHIP.onWay ? shipNext(s) : "") +
            (data.readOnly
              ? ""
              : '<select data-shipsel="' +
                s.row +
                '" aria-label="Zmeniť stav zásielky">' +
                Object.values(SHIP)
                  .map((st) => "<option" + (st === s.status ? " selected" : "") + ">" + esc(st) + "</option>")
                  .join("") +
                "</select>") +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div></section>"
    );
  }
  function shipView() {
    const groups = shipGroups(),
      open = groups.filter(shipOpen),
      done = groups.filter((g) => !shipOpen(g));
    return (
      (shipCanEdit()
        ? '<div class="quick shipbar"><button class="btn" id="shipscan">Skontrolovať poštu</button><button class="btn" data-shipadd="1">Pridať zásielku ručne</button></div>'
        : "") +
      (data.shipError ? '<div class="error">' + esc(data.shipError) + "</div>" : "") +
      '<p class="muted" style="margin:0 0 12px;font-size:14px">Zásielky od dodávateľa sa načítajú z pošty (mail s číslom zásielky) každú hodinu. Priraď im zariadenia; po príchode klikni „Dorazilo na sklad“ a po odovzdaní zákazníkovi „Doručené“. Zariadenia s tovarom na sklade sú zvýraznené na mape.</p>' +
      (open.map(shipGroupHtml).join("") || empty("Žiadna zásielka nie je na ceste ani na sklade.")) +
      (done.length
        ? '<details class="panel" style="margin-top:16px;padding:16px"><summary><strong>Doručené · ' +
          done.length +
          "</strong></summary>" +
          done.map(shipGroupHtml).join("") +
          "</details>"
        : "")
    );
  }
  async function shipSave(name, arg, okMsg, btn) {
    if (statusSaving || window.PREVIEW_DATA) return false;
    if (refreshing) {
      toast("Ešte obnovujem údaje po uložení, skús to o chvíľu.");
      return false;
    }
    statusSaving = true;
    if (btn) btn.disabled = true;
    try {
      const r = await timedSave(name, arg);
      if (!(r && r.queued)) toast(okMsg);
      await applySaved(r);
      return true;
    } catch (e) {
      toast("Zápis zásielky zlyhal: " + e.message);
      if (btn) btn.disabled = false;
      return false;
    } finally {
      statusSaving = false;
    }
  }
  async function shipSet(row, st, all, el) {
    const s = (data.shipments || []).find((x) => x.row === +row);
    if (!s || st === s.status) return;
    if (
      st === SHIP.off &&
      !confirm("Zrušiť tento riadok zásielky? V hárku ostane so stavom Zrušené a dashboard ho prestane ukazovať.")
    ) {
      if (el && el.tagName === "SELECT") el.value = s.status;
      return;
    }
    // doručenie zariadeniu: okno s nepovinným naplánovaním ďalšieho kontaktu (školenie)
    if (st === SHIP.done && s.dev && byRow.get(s.dev) && !data.readOnly) {
      if (el && el.tagName === "SELECT") el.value = s.status;
      return openShipDone(s);
    }
    const ok = await shipSave(
      "shipSetStatus",
      { row: s.row, name: s.name, version: s.version, status: st, all: !!all },
      "Zásielka" + (s.name ? " – " + s.name : "") + ": " + st + ".",
      el,
    );
    if (!ok && el && el.tagName === "SELECT") el.value = s.status;
    if (ok && $("detail").open && detailRow) detail(detailRow);
  }
  let shipDoneRow = null;
  const sdf = () => $("shipdoneform").elements;
  function openShipDone(s) {
    const d = byRow.get(s.dev);
    shipDoneRow = s;
    $("shipdonename").textContent = s.name + (s.city ? ", " + s.city : "");
    sdf().plan.checked = false;
    $("shipdoneplan").hidden = true;
    sdf().action.value = "Školenie – ako používať produkty EnSafe";
    sdf().deadline.value = "";
    sdf().deadline.min = data.today;
    sdf().waitTraining.checked = true;
    $("shipdonehint").textContent = nextHint(d);
    $("shipdoneerror").hidden = true;
    $("saveshipdone").disabled = !!window.PREVIEW_DATA;
    $("shipdone").showModal();
  }
  sdf().plan.onchange = () => {
    $("shipdoneplan").hidden = !sdf().plan.checked;
    sdf().deadline.required = sdf().plan.checked;
  };
  $("shipdone").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-splus]");
    if (b) sdf().deadline.value = addDays(+b.dataset.splus);
  });
  $("shipdone").addEventListener("cancel", (e) => {
    if (statusSaving) e.preventDefault();
  });
  $("shipdoneform").onsubmit = async (e) => {
    e.preventDefault();
    const s = shipDoneRow;
    if (!s || statusSaving) return;
    const arg = { row: s.row, name: s.name, version: s.version, status: SHIP.done, all: false };
    if (sdf().plan.checked)
      arg.plan = {
        row: s.dev,
        action: sdf().action.value,
        deadline: sdf().deadline.value,
        waitTraining: sdf().waitTraining.checked,
      };
    const ok = await shipSave(
      "shipSetStatus",
      arg,
      "Zásielka – " + s.name + ": " + SHIP.done + (arg.plan ? ", ďalší kontakt naplánovaný." : "."),
      $("saveshipdone"),
    );
    if (!ok) return;
    $("saveshipdone").disabled = false;
    $("shipdone").close();
    if ($("detail").open && detailRow) detail(detailRow);
  };
  async function shipScanRun(btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = "Kontrolujem poštu…";
    try {
      const r = await api("shipScan");
      toast(
        r.added.length
          ? "Nové zásielky: " +
              r.added.map((a) => [a.carrier, a.no].filter(Boolean).join(" ")).join(", ") +
              ". Priraď im zariadenia."
          : r.unread
            ? "Našiel som " + r.unread + " mail(y) o zásielke, ale číslo zásielky sa z nich nepodarilo prečítať."
            : "V pošte nie je žiadna nová zásielka.",
      );
      if (r.added.length) refresh(true, "zásielky");
    } catch (e) {
      toast("Poštu sa nepodarilo skontrolovať: " + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Skontrolovať poštu";
    }
  }
  // Okno na priradenie zariadení k zásielke (mode "assign") a na ručné pridanie zásielky (mode "add").
  let shipDlg = null; // { mode, row, picked: Set riadkov zariadení }
  function shipDialog(mode, row) {
    let dlg = $("shipdlg");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "shipdlg";
      dlg.innerHTML =
        '<div class="panelhead"><h2 id="shipdlgtitle"></h2><button class="btn" type="button" data-close="shipdlg">Zavrieť</button></div>' +
        '<form class="dialogbody" id="shipform"><div class="formgrid" id="shipfields">' +
        '<label class="field">Dopravca<input name="carrier" maxlength="40" placeholder="napr. DHL" list="shipcarriers"></label>' +
        '<datalist id="shipcarriers">' +
        SHIP_CARRIERS.map((c) => "<option>" + esc(c) + "</option>").join("") +
        "</datalist>" +
        '<label class="field">Číslo zásielky<input name="no" maxlength="60" placeholder="nepovinné"></label>' +
        '<label class="field">Odoslané<input name="sent" type="date"></label>' +
        '<label class="field">Očakávané doručenie<input name="eta" type="date"></label>' +
        '<label class="field" id="shipstatusf">Stav<select name="status"><option>Na ceste</option><option>Na sklade</option><option>Poslané zákazníkovi</option></select></label>' +
        '<label class="field">Poznámka<input name="note" maxlength="500"></label></div>' +
        '<div id="shipdevs"><label class="field">Zariadenia<input id="shipsearch" type="search" placeholder="Hľadať zariadenie podľa názvu alebo obce"></label>' +
        '<div id="shiplist" class="shiplist"></div></div><div class="error" id="shiperror" hidden></div>' +
        '<div class="formfoot"><button class="btn primary" id="shipsave">Uložiť</button></div></form>';
      document.body.append(dlg);
      $("shipsearch").addEventListener("input", shipListPaint);
      $("shiplist").addEventListener("change", (e) => {
        const r = +e.target.dataset.pick;
        if (!r || !shipDlg) return;
        if (e.target.checked) shipDlg.picked.add(r);
        else shipDlg.picked.delete(r);
        shipListPaint();
      });
      $("shipform").addEventListener("submit", shipDialogSave);
    }
    const s = mode !== "add" ? (data.shipments || []).find((x) => x.row === +row) : null;
    if (mode !== "add" && !s) return;
    shipDlg = { mode, row: s ? s.row : 0, picked: new Set() };
    $("shipdlgtitle").textContent =
      mode === "edit" ? "Opraviť zásielku" : s ? "Zariadenia v zásielke " + (s.no || "") : "Nová zásielka";
    $("shipfields").hidden = mode === "assign";
    $("shipstatusf").hidden = mode === "edit";
    $("shipdevs").hidden = mode === "edit";
    const el = $("shipform").elements,
      e = mode === "edit" ? s : null;
    el.carrier.value = e ? e.carrier : "";
    el.no.value = e ? e.no : "";
    el.eta.value = e ? e.eta : "";
    el.note.value = e ? e.note : "";
    el.sent.value = e ? e.sent : data.today;
    el.sent.max = data.today;
    el.status.value = SHIP.onWay;
    $("shipsearch").value = "";
    $("shiperror").hidden = true;
    $("shipsave").textContent = mode === "edit" ? "Uložiť opravu" : s ? "Priradiť zariadenia" : "Pridať zásielku";
    shipListPaint();
    dlg.showModal();
  }
  function shipListPaint() {
    if (!shipDlg) return;
    const q = normalize($("shipsearch").value || "").trim(),
      inGroup = new Set(),
      cur = shipDlg.row ? (data.shipments || []).find((x) => x.row === shipDlg.row) : null;
    if (cur) shipActive().forEach((s) => s.g === cur.g && s.dev && inGroup.add(s.dev));
    const picked = [...shipDlg.picked].map((r) => byRow.get(r)).filter(Boolean),
      // bez hľadania: zariadenia s potvrdenou objednávkou, ktoré ešte nemajú nedoručenú zásielku
      found = (
        q
          ? data.devices.filter((d) => hay(d).includes(q))
          : data.devices.filter((d) => d.order && !shipsOf(d).some((s) => s.status !== SHIP.done))
      )
        .filter((d) => !shipDlg.picked.has(d.row) && !inGroup.has(d.row))
        .slice(0, 30);
    const item = (d, on) =>
      '<label class="checkbox"><input type="checkbox" data-pick="' +
      d.row +
      '"' +
      (on ? " checked" : "") +
      "><span>" +
      esc(d.name) +
      ' <span class="muted">' +
      esc([d.city, d.order ? "objednávka potvrdená" : ""].filter(Boolean).join(" · ")) +
      "</span></span></label>";
    $("shiplist").innerHTML =
      picked.map((d) => item(d, true)).join("") +
      (found.length
        ? '<p class="muted">' +
          (q ? "Nájdené:" : "Zariadenia s potvrdenou objednávkou bez zásielky:") +
          "</p>" +
          found.map((d) => item(d, false)).join("")
        : '<p class="muted">' +
          (q ? "Nič sa nenašlo." : "Žiadne ďalšie zariadenie s potvrdenou objednávkou – iné nájdeš hľadaním.") +
          "</p>");
  }
  async function shipDialogSave(e) {
    e.preventDefault();
    if (!shipDlg || statusSaving) return;
    const devices = [...shipDlg.picked]
        .map((r) => byRow.get(r))
        .filter(Boolean)
        .map((d) => ({ row: d.row, name: d.name })),
      el = $("shipform").elements,
      s = shipDlg.row ? (data.shipments || []).find((x) => x.row === shipDlg.row) : null,
      fail = (msg) => {
        $("shiperror").textContent = msg;
        $("shiperror").hidden = false;
      };
    $("shiperror").hidden = true;
    if (shipDlg.mode === "assign" && (!s || !devices.length)) return fail("Vyber aspoň jedno zariadenie.");
    if (shipDlg.mode === "edit" && !s) return fail("Zásielka sa medzičasom zmenila. Zavri okno a skús to znova.");
    if (shipDlg.mode === "add" && !devices.length && !el.no.value.trim())
      return fail("Zadaj číslo zásielky alebo vyber aspoň jedno zariadenie.");
    $("shipsave").disabled = true;
    statusSaving = true;
    try {
      const edit = shipDlg.mode === "edit",
        fields = {
          no: el.no.value,
          carrier: el.carrier.value,
          sent: el.sent.value,
          eta: el.eta.value,
          note: el.note.value,
        };
      const r = await timedSave(
        edit ? "shipEdit" : s ? "shipAssign" : "shipAdd",
        edit
          ? Object.assign({ row: s.row, name: s.name, version: s.version }, fields)
          : s
            ? { row: s.row, name: s.name, version: s.version, devices }
            : {
                no: el.no.value,
                carrier: el.carrier.value,
                sent: el.sent.value,
                eta: el.eta.value,
                status: el.status.value,
                note: el.note.value,
                devices,
              },
      );
      $("shipdlg").close();
      toast(
        edit
          ? r && r.unchanged
            ? "Zásielka sa nezmenila."
            : "Zásielka bola opravená."
          : s
            ? "Zariadenia boli priradené k zásielke."
            : "Zásielka bola pridaná.",
      );
      await applySaved(r);
    } catch (err) {
      fail(err.message);
    } finally {
      statusSaving = false;
      $("shipsave").disabled = false;
    }
  }
  /* ---------- kalendár ukážok (záložka Kalendár) ----------
     Termíny zo stĺpca L (d.appointment) po mesiacoch. Potvrdené budúce termíny sú v Google kalendári „Ukážky EnSafe“
     a synchronizujú sa obojsmerne (src/Kalendar.js): posun v Google kalendári sa zapíše sem, zmazaná udalosť čaká
     na rozhodnutie (data.calRemoved). Pri otvorení záložky sa synchronizácia spustí na pozadí (najviac raz za 2 min). */
  let calMonth = "", // zobrazený mesiac "2026-11"
    calSyncAt = 0,
    calSyncing = false;
  const calBusy = new Set();
  const CAL_MONTHS = [
    "Január",
    "Február",
    "Marec",
    "Apríl",
    "Máj",
    "Jún",
    "Júl",
    "August",
    "September",
    "Október",
    "November",
    "December",
  ];
  const CAL_DOW = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
  const CAL_KINDS = {
    ok: "Potvrdený termín – aj v Google kalendári",
    warn: "Termín na potvrdenie – v Google kalendári nie je",
    past: "Minulý alebo absolvovaný termín",
    kl: "Výkon BOZP a OPP – v Google kalendári „Výkony BOZP a OPP“",
  };
  // plánované výkony klientov (neskrytí klienti s plánom), zoradené podľa termínu
  const klPlans = () =>
    (data.clients || [])
      .filter((c) => c.plan && !c.hidden)
      .sort((a, b) => a.plan.localeCompare(b.plan) || a.name.localeCompare(b.name, "sk"));
  const klPlanKind = (c) => (c.plan.slice(0, 10) < data.today ? "past" : "kl");
  function klPlanChip(c, compact, mine) {
    const t = calTime(c.plan),
      title = (t ? t + " " : "") + "Výkon – " + c.name + (c.city ? ", " + c.city : "");
    return compact
      ? '<span class="calev k-' +
          klPlanKind(c) +
          " kl" +
          (mine ? " mine" : "") +
          '" title="' +
          esc(title) +
          '">' +
          (t ? "<b>" + t + "</b> " : "") +
          (mine ? "Tento klient" : "Výkon · " + esc(c.city || c.name)) +
          "</span>"
      : '<button type="button" class="calev k-' +
          klPlanKind(c) +
          ' kl" data-klcard="' +
          esc(c.id) +
          '" title="' +
          esc(title) +
          '">' +
          (t ? "<b>" + t + "</b> " : "") +
          "Výkon – " +
          esc(c.name) +
          "</button>";
  }
  const pad2 = (n) => String(n).padStart(2, "0");
  function calKind(d) {
    if (d.appointment.slice(0, 10) < data.today || /absolvovaná/.test(d.status)) return "past";
    return d.confirmed ? "ok" : "warn";
  }
  const calTime = (iso) => (iso.slice(11, 16) && iso.slice(11, 16) !== "00:00" ? iso.slice(11, 16) : "");
  function calChip(d) {
    const t = calTime(d.appointment);
    return (
      '<button type="button" class="calev k-' +
      calKind(d) +
      '" data-detail="' +
      d.row +
      '" title="' +
      esc((t ? t + " " : "") + d.name + (d.city ? ", " + d.city : "") + " – " + d.status) +
      '">' +
      (t ? "<b>" + t + "</b> " : "") +
      esc(d.name) +
      "</button>"
    );
  }
  function calShift(n) {
    if (!n) calMonth = data.today.slice(0, 7);
    else {
      const [y, m] = calMonth.split("-").map(Number),
        x = new Date(y, m - 1 + n, 1);
      calMonth = x.getFullYear() + "-" + pad2(x.getMonth() + 1);
    }
    render();
  }
  // zariadenie k zmazanej udalosti: kľúč je „názov|obec“ malými písmenami (pri rovnakých názvoch „#2“…)
  function calRemovedDevice(r) {
    const k = r.key.replace(/#\d+$/, "");
    return data.devices.find((d) => (d.name.trim() + "|" + d.city.trim()).toLocaleLowerCase("sk") === k) || null;
  }
  function calRemovedHtml() {
    const list = data.calRemoved || [];
    if (!list.length) return "";
    const can = !data.readOnly && !window.APPKA;
    return (
      '<section class="panel calremoved"><div class="panelhead"><h2>Zmazané v Google kalendári</h2></div>' +
      '<p class="muted">Tieto termíny niekto zmazal v Google kalendári, v dashboarde stále platia. Kým nerozhodneš, do kalendára sa znova nepridajú.' +
      (can ? "" : " Rozhodnúť sa dá v dashboarde na počítači.") +
      '</p><div class="list">' +
      list
        .map((r, i) => {
          const kl = r.cal === "kl",
            d = kl ? null : calRemovedDevice(r),
            c = kl ? klById(r.key.slice(3)) : null;
          return (
            '<div class="item"><div><strong>' +
            (d
              ? nameButton(d)
              : c
                ? '<button class="name" data-klcard="' + esc(c.id) + '">' + esc(c.name) + "</button>"
                : esc(r.name)) +
            "</strong><small>" +
            esc([kl ? "výkon BOZP / OPP" : "", r.city, "termín " + format(r.start, true)].filter(Boolean).join(" · ")) +
            "</small></div>" +
            (can
              ? '<div class="quick"><button type="button" class="btn" data-calcancel="' +
                i +
                '"' +
                (calBusy.has(r.key) ? " disabled" : "") +
                '>Zrušiť termín</button><button type="button" class="btn primary" data-calrestore="' +
                i +
                '"' +
                (calBusy.has(r.key) ? " disabled" : "") +
                ">Vrátiť do kalendára</button></div>"
              : "") +
            "</div>"
          );
        })
        .join("") +
      "</div></section>"
    );
  }
  function calSyncLine() {
    const el = $("calsync");
    if (!el) return;
    const can = !data.readOnly && !window.PREVIEW_DATA;
    el.innerHTML =
      "Potvrdené ukážky sú v Google kalendári „Ukážky EnSafe“, plánované výkony v „Výkony BOZP a OPP“. Oba sa synchronizujú v oboch smeroch: posun v Google kalendári sa sem prenesie do pár minút, zmazanie čaká na tvoje rozhodnutie." +
      (can
        ? ' <button type="button" class="link" id="calsyncnow"' +
          (calSyncing ? " disabled" : "") +
          ">" +
          (calSyncing ? "Synchronizujem…" : "Synchronizovať teraz") +
          "</button>"
        : "");
  }
  // Mesačná mriežka termínov. card = zariadenie, ak sa kreslí v karte zariadenia: ukážky ukazujú čas a obec (kvôli
  // trase), ukážka tohto zariadenia je zvýraznená a klik na dnešný či budúci deň otvorí zápis telefonátu s termínom.
  // near = vzdialenosti ukážok od zariadenia karty (Map riadok → km) alebo null, ak zariadenie nemá polohu
  // klc = klient, ak sa kreslí v karte klienta: klik na deň naplánuje výkon, výkon klienta je zvýraznený
  function calGrid(month, card, near, klc) {
    if (klc) card = { row: -1 };
    const [y, m] = month.split("-").map(Number),
      lead = (new Date(y, m - 1, 1).getDay() + 6) % 7,
      days = new Date(y, m, 0).getDate(),
      pick = card && !data.readOnly && !window.PREVIEW_DATA;
    const list = appointments().filter((d) => d.appointment.slice(0, 7) === month),
      plans = klPlans().filter((c) => c.plan.slice(0, 7) === month),
      byDay = new Map(),
      plansByDay = new Map();
    list.forEach((d) => {
      const k = d.appointment.slice(0, 10);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(d);
    });
    plans.forEach((c) => {
      const k = c.plan.slice(0, 10);
      if (!plansByDay.has(k)) plansByDay.set(k, []);
      plansByDay.get(k).push(c);
    });
    const cardChip = (d) => {
      const t = calTime(d.appointment),
        mine = d.row === card.row,
        km = near && !mine ? near.get(d.row) : undefined,
        far = near && !mine && km === undefined; // mimo okruhu alebo bez polohy – stlmené
      return (
        '<span class="calev k-' +
        calKind(d) +
        (mine ? " mine" : "") +
        (far ? " far" : "") +
        '" title="' +
        esc(
          (t ? t + " " : "") +
            d.name +
            (d.city ? ", " + d.city : "") +
            (km !== undefined ? " (" + kmText(km) + ")" : "") +
            " – " +
            d.status,
        ) +
        '">' +
        (t ? "<b>" + t + "</b> " : "") +
        (mine ? "Toto" : esc(d.city || d.name) + (km !== undefined ? " · " + esc(kmText(km)) : "")) +
        "</span>"
      );
    };
    let cells = CAL_DOW.map((x) => '<div class="caldow">' + x + "</div>").join("");
    for (let i = 0; i < lead; i++) cells += '<div class="calday out" aria-hidden="true"></div>';
    for (let day = 1; day <= days; day++) {
      const iso = month + "-" + pad2(day),
        evs = byDay.get(iso) || [];
      cells +=
        '<div class="calday' +
        (iso === data.today ? " today" : "") +
        ((lead + day - 1) % 7 > 4 ? " weekend" : "") +
        '">' +
        (pick && iso >= data.today
          ? klc
            ? '<button type="button" class="calnum calpick" data-klplanpick="' +
              iso +
              '" title="Naplánovať výkon ' +
              format(iso) +
              '">' +
              day +
              "</button>"
            : '<button type="button" class="calnum calpick" data-calpick="' +
              iso +
              '" title="Zapísať telefonát s termínom ukážky ' +
              format(iso) +
              '">' +
              day +
              "</button>"
          : '<span class="calnum">' + day + "</span>") +
        (klc && klc.next === iso && !(klc.plan && klc.plan.slice(0, 10) === iso)
          ? '<span class="calev k-due" title="Termín úlohy vo Flowii: ' + esc(klc.task || "") + '">Termín Flowii</span>'
          : "") +
        evs.map(card ? cardChip : calChip).join("") +
        (plansByDay.get(iso) || []).map((c) => klPlanChip(c, !!card, klc && c.id === klc.id)).join("") +
        "</div>";
    }
    for (let i = (lead + days) % 7; i && i < 7; i++) cells += '<div class="calday out" aria-hidden="true"></div>';
    return { cells, list, plans, y, m };
  }
  // Kalendár v karte zariadenia (rozbaľuje sa tlačidlom „Kalendár ukážok“, stav sa pamätá aj pre ďalšie karty).
  const CAL_RADII = [15, 30, 50];
  let calCardOpen = false,
    calCardMonth = "",
    calCardKm = 30;
  try {
    calCardOpen = localStorage.getItem("ensafe-calcard") === "1";
    const km = +localStorage.getItem("ensafe-calkm");
    if (CAL_RADII.includes(km)) calCardKm = km;
  } catch (e) {}
  function calCardRadius(km) {
    calCardKm = km;
    try {
      localStorage.setItem("ensafe-calkm", String(km));
    } catch (e) {}
    calCardMonth = "";
    if (detailRow) detail(detailRow);
  }
  // ukážky iných zariadení v okruhu (vzdušnou čiarou); null = zariadenie karty nemá polohu
  function calNear(d) {
    if (d.lat == null) return null;
    const m = new Map();
    appointments().forEach((x) => {
      if (x.row === d.row || x.lat == null) return;
      const km = kmBetween(d, x);
      if (km <= calCardKm) m.set(x.row, km);
    });
    return m;
  }
  // Návrh času ukážky v deň ukážky v okolí: po nej (dĺžka ukážky + odhad cesty), a keď by sa nestihla do 17:00,
  // tak pred ňou. Cesta = vzdušná vzdialenosť × 1,3 pri 60 km/h, zaokrúhlené nahor na 15 min. Ukážka bez času → 9:00.
  const CAL_LEN_MIN = 120; // rovnako ako CAL.durationMin v Kalendar.js
  function calSuggest(x, km) {
    const t = calTime(x.appointment);
    if (!t) return { time: "09:00", travel: 0, after: true };
    const travel = Math.max(15, Math.ceil((km * 1.3) / 15) * 15),
      start = +t.slice(0, 2) * 60 + +t.slice(3, 5),
      after = start + CAL_LEN_MIN + travel,
      before = start - travel - CAL_LEN_MIN,
      useAfter = after + CAL_LEN_MIN <= 17 * 60 || before < 7 * 60,
      m = useAfter ? Math.ceil(after / 15) * 15 : Math.floor(before / 15) * 15;
    return { time: pad2(Math.floor(m / 60)) + ":" + pad2(m % 60), travel, after: useAfter };
  }
  // najbližšie budúce ukážky v okruhu (okrem minulých a absolvovaných)
  function calNearNext(near) {
    return near ? appointments().filter((x) => near.has(x.row) && calKind(x) !== "past") : [];
  }
  function calCardToggle() {
    calCardOpen = !calCardOpen;
    try {
      localStorage.setItem("ensafe-calcard", calCardOpen ? "1" : "0");
    } catch (e) {}
    if (detailRow) detail(detailRow);
  }
  function calCardHtml(d) {
    if (!calCardOpen) return "";
    const near = calNear(d),
      next = calNearNext(near);
    // začne mesiacom vlastného budúceho termínu, inak mesiacom najbližšej ukážky v okolí
    if (!calCardMonth)
      calCardMonth = (
        d.appointment && d.appointment >= data.today ? d.appointment : next.length ? next[0].appointment : data.today
      ).slice(0, 7);
    const g = calGrid(calCardMonth, d, near);
    const radius =
      '<div class="calnear"><div class="calradius" role="group" aria-label="Okruh ukážok v okolí"><span>Okruh</span>' +
      CAL_RADII.map(
        (km) =>
          '<button type="button" class="btn' +
          (km === calCardKm ? " on" : "") +
          '" data-calkm="' +
          km +
          '" aria-pressed="' +
          (km === calCardKm) +
          '">' +
          km +
          " km</button>",
      ).join("") +
      "</div>" +
      (!near
        ? '<p class="muted">Zariadenie nemá dohľadanú polohu – ukážky v okolí sa ukážu po dohľadaní polohy v Mape.</p>'
        : next.length
          ? "<h4>V okolí do " +
            calCardKm +
            " km</h4><ul>" +
            next
              .slice(0, 6)
              .map((x) => {
                const day = x.appointment.slice(0, 10),
                  wd = CAL_DOW[(new Date(day + "T12:00").getDay() + 6) % 7],
                  t = calTime(x.appointment),
                  km = near.get(x.row),
                  s = calSuggest(x, km);
                return (
                  '<li><button type="button" class="link" data-calcardgo="' +
                  day.slice(0, 7) +
                  '" title="Ukázať mesiac v kalendári"><b>' +
                  wd +
                  " " +
                  esc(format(day)) +
                  (t ? " " + t : "") +
                  "</b></button> " +
                  esc(x.city || x.name) +
                  ' <span class="muted">· ' +
                  esc(kmText(km)) +
                  " · " +
                  esc(x.name) +
                  "</span>" +
                  (data.readOnly || window.PREVIEW_DATA
                    ? ""
                    : ' <button type="button" class="btn calsuggest" data-calpick="' +
                      day +
                      '" data-caltime="' +
                      s.time +
                      '" title="' +
                      esc(
                        "Zapísať telefonát s termínom ukážky " +
                          format(day) +
                          " o " +
                          s.time +
                          (t
                            ? (s.after ? " – po ukážke (" : " – pred ukážkou (") +
                              (x.city || x.name) +
                              " o " +
                              t +
                              ", 2 h) a ceste cca " +
                              s.travel +
                              " min"
                            : ""),
                      ) +
                      '">Navrhnúť ' +
                      s.time +
                      "</button>") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>" +
            (next.length > 6 ? '<p class="muted">a ďalšie ' + (next.length - 6) + " neskôr</p>" : "")
          : '<p class="muted">V okruhu ' + calCardKm + " km nie je naplánovaná žiadna ukážka.</p>") +
      "</div>";
    return (
      '<section class="calcard"><div class="calhead"><button type="button" class="btn" data-calcardnav="-1" aria-label="Predchádzajúci mesiac">‹</button><h3>' +
      CAL_MONTHS[g.m - 1] +
      " " +
      g.y +
      '</h3><button type="button" class="btn" data-calcardnav="1" aria-label="Nasledujúci mesiac">›</button>' +
      (calCardMonth !== data.today.slice(0, 7)
        ? '<button type="button" class="btn" data-calcardnav="0">Tento mesiac</button>'
        : "") +
      '<button type="button" class="btn" data-calcard="1">Skryť kalendár</button></div>' +
      radius +
      '<div class="calgrid">' +
      g.cells +
      '</div><p class="muted">' +
      (near
        ? "Ukážky v okruhu " + calCardKm + " km: čas, obec a vzdialenosť vzdušnou čiarou; ostatné sú stlmené."
        : "Ukážky všetkých zariadení: čas a obec.") +
      (data.readOnly
        ? ""
        : " Klikni na číslo dňa – otvorí sa zápis telefonátu s termínom ukážky v ten deň (čas uprav).") +
      "</p></section>"
    );
  }
  function calCardShift(n) {
    if (!n) calCardMonth = data.today.slice(0, 7);
    else {
      const [y, m] = calCardMonth.split("-").map(Number),
        x = new Date(y, m - 1 + n, 1);
      calCardMonth = x.getFullYear() + "-" + pad2(x.getMonth() + 1);
    }
    if (detailRow) detail(detailRow);
  }
  // klik na deň v kalendári karty: zápis telefonátu s termínom ukážky (9:00) a stavom „Termín dohodnutý“
  function calPick(iso, time) {
    const row = detailRow;
    if (!row || data.readOnly) return;
    afterRefresh(() => {
      openCall(row, { status: "Termín dohodnutý", appointment: iso + "T" + (time || "09:00") });
      $("callmore").open = true;
      f().result.value = f().result.value || "Dohodnutý termín ukážky";
      f().appointment.focus();
    });
  }
  function calView() {
    if (!calMonth) calMonth = data.today.slice(0, 7);
    const { cells, list, plans, y, m } = calGrid(calMonth, null);
    const rows = list
      .map((d) => [d.appointment, d])
      .concat(plans.map((c) => [c.plan, null, c]))
      .sort((a, b) => a[0].localeCompare(b[0]));
    const agenda = rows.length
      ? '<div class="list">' +
        rows
          .map(([when, d, c]) => {
            if (c) {
              const wd = CAL_DOW[(new Date(when.slice(0, 10) + "T12:00").getDay() + 6) % 7];
              return (
                '<div class="item calrow"><div class="caldate k-' +
                klPlanKind(c) +
                '"><strong>' +
                wd +
                " " +
                esc(format(when)) +
                "</strong><small>" +
                esc(calTime(when) || "celý deň") +
                '</small></div><div class="grow"><button class="name" data-klcard="' +
                esc(c.id) +
                '">' +
                esc(c.name) +
                "</button><small>" +
                esc([c.city, c.person, c.phone].filter(Boolean).join(" · ")) +
                "</small></div><div>" +
                pill("Výkon BOZP / OPP", "kl") +
                "</div></div>"
              );
            }
            const k = calKind(d),
              wd = CAL_DOW[(new Date(d.appointment.slice(0, 10) + "T12:00").getDay() + 6) % 7];
            return (
              '<div class="item calrow"><div class="caldate k-' +
              k +
              '"><strong>' +
              wd +
              " " +
              esc(format(d.appointment)) +
              "</strong><small>" +
              esc(calTime(d.appointment) || "celý deň") +
              '</small></div><div class="grow">' +
              nameButton(d) +
              "<small>" +
              esc([d.city, d.person, d.phone].filter(Boolean).join(" · ")) +
              "</small></div><div>" +
              status(d) +
              (k === "warn" ? "<small>v Google kalendári nie je</small>" : "") +
              "</div></div>"
            );
          })
          .join("") +
        "</div>"
      : empty("V tomto mesiaci nie sú žiadne termíny ukážok ani výkonov.");
    return (
      calRemovedHtml() +
      '<section class="panel"><div class="calhead"><button type="button" class="btn" data-calnav="-1" aria-label="Predchádzajúci mesiac">‹</button><h2>' +
      CAL_MONTHS[m - 1] +
      " " +
      y +
      '</h2><button type="button" class="btn" data-calnav="1" aria-label="Nasledujúci mesiac">›</button>' +
      (calMonth !== data.today.slice(0, 7)
        ? '<button type="button" class="btn" data-calnav="0">Tento mesiac</button>'
        : "") +
      '</div><div class="calgrid">' +
      cells +
      '</div><div class="callegend">' +
      Object.keys(CAL_KINDS)
        .map((k) => '<span><i class="k-' + k + '"></i>' + CAL_KINDS[k] + "</span>")
        .join("") +
      '</div></section><section class="panel"><div class="panelhead"><h2>Termíny – ' +
      CAL_MONTHS[m - 1].toLowerCase() +
      " " +
      y +
      " (" +
      rows.length +
      ")</h2></div>" +
      agenda +
      '</section><p class="muted calsync" id="calsync"></p>'
    );
  }
  // Výsledok synchronizácie: ak sa niečo prenieslo z Google kalendára do tabuľky, dashboard sa obnoví.
  function calSyncResult(r, manual) {
    r = r || {};
    const msg = [];
    if (r.moved) msg.push("Posun ukážky z Google kalendára je zapísaný v dashboarde (" + r.moved + ").");
    if (r.conflicts)
      msg.push(
        "Posun v Google kalendári sa neprevzal, termín sa medzičasom zmenil aj v dashboarde – platí dashboard (" +
          r.conflicts +
          ").",
      );
    if (r.removed)
      msg.push("Ukážka bola zmazaná v Google kalendári – rozhodni v záložke Kalendár (" + r.removed + ").");
    const kl = r.kl || {};
    if (kl.moved) msg.push("Posun výkonu z Google kalendára je zapísaný v dashboarde (" + kl.moved + ").");
    if (kl.conflicts)
      msg.push(
        "Posun výkonu v Google kalendári sa neprevzal, plán sa medzičasom zmenil aj v dashboarde (" +
          kl.conflicts +
          ").",
      );
    if (kl.removed)
      msg.push("Výkon bol zmazaný v Google kalendári – rozhodni v záložke Kalendár (" + kl.removed + ").");
    if (msg.length) {
      toast(msg.join(" "));
      refresh(false, "obnova po synchronizácii kalendára");
    } else if (manual)
      toast(r.skipped ? "Práve prebieha iný zápis, skús to o chvíľu." : "Kalendár je zosynchronizovaný, bez zmien.");
  }
  function calSyncNow(manual) {
    if (calSyncing || !data || data.readOnly || window.PREVIEW_DATA) return;
    calSyncing = true;
    calSyncAt = Date.now();
    calSyncLine();
    api("syncCalendar")
      .then((r) => calSyncResult(r, manual))
      .catch((e) => {
        if (manual) toast("Synchronizácia s Google kalendárom zlyhala: " + ((e && e.message) || e));
      })
      .finally(() => {
        calSyncing = false;
        calSyncLine();
      });
  }
  async function calResolve(i, action, b) {
    const r = (data.calRemoved || [])[i];
    if (!r || calBusy.has(r.key) || data.readOnly || window.APPKA) return;
    const kl = r.cal === "kl";
    if (
      action === "cancel" &&
      !confirm(
        kl
          ? "Zrušiť plánovaný výkon " + format(r.start, true) + " – " + r.name + "? Zápis pribudne do poznámky k plánu."
          : "Zrušiť termín ukážky " +
              format(r.start, true) +
              " – " +
              r.name +
              "? Stav sa zmení na „Dohodnúť stretnutie“ a zápis pribudne do poznámky.",
      )
    )
      return;
    calBusy.add(r.key);
    b.disabled = true;
    try {
      const res = await api(
        "calRemovedResolve",
        Object.assign({ key: r.key, start: r.start, action }, kl ? { cal: "kl" } : {}),
      );
      toast(
        action === "cancel"
          ? res && res.cancelled
            ? kl
              ? "Plánovaný výkon je zrušený."
              : "Termín je zrušený, stav: Dohodnúť stretnutie."
            : "Termín sa v tabuľke medzičasom zmenil – nič sa nezrušilo."
          : res && res.sync && res.sync.ok === false
            ? "Ukážka sa vráti do kalendára pri najbližšej synchronizácii (do 15 minút)."
            : "Ukážka je späť v Google kalendári.",
      );
      refresh(true, "obnova po rozhodnutí o termíne");
    } catch (e) {
      toast("Nepodarilo sa uložiť: " + ((e && e.message) || e));
      b.disabled = false;
    } finally {
      calBusy.delete(r.key);
    }
  }
  const GROUPS = {
    cal: ["calendar"],
    mail: ["mailing"],
    overview: ["overview"],
    work: ["tasks", "mailtasks", "appointments", "shipments"],
    contacts: ["devices", "social", "schools", "companies"],
    log: ["history", "calls"],
    map: ["map"],
    clients: ["clients", "kldefects", "kltransfer", "klhelp"],
  };
  const LABELS = {
    mailing: "Mailing",
    tasks: "Moje úlohy",
    mailtasks: "Po mailingu",
    appointments: "Termíny",
    shipments: "Zásielky",
    devices: "Všetky",
    social: "Sociálne zariadenia",
    schools: "Školy",
    companies: "Firmy",
    history: "Návštevy a ukážky",
    calls: "Telefonáty",
    clients: "Klienti",
    kldefects: "Otvorené nedostatky",
    kltransfer: "Čaká na prenos",
    klhelp: "Nápoveda",
  };
  const LAST = { work: "tasks", contacts: "devices", log: "history", clients: "clients" };
  const groupOf = (v) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(v)) || "overview";
  function subtabs() {
    const g = groupOf(view);
    if (g === "overview" || GROUPS[g].length < 2) return "";
    return (
      '<div class="tabs" role="tablist">' +
      GROUPS[g]
        .map(
          (v) =>
            '<button type="button" class="tab' +
            (v === view ? " active" : "") +
            '" role="tab" aria-selected="' +
            (v === view) +
            '" data-view="' +
            v +
            '">' +
            LABELS[v] +
            "</button>",
        )
        .join("") +
      "</div>"
    );
  }
  function options(items, first) {
    return '<option value="">' + first + "</option>" + items.map((s) => "<option>" + esc(s) + "</option>").join("");
  }
  function scopeDevices() {
    return view === "social"
      ? data.devices.filter((d) => d.type === "Sociálne zariadenie")
      : view === "schools"
        ? data.devices.filter((d) => (data.lists?.schoolTypes || []).includes(d.type))
        : view === "companies"
          ? data.devices.filter((d) => d.type === "Firma / priemysel")
          : data.devices;
  }
  function companySummary() {
    const ds = scopeDevices();
    return (
      '<div class="metrics">' +
      metric(ds.length, "Firiem v databáze") +
      metric(ds.filter((d) => d.contacted).length, "Oslovených firiem") +
      metric(ds.filter((d) => d.demoDone).length, "Firiem zastúpených na ukážkach") +
      metric(ds.filter((d) => d.order).length, "Potvrdených objednávok") +
      "</div>"
    );
  }
  function filters() {
    let s =
      '<div class="filters"><label class="field grow">Vyhľadať<input id="search" type="search" placeholder="Názov, obec, okres (aj RK, ZA…), kontakt, telefón, e-mail"></label><label class="field">Okres<select id="district">' +
      options(
        [...new Set(scopeDevices().map((d) => d.district))].sort((a, b) => a.localeCompare(b, "sk")),
        "Všetky okresy",
      ) +
      "</select></label>";
    if (view === "tasks" || view === "mailtasks")
      s +=
        '<label class="field">Termín<select id="category">' +
        options(["Po termíne", "Dnes", "Naplánované", "Bez termínu"], "Všetky úlohy") +
        "</select></label>";
    if (["devices", "social", "schools", "companies"].includes(view))
      s +=
        '<label class="field">Stav<select id="stage">' +
        options([...new Set(scopeDevices().map((d) => d.status))], "Všetky stavy") +
        "</select></label>";
    if (view === "devices" || view === "schools")
      s +=
        '<label class="field">Typ zariadenia<select id="type">' +
        options([...new Set(scopeDevices().map((d) => d.type))], "Všetky typy") +
        "</select></label>";
    if (view === "history")
      s +=
        '<label class="field">Typ udalosti<select id="activitytype">' +
        options(["Samostatná ukážka", "Spoločná ukážka", "Návšteva", "Školenie"], "Všetky udalosti") +
        '</select></label><label class="field">Osobná návšteva<select id="visited">' +
        options(["Áno", "Nie"], "Všetky pracoviská") +
        "</select></label>";
    if (view === "appointments")
      s +=
        '<label class="field">Obdobie<select id="period"><option>Budúce</option><option>Minulé</option><option>Všetky</option></select></label><label class="field">Potvrdenie<select id="confirmed">' +
        options(["Potvrdené", "Na potvrdenie", "Absolvované"], "Všetky termíny") +
        "</select></label>";
    return (
      s +
      "</div>" +
      (view === "tasks"
        ? '<p class="muted" style="margin:-8px 0 12px;font-size:14px">Úlohy = zariadenia s ďalším krokom, termínom alebo stavom na riešenie. Splnenú úlohu odklikni štvorčekom vľavo. Všetky zariadenia nájdeš v Kontaktoch.</p>'
        : view === "mailtasks"
          ? '<p class="muted" style="margin:-8px 0 12px;font-size:14px">Zariadenia, ktorým mailing poslal katalóg a čaká sa na telefonát. Zoradené podľa termínu a okresu. Keď zapíšeš telefonát s novým ďalším krokom alebo úlohu odklikneš, presunie sa medzi Moje úlohy.</p>'
          : "") +
      '<p class="count" id="count"></p><section class="panel" id="results"></section>'
    );
  }
  const DISTRICT_CODES = {
    Námestovo: "NO",
    "Dolný Kubín": "DK",
    Tvrdošín: "TS",
    Ružomberok: "RK",
    "Liptovský Mikuláš": "LM",
    Žilina: "ZA",
    Čadca: "CA",
    "Kysucké Nové Mesto": "KM",
    Martin: "MT",
    "Turčianske Teplice": "TR",
    "Banská Bystrica": "BB",
    Brezno: "BR",
    Zvolen: "ZV",
    Bytča: "BY",
  };
  function filtered() {
    const raw = ($("search")?.value || "").trim(),
      dist = $("district")?.value;
    // hľadanie telefónu: porovnajú sa len číslice (bez medzier, lomiek a predvoľby)
    const q = /^[+\d\s/().-]{6,}$/.test(raw) && raw.replace(/\D/g, "").length >= 6 ? phoneDigits(raw) : normalize(raw);
    const codeDist = Object.keys(DISTRICT_CODES).find((k) => DISTRICT_CODES[k].toLowerCase() === q);
    let rows = view === "calls" ? data.calls : view === "history" ? historyRows : scopeDevices();
    return rows.filter(
      (d) => (!q || (codeDist ? d.district === codeDist : hay(d).includes(q))) && (!dist || d.district === dist),
    );
  }
  function results() {
    let rows = filtered();
    if (view === "tasks" || view === "mailtasks") {
      const mail = view === "mailtasks";
      rows = rows
        .filter(
          (d) =>
            d.open && (mail ? d.mailTask : !d.mailTask) && (!$("category").value || d.category === $("category").value),
        )
        .sort(
          (a, b) =>
            (a.deadline || "9999").localeCompare(b.deadline || "9999") ||
            (mail ? a.district.localeCompare(b.district, "sk") || a.name.localeCompare(b.name, "sk") : 0),
        );
    }
    if (["devices", "social", "schools", "companies"].includes(view)) {
      rows = rows.filter(
        (d) =>
          (!$("stage").value || d.status === $("stage").value) && (!$("type")?.value || d.type === $("type").value),
      );
      const sk = SORTS[sortState.key];
      if (sk) rows.sort((a, b) => sortState.dir * sk(a, b) || a.name.localeCompare(b.name, "sk"));
    }
    if (view === "history")
      rows = rows
        .filter(
          (a) =>
            (!$("activitytype").value || a.type === $("activitytype").value) &&
            (!$("visited").value || a.visited === ($("visited").value === "Áno")),
        )
        .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.id.localeCompare(b.id));
    if (view === "appointments")
      rows = rows
        .filter((d) => {
          if (!d.appointment) return false;
          const p = $("period").value,
            c = $("confirmed").value;
          return (
            (p === "Všetky" ||
              (p === "Budúce" ? d.appointment.slice(0, 10) >= data.today : d.appointment.slice(0, 10) < data.today)) &&
            (!c ||
              (c === "Potvrdené"
                ? d.confirmed
                : c === "Absolvované"
                  ? d.status === "Ukážka absolvovaná"
                  : !d.confirmed && d.status !== "Ukážka absolvovaná"))
          );
        })
        .sort((a, b) => a.appointment.localeCompare(b.appointment));
    if (view === "calls") rows.sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.row - a.row);
    $("count").textContent =
      rows.length +
      " " +
      (view === "companies"
        ? "firiem"
        : view === "schools"
          ? "škôl"
          : ["devices", "social"].includes(view)
            ? "zariadení"
            : "záznamov");
    if (!rows.length) {
      $("results").innerHTML = empty("Pre tento výber nie sú žiadne záznamy.");
      return;
    }
    let heads, body;
    if (view === "tasks" || view === "mailtasks") {
      const mailView = view === "mailtasks";
      heads = ["", "Zariadenie", "Ďalší krok", "Termín", "Stav"].concat(mailView ? ["Rýchly zápis"] : []);
      body = rows.map(
        (d) =>
          '<tr data-taskrow="' +
          d.row +
          '"><td style="width:40px">' +
          checkBtn(d) +
          "</td><td>" +
          nameButton(d) +
          "<small>" +
          esc(d.district) +
          "</small></td><td>" +
          esc(d.taskText || d.action) +
          (d.actionMissing ? " " + MISSING : "") +
          "</td><td>" +
          esc(format(d.deadline)) +
          "<small>" +
          catPill(d.category) +
          "</small></td><td>" +
          status(d) +
          "</td>" +
          (mailView ? '<td class="quickcell">' + quickButtons(d) + "</td>" : "") +
          "</tr>",
      );
    } else if (view === "appointments") {
      heads = ["Termín", "Zariadenie", "Potvrdenie", "Kontakt"];
      body = rows.map(
        (d) =>
          "<tr><td>" +
          esc(format(d.appointment, true)) +
          "</td><td>" +
          nameButton(d) +
          "<small>" +
          esc(d.city) +
          "</small></td><td>" +
          pill(
            d.confirmed ? "Potvrdené" : d.status === "Ukážka absolvovaná" ? "Absolvované" : "Na potvrdenie",
            d.confirmed ? "success" : "warn",
          ) +
          (d.flags.length ? "<small>" + esc(d.flags.join(" · ")) + "</small>" : "") +
          "</td><td>" +
          esc(d.person) +
          "<small>" +
          esc(d.phone) +
          "</small></td></tr>",
      );
    } else if (view === "history") {
      heads = ["Dátum", "Pracovisko", "Udalosť", "Osobná návšteva", "Poznámka"];
      body = rows.map((a) => {
        const d = deviceByName(a.name);
        return (
          "<tr><td>" +
          esc(a.date ? format(a.date) : "Dátum nezadaný") +
          "</td><td>" +
          (d ? nameButton(d) : esc(a.name)) +
          "</td><td>" +
          pill(a.type, a.type === "Návšteva" ? "warn" : a.type === "Školenie" ? "" : "success") +
          (a.type === "Spoločná ukážka" ? "<small>Jedna spoločná udalosť</small>" : "") +
          "</td><td>" +
          pill(a.visited ? "Áno" : "Zastúpené / nepotvrdené", a.visited ? "success" : "") +
          "</td><td>" +
          esc(a.note) +
          "<small>" +
          esc(a.source) +
          "</small></td></tr>"
        );
      });
    } else if (view === "calls") {
      heads = ["Dátum", "Zariadenie", "Výsledok", "Ďalší krok"];
      body = rows.map((c) => {
        const d = deviceByName(c.name);
        return (
          "<tr><td>" +
          esc(c.date ? format(c.date) : "Dátum neuvedený") +
          '<small><button class="link" data-editcall="' +
          c.row +
          '">Upraviť</button></small></td><td>' +
          (d ? nameButton(d) : esc(c.name)) +
          "<small>" +
          esc(c.phone) +
          "</small></td><td>" +
          esc(c.result) +
          "<small>" +
          esc(c.note) +
          "</small></td><td>" +
          esc(c.action) +
          "</td></tr>"
        );
      });
    } else {
      heads = [
        sortHead("name", view === "companies" ? "Firma" : "Zariadenie"),
        sortHead("district", "Okres / obec"),
        sortHead("status", "Stav"),
        sortHead("last", "Posledný kontakt"),
        "Ďalší krok",
      ];
      body = rows.map(
        (d) =>
          "<tr><td>" +
          nameButton(d) +
          "<small>" +
          esc(d.type) +
          " · " +
          esc(d.phone) +
          "</small></td><td>" +
          esc(d.district) +
          "<small>" +
          esc(d.city) +
          "</small></td><td>" +
          status(d) +
          "</td><td>" +
          esc(d.lastContact ? format(d.lastContact) : "Neuvedený") +
          "</td><td>" +
          esc(d.action || (d.deadline ? "Ďalší krok nevyplnený" : "—")) +
          (d.deadline ? "<small>termín " + esc(format(d.deadline)) + "</small>" : "") +
          "</td></tr>",
      );
    }
    $("results").innerHTML =
      '<div class="tablewrap"><table><thead><tr>' +
      heads.map((h) => '<th scope="col">' + h + "</th>").join("") +
      "</tr></thead><tbody>" +
      body.join("") +
      "</tbody></table></div>";
    // popis stĺpca pri bunke – na telefóne sa riadok zobrazí ako karta s popismi (Styles.html, max-width 700px)
    const labels = heads.map((h) =>
      h
        .replace(/<[^>]+>/g, "")
        .replace(/[▲▼↕]/g, "")
        .trim(),
    );
    $("results")
      .querySelectorAll("tbody tr")
      .forEach((tr) => [...tr.children].forEach((td, i) => labels[i] && td.setAttribute("data-label", labels[i])));
  }
  // triedenie Kontaktov klikom na hlavičku stĺpca (ďalší klik otočí poradie, tretí zruší); pamätá sa v zariadení
  const SORTS = {
    name: (a, b) => a.name.localeCompare(b.name, "sk"),
    district: (a, b) =>
      (a.district || "").localeCompare(b.district || "", "sk") || (a.city || "").localeCompare(b.city || "", "sk"),
    status: (a, b) => (a.status || "").localeCompare(b.status || "", "sk"),
    last: (a, b) => (a.lastContact || "").localeCompare(b.lastContact || ""),
  };
  let sortState = { key: "", dir: 1 };
  try {
    const s = JSON.parse(localStorage.getItem("ensafe-sort") || "null");
    if (s && SORTS[s.key] && (s.dir === 1 || s.dir === -1)) sortState = s;
  } catch (e) {}
  function sortHead(key, label) {
    const on = sortState.key === key;
    return (
      '<button type="button" class="sorth' +
      (on ? " on" : "") +
      '" data-sort="' +
      key +
      '" title="Zoradiť podľa stĺpca">' +
      label +
      '<span aria-hidden="true">' +
      (on ? (sortState.dir > 0 ? " ▲" : " ▼") : " ↕") +
      "</span></button>"
    );
  }
  function setSort(key) {
    if (sortState.key !== key) sortState = { key, dir: key === "last" ? -1 : 1 };
    else if (sortState.dir === (key === "last" ? -1 : 1)) sortState.dir = -sortState.dir;
    else sortState = { key: "", dir: 1 };
    try {
      localStorage.setItem("ensafe-sort", JSON.stringify(sortState));
    } catch (e) {}
    results();
  }
  const FKEYS = ["search", "district", "category", "stage", "period", "confirmed", "type", "activitytype", "visited"];
  let lastRendered = null;
  function render() {
    clearTimeout(searchTimer);
    const keep = {},
      same = lastRendered === view,
      sy = window.scrollY;
    if (same)
      FKEYS.forEach((id) => {
        const el = $(id);
        if (el) keep[id] = el.type === "checkbox" ? el.checked : el.value;
      });
    lastRendered = view;
    const titles = {
      overview: "Pracovný prehľad",
      mailing: "Mailing s katalógom",
      tasks: "Úlohy a termíny",
      mailtasks: "Úlohy a termíny",
      appointments: "Úlohy a termíny",
      shipments: "Úlohy a termíny",
      devices: "Kontakty",
      social: "Kontakty",
      schools: "Kontakty",
      companies: "Kontakty",
      history: "História",
      calls: "História",
      map: "Mapa zariadení",
      calendar: "Kalendár ukážok a výkonov",
      clients: "Klienti BOZP a OPP",
      kldefects: "Klienti BOZP a OPP",
      kltransfer: "Klienti BOZP a OPP",
      klhelp: "Klienti BOZP a OPP",
    };
    const g = groupOf(view);
    if (g !== "overview") LAST[g] = view;
    $("title").textContent = titles[view];
    document.body.classList.toggle("klmode", g === "clients"); // pri klientoch sa skryjú tlačidlá zápisov EnSafe
    document.querySelectorAll(".nav").forEach((b) => {
      const on = b.dataset.group === g;
      b.classList.toggle("active", on);
      b.setAttribute("aria-current", on ? "page" : "false");
    });
    $("content").innerHTML =
      view === "overview"
        ? overview()
        : view === "mailing"
          ? mailingView()
          : view === "map"
            ? '<div id="mapslot"></div>'
            : view === "calendar"
              ? calView()
              : view === "shipments"
                ? subtabs() + shipView()
                : g === "clients"
                  ? subtabs() + klView()
                  : subtabs() + (view === "companies" ? companySummary() : "") + filters();
    if (same) {
      Object.keys(keep).forEach((id) => {
        const el = $(id);
        if (!el) return;
        if (el.type === "checkbox") el.checked = keep[id];
        else if (el.tagName !== "SELECT" || [...el.options].some((o) => o.value === keep[id])) el.value = keep[id];
      });
    }
    if (view === "map") mapMount();
    else if (view === "calendar") {
      calSyncLine();
      if (Date.now() - calSyncAt > 120000) calSyncNow(false); // zachytí posuny z Google kalendára hneď pri otvorení
    } else if (view !== "overview" && view !== "mailing" && view !== "shipments" && g !== "clients") results();
    if (same) window.scrollTo(0, sy);
    if ($("kldlg") && $("kldlg").open && klCardId) klCard(klCardId); // otvorená karta klienta ukáže čerstvé údaje
  }
  function detail(row) {
    const d = byRow.get(+row);
    if (!d) return;
    if (detailRow !== +row) calCardMonth = ""; // iné zariadenie: kalendár v karte začne mesiacom jeho termínu
    detailRow = +row;
    $("detailtitle").textContent = d.name;
    const h = data.calls
      .filter((c) => normalize(c.name) === normalize(d.name))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.row - a.row);
    const phoneLinks = d.phone
      .split(";")
      .map((p) => '<a href="tel:' + esc(p.replace(/[^+\d]/g, "")) + '">' + esc(p.trim()) + "</a>")
      .join("<br>");
    const mailLinks = d.email
      .split(";")
      .filter(Boolean)
      .map((e) => '<a href="mailto:' + esc(e.trim()) + '">' + esc(e.trim()) + "</a>")
      .join("<br>");
    if (contactEdit && contactEdit !== d.row) contactEdit = 0;
    if (ico.row && ico.row !== d.row && !ico.busy) ico = icoReset();
    const typed = contactEdit && $("contactform") ? contactValues() : null; // obnova dashboardu nezahodí rozpísané údaje
    $("detailcontent").innerHTML =
      (d.flags.length ? '<div class="banner">' + esc(d.flags.join(" · ")) + "</div>" : "") +
      calCardHtml(d) +
      '<div class="detailgrid"><div class="detailbox"><h3>Kontakt</h3>' +
      (contactEdit
        ? contactForm(typed || d)
        : "<p><strong>" +
          esc(d.person) +
          "</strong></p>" +
          line("phone", d.phone ? phoneLinks : "") +
          line("mail", mailLinks) +
          line("place", esc([d.address, d.district].filter(Boolean).join(", "))) +
          (d.web ? line("link", web(d.web)) : "") +
          (data.readOnly
            ? ""
            : '<p><button class="btn" data-contactedit="' + d.row + '">Upraviť kontakt</button></p>') +
          buyerBox(d)) +
      '</div><div class="detailbox"><h3>Aktuálny stav</h3><p>' +
      esc(d.type) +
      "</p><p>" +
      status(d, true) +
      '</p><p style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><select id="detailstatus" aria-label="Nový stav" style="padding:6px 8px;border:1px solid var(--line);border-radius:8px">' +
      data.statuses
        .map((s) => "<option" + (s === d.rawStatus ? " selected" : "") + ">" + esc(s) + "</option>")
        .join("") +
      '</select><button class="btn" data-setstatus="' +
      d.row +
      '">Zmeniť stav</button></p>' +
      // ďalší krok priamo pri stave – všetko podstatné na jedno pozretie
      '<div class="nextstep"><span>Ďalší krok</span><p class="notes">' +
      esc(d.action || "Zatiaľ neurčený") +
      "</p><p>" +
      (d.deadline
        ? "Termín: " + esc(format(d.deadline)) + (d.category ? " " + catPill(d.category) : "")
        : "Bez termínu") +
      "</p></div>" +
      mailInfo(d) +
      "<p>Posledný kontakt: " +
      esc(d.lastContact ? format(d.lastContact) : "Neuvedený") +
      "</p><p>Stretnutie: " +
      esc(d.appointment ? format(d.appointment, true) : d.appointmentRaw || "Neuvedené") +
      (calCardOpen ? "" : ' <button type="button" class="link" data-calcard="1">Kalendár ukážok</button>') +
      "</p><p>" +
      pill(d.order ? "Objednávka potvrdená" : "Objednávka zatiaľ nepotvrdená", d.order ? "success" : "") +
      "</p>" +
      (d.products ? "<p>Produkty: " + esc(d.products) + "</p>" : "") +
      shipInfo(d) +
      '</div><div class="detailbox full"><h3>Poznámky</h3><p class="notes">' +
      esc(d.note || "Bez poznámky") +
      '</p><p class="muted">' +
      esc(d.businessNote) +
      '</p></div></div><div class="formfoot detailfoot"><a class="btn" target="_blank" rel="noopener" href="' +
      esc(data.sourceUrl + "&range=A" + d.row + ":R" + d.row) +
      '">Otvoriť v tabuľke</a>' +
      (d.lat != null ? '<button class="btn" data-showmap="' + d.row + '">Ukázať na mape</button>' : "") +
      '<button type="button" class="btn" data-calcard="1">' +
      (calCardOpen ? "Skryť kalendár" : "Kalendár ukážok") +
      '</button><button class="btn" data-visit="' +
      d.row +
      '">Zapísať návštevu</button><button class="btn primary" data-call="' +
      d.row +
      '">Zapísať telefonát</button></div><div class="history"><h3>Návštevy a ukážky</h3>' +
      ((d.activities || [])
        .map(
          (a) =>
            '<div class="item"><div><strong>' +
            esc(a.date ? format(a.date) : "Dátum nezadaný") +
            " · " +
            esc(a.type) +
            "</strong><p>" +
            esc(a.visited ? "Osobná návšteva" : "Zastúpené / osobná návšteva nepotvrdená") +
            "</p><p>" +
            esc(a.note) +
            "</p></div></div>",
        )
        .join("") || '<p class="muted">Zatiaľ bez potvrdenej návštevy.</p>') +
      '</div><div class="history"><h3>História telefonátov</h3>' +
      (h
        .map(
          (c) =>
            '<div class="item"><div><strong>' +
            esc(c.date ? format(c.date) : "Dátum neuvedený") +
            " · " +
            esc(c.result) +
            "</strong><p>" +
            esc(c.person) +
            " · " +
            esc(c.phone) +
            '</p><p class="notes">' +
            esc(c.note) +
            "</p><p>" +
            esc(c.action) +
            '</p></div><button class="btn" data-editcall="' +
            c.row +
            '">Upraviť</button></div>',
        )
        .join("") || '<p class="muted">Zatiaľ bez záznamu v denníku hovorov.</p>') +
      "</div>";
    if (!$("detail").open) $("detail").showModal();
  }
  function populateCall() {
    devSync(f().device);
    selected = data.devices.find((d) => d.row === +f().device.value);
    const d = selected;
    if (!d) return;
    f().status.value = d.rawStatus === "Neoslovené" || d.rawStatus === "Stav neoverený" ? "Oslovené" : d.rawStatus;
    f().phone.value = d.phone;
    f().person.value = d.person;
    f().action.value = d.action;
    f().deadline.value = d.deadline;
    f().appointment.value = d.appointment;
    f().appointment.disabled = false;
    f().clearAppointment.checked = false;
    apptAutoCleared = false;
    f().products.value = d.products;
    f().order.checked = d.order;
    f().result.value = "";
    f().note.value = "";
    $("saveerror").hidden = true;
    pendingId = crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now() + "-" + Math.random().toString(36).slice(2) + "-call";
  }
  function openCall(row, preset) {
    if (saving) return;
    leaveCard(); // formulár z karty: po zatvorení sa karta otvorí znova
    devSearch(f().device);
    devOptions(f().device, "");
    f().status.innerHTML = data.statuses.map((s) => "<option>" + esc(s) + "</option>").join("");
    if (row) f().device.value = row;
    $("callmore").open = false;
    f().date.value = data.today;
    f().date.max = data.today;
    populateCall();
    if (preset) Object.keys(preset).forEach((k) => (f()[k].value = preset[k]));
    $("save").disabled = !!window.PREVIEW_DATA;
    $("save").textContent = window.PREVIEW_DATA ? "Zápis bude dostupný po nasadení" : "Uložiť telefonát";
    $("call").showModal();
    if (!row) {
      const i = $("call").querySelector(".devsearch");
      if (i) i.focus();
    }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.view && data) {
      view = (b.dataset.group && LAST[b.dataset.group]) || b.dataset.view;
      render();
    }
    if (b.dataset.detail) detail(b.dataset.detail);
    if (b.dataset.sort && $("results")) setSort(b.dataset.sort);
    const ds = Object.assign({}, b.dataset);
    if (ds.call) afterRefresh(() => openCall(ds.call));
    if (ds.visit) afterRefresh(() => openVisit(ds.visit));
    if (ds.editcall) afterRefresh(() => openEditCall(ds.editcall));
    if (ds.done) afterRefresh(() => openDone(ds.done));
    if (ds.quick) quickCall(ds.quick, ds.row);
    if ("mapsel" in ds) mapSelect(+ds.mapsel, true);
    if (ds.showmap) {
      $("detail").close();
      mapSel = +ds.showmap;
      mapPan = true;
      view = "map";
      render();
    }
    if (b.id === "mapgeocode") mapGeocodeRun();
    if (ds.calnav) calShift(+ds.calnav);
    if (ds.calcard) {
      calCardToggle();
      const el = $("detail").querySelector(".calcard");
      if (el) el.scrollIntoView({ block: "nearest" });
    }
    if (ds.calcardnav) calCardShift(+ds.calcardnav);
    if (ds.calkm) calCardRadius(+ds.calkm);
    if (ds.calcardgo) {
      calCardMonth = ds.calcardgo;
      if (detailRow) detail(detailRow);
    }
    if (ds.calpick) calPick(ds.calpick, ds.caltime);
    if (b.id === "calsyncnow") calSyncNow(true);
    if (ds.calcancel) calResolve(+ds.calcancel, "cancel", b);
    if (ds.calrestore) calResolve(+ds.calrestore, "restore", b);
    if (ds.shipset) shipSet(ds.shipset, ds.status, ds.all === "1", b);
    if (ds.shipassign) afterRefresh(() => shipDialog("assign", ds.shipassign));
    if (ds.shipadd) afterRefresh(() => shipDialog("add"));
    if (ds.shipedit) afterRefresh(() => shipDialog("edit", ds.shipedit));
    if (b.id === "shipscan") shipScanRun(b);
    if (ds.setstatus) {
      if (refreshing) toast("Ešte obnovujem údaje po uložení, stav zmeň o chvíľu.");
      else saveStatus(ds.setstatus, b);
    }
    if (ds.contactedit) {
      contactEdit = +ds.contactedit;
      detail(contactEdit);
      const i = $("contactform") && $("contactform").elements.person;
      if (i) i.focus();
    }
    if (ds.icofind) icoFind(+ds.icofind, "");
    if (ds.icopick) icoPick(ds.icopick);
    if (ds.quote) openQuoteForm(+ds.quote);
    if (ds.quotecancel) {
      quoteForm = 0;
      if (detailRow) detail(detailRow);
    }
    if (ds.qpdf) quotePdf(+ds.row, ds.qpdf, b);
    if (ds.icoclose && !ico.busy) {
      ico = icoReset();
      if (detailRow) detail(detailRow);
    }
    if (ds.contactcancel && !contactSaving) {
      contactEdit = 0;
      if (detailRow) detail(detailRow);
    }
    if (b.dataset.close && !saving && !visitSaving && !editSaving && !doneSaving && !klSaving) {
      if (!formLeaveOk(b.dataset.close)) return;
      $(b.dataset.close).close();
    }
  });
  // Rozpísaný zápis (telefonát, návšteva, úprava telefonátu, splnená úloha) sa pri Zavrieť / Zrušiť / Esc / Späť
  // nezahodí bez otázky. „Rozpísaný“ = od otvorenia okna niečo zmenil človek (vyplnenie formulára kódom sa neráta).
  const DIRTY_FORMS = { call: "callform", visit: "visitform", calledit: "calleditform", done: "doneform" },
    formDirty = {};
  function formLeaveOk(id) {
    if (!formDirty[id]) return true;
    if (!confirm("Zahodiť rozpísaný zápis? Nič sa neuloží.")) return false;
    formDirty[id] = false;
    return true;
  }
  Object.keys(DIRTY_FORMS).forEach((id) => {
    const dlg = $(id);
    dlg.showModal = function () {
      formDirty[id] = false;
      return HTMLDialogElement.prototype.showModal.apply(this, arguments);
    };
    ["input", "change"].forEach((ev) =>
      $(DIRTY_FORMS[id]).addEventListener(ev, (e) => {
        // výber zariadenia sám osebe nie je rozpísaný text
        if (e.isTrusted && e.target.name !== "device") formDirty[id] = true;
      }),
    );
    dlg.addEventListener("cancel", (e) => {
      if (saving || visitSaving || editSaving || doneSaving) return; // počas ukladania okno nezavrie vlastná obsluha
      if (!formLeaveOk(id)) e.preventDefault();
    });
    dlg.addEventListener("close", () => (formDirty[id] = false));
  });
  // návrat na kartu zariadenia po uložení aj zrušení formulára (ak sa medzitým neotvorilo iné okno)
  ["call", "visit", "calledit", "done"].forEach((id) =>
    $(id).addEventListener("close", () => {
      const r = cardBack;
      cardBack = 0;
      if (r && byRow.has(r) && !document.querySelector("dialog[open]")) detail(r);
    }),
  );
  // Písanie do vyhľadávania prekreslí tabuľku až po krátkej pauze (150 ms); výber vo filtroch hneď.
  let searchTimer = 0;
  $("content").addEventListener("input", (e) => {
    if (view === "overview" || !FKEYS.includes(e.target.id)) return;
    clearTimeout(searchTimer);
    if (e.target.id === "search")
      searchTimer = setTimeout(() => {
        if ($("results")) results();
      }, 150);
    else results();
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.shipsel) shipSet(t.dataset.shipsel, t.value, false, t);
  });
  $("refresh").onclick = () => refresh(true);
  $("newcall").onclick = () => afterRefresh(() => openCall());
  f().device.onchange = populateCall;
  let apptAutoCleared = false;
  f().status.addEventListener("change", () => {
    const d = selected,
      cancel = apptToCancel(d, f().status.value) && f().appointment.value === d.appointment;
    if (cancel && !f().clearAppointment.checked) {
      f().clearAppointment.checked = true;
      f().appointment.disabled = true;
      $("callmore").open = true;
      apptAutoCleared = true;
      toast(
        "Stav „" +
          f().status.value +
          "“ zruší uložený termín ukážky " +
          format(d.appointment, true) +
          ". Ak ho chceš ponechať, odškrtni „Vymazať uložený termín“.",
      );
    } else if (!cancel && apptAutoCleared) {
      f().clearAppointment.checked = false;
      f().appointment.disabled = false;
      apptAutoCleared = false;
    }
  });
  f().clearAppointment.onchange = () => {
    f().appointment.disabled = f().clearAppointment.checked;
  };
  $("call").addEventListener("cancel", (e) => {
    if (saving) e.preventDefault();
  });
  $("callform").onsubmit = async (e) => {
    e.preventDefault();
    if (window.PREVIEW_DATA || saving) return;
    const p = { row: selected.row, name: selected.name, version: selected.version, requestId: pendingId };
    ["date", "status", "phone", "person", "result", "note", "action", "deadline", "appointment", "products"].forEach(
      (k) => (p[k] = f()[k].value),
    );
    p.clearAppointment = f().clearAppointment.checked;
    if (p.clearAppointment) p.appointment = "";
    // stav by uložený termín zrušil, ale „Vymazať uložený termín“ je odškrtnuté = termín chce ponechať
    else p.keepAppointment = !!apptToCancel(selected, p.status) && p.appointment === selected.appointment;
    p.order = f().order.checked;
    saving = true;
    $("save").disabled = true;
    $("save").textContent = "Ukladám…";
    Array.from(f()).forEach((el) => (el.disabled = true));
    $("saveerror").hidden = true;
    try {
      const r = await timedSave("saveCall", p);
      $("call").close();
      toast("Telefonát bol uložený do tabuľky aj histórie.");
      await applySaved(r);
    } catch (err) {
      $("saveerror").textContent = err.message;
      $("saveerror").hidden = false;
    } finally {
      saving = false;
      Array.from(f()).forEach((el) => (el.disabled = false));
      f().appointment.disabled = f().clearAppointment.checked;
      $("save").textContent = "Uložiť telefonát";
    }
  };

  let visitSelected = null,
    visitPending = "",
    visitSaving = false;
  const vf = () => $("visitform").elements;
  function openVisit(row) {
    if (saving || visitSaving) return;
    leaveCard(); // formulár z karty: po zatvorení sa karta otvorí znova
    devSearch(vf().device);
    devOptions(vf().device, "");
    if (row) vf().device.value = row;
    devSync(vf().device);
    const groups = [
      ...new Map((data.activities || []).filter((a) => a.type === "Spoločná ukážka").map((a) => [a.id, a])).values(),
    ];
    vf().eventId.innerHTML =
      '<option value="">Nová udalosť</option>' +
      groups
        .map(
          (a) =>
            '<option value="' +
            esc(a.id) +
            '">' +
            "Spoločná ukážka · " +
            (data.activities || []).filter((x) => x.id === a.id).length +
            " pracovísk · " +
            esc(a.date ? format(a.date) : "Dátum nezadaný") +
            "</option>",
        )
        .join("");
    vf().type.value = visitSelected0(row) === TRAINING_WAIT ? "Školenie" : "Samostatná ukážka";
    vf().type.disabled = false;
    vf().moreTraining.checked = false;
    visitTypeSync();
    vf().date.value = data.today;
    vf().date.max = data.today;
    vf().date.disabled = false;
    vf().visited.checked = true;
    vf().note.value = "";
    vf().nextAction.value = "";
    vf().nextDeadline.value = "";
    vf().nextDeadline.min = data.today;
    $("visiterror").hidden = true;
    visitSelected = data.devices.find((d) => d.row === +vf().device.value);
    visitNextHint();
    visitPending = crypto.randomUUID();
    $("savevisit").disabled = !!window.PREVIEW_DATA;
    $("visit").showModal();
    if (!row) {
      const i = $("visit").querySelector(".devsearch");
      if (i) i.focus();
    }
  }
  vf().device.onchange = () => {
    visitSelected = data.devices.find((d) => d.row === +vf().device.value);
    visitNextHint();
    visitPending = crypto.randomUUID();
  };
  const TRAINING_WAIT = "Čaká na školenie";
  // stav zariadenia, pre ktoré sa okno otvára (zariadenie čakajúce na školenie dostane predvolene typ Školenie)
  function visitSelected0(row) {
    const d = row ? data.devices.find((d) => d.row === +row) : null;
    return d ? d.status : "";
  }
  // pri školení sa ponúkne „Bude ďalšie školenie“ (stav ostane Čaká na školenie)
  function visitTypeSync() {
    const t = vf().type.value === "Školenie";
    $("moretraining").hidden = !t;
    if (!t) vf().moreTraining.checked = false;
  }
  vf().type.addEventListener("change", visitTypeSync);
  vf().moreTraining.addEventListener("change", () => {
    if (vf().moreTraining.checked && !vf().nextAction.value.trim())
      vf().nextAction.value = "Ďalšie školenie zamestnancov";
  });
  // doterajší ďalší krok zariadenia – nový ho nahradí
  function nextHint(d) {
    return d && (d.action || d.deadline)
      ? "Teraz: " + (d.action || "bez popisu") + (d.deadline ? " (" + format(d.deadline) + ")" : "") + " – nahradí sa."
      : "";
  }
  function visitNextHint() {
    $("visitnexthint").textContent = nextHint(visitSelected);
  }
  $("visit").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-vplus]");
    if (b) vf().nextDeadline.value = addDays(+b.dataset.vplus);
  });
  vf().eventId.onchange = () => {
    const a = (data.activities || []).find((a) => a.id === vf().eventId.value);
    vf().type.disabled = !!a;
    vf().date.disabled = !!a;
    if (a) {
      vf().type.value = "Spoločná ukážka";
      vf().date.value = a.date;
      vf().visited.checked = false;
    } else {
      vf().date.value = data.today;
      vf().type.value = "Samostatná ukážka";
    }
    visitTypeSync();
  };
  $("newvisit").onclick = () => afterRefresh(() => openVisit());
  $("visit").addEventListener("cancel", (e) => {
    if (visitSaving) e.preventDefault();
  });
  $("visitform").onsubmit = async (e) => {
    e.preventDefault();
    if (window.PREVIEW_DATA || visitSaving) return;
    const p = {
      row: visitSelected.row,
      name: visitSelected.name,
      version: visitSelected.version,
      requestId: visitPending,
      eventId: vf().eventId.value,
      type: vf().type.value,
      date: vf().date.value,
      note: vf().note.value,
      visited: vf().visited.checked,
      moreTraining: vf().moreTraining.checked,
    };
    if (vf().nextAction.value.trim() || vf().nextDeadline.value)
      p.plan = { action: vf().nextAction.value, deadline: vf().nextDeadline.value };
    visitSaving = true;
    Array.from(vf()).forEach((el) => (el.disabled = true));
    $("visiterror").hidden = true;
    $("savevisit").textContent = "Ukladám…";
    try {
      const r = await timedSave("saveActivity", p);
      $("visit").close();
      toast("Návšteva / ukážka bola uložená" + (p.plan ? " aj s ďalším krokom." : "."));
      await applySaved(r);
    } catch (err) {
      $("visiterror").textContent = err.message;
      $("visiterror").hidden = false;
    } finally {
      visitSaving = false;
      Array.from(vf()).forEach((el) => (el.disabled = false));
      vf().type.disabled = !!vf().eventId.value;
      vf().date.disabled = !!vf().eventId.value;
      $("savevisit").textContent = "Uložiť návštevu / ukážku";
    }
  };

  let editCall = null,
    editSaving = false;
  const ef = () => $("calleditform").elements;
  function openEditCall(row) {
    if (saving || visitSaving || editSaving) return;
    const c = data.calls.find((c) => c.row === +row);
    if (!c) return;
    leaveCard(); // formulár z karty: po zatvorení sa karta otvorí znova
    editCall = c;
    $("calleditname").textContent = c.name;
    ef().date.value = c.date || "";
    ef().date.max = data.today;
    ef().appointment.value = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(c.appointment || "") ? c.appointment : "";
    editCall.initialAppt = ef().appointment.value;
    ef().phone.value = c.phone;
    ef().person.value = c.person;
    ef().result.value = c.result;
    ef().note.value = c.note;
    ef().action.value = c.action;
    // termín ďalšieho kroku zariadenia sa dá opraviť len pri jeho poslednom hovore (ten určuje aktuálnu úlohu)
    const d = deviceByName(c.name),
      latest =
        !!d &&
        !data.calls.some((x) => x !== c && normalize(x.name) === normalize(c.name) && (x.date || "") > (c.date || ""));
    editCall.dl = latest ? d.deadline || "" : null;
    $("calleddl").hidden = !latest;
    ef().deadline.value = latest ? d.deadline || "" : "";
    ef().deadline.min = latest && d.deadline && d.deadline < data.today ? "" : data.today;
    $("calleddlnote").textContent = latest
      ? ""
      : d
        ? "Termín ďalšieho kroku sa dá zmeniť len pri poslednom hovore zariadenia."
        : "";
    $("calledterror").hidden = true;
    $("saveedit").disabled = !!window.PREVIEW_DATA;
    $("calledit").showModal();
  }
  $("calledit").addEventListener("cancel", (e) => {
    if (editSaving) e.preventDefault();
  });
  $("calleditform").onsubmit = async (e) => {
    e.preventDefault();
    if (window.PREVIEW_DATA || editSaving || !editCall) return;
    const p = {
      row: editCall.row,
      name: editCall.name,
      version: editCall.version,
      appointmentChanged: ef().appointment.value !== editCall.initialAppt,
      deadlineChanged: editCall.dl !== null && ef().deadline.value !== editCall.dl,
      deadline: ef().deadline.value,
    };
    ["date", "appointment", "phone", "person", "result", "note", "action"].forEach((k) => (p[k] = ef()[k].value));
    editSaving = true;
    Array.from(ef()).forEach((el) => (el.disabled = true));
    $("calledterror").hidden = true;
    $("saveedit").textContent = "Ukladám…";
    try {
      const r = await timedSave("updateCall", p);
      $("calledit").close();
      toast(
        r && r.unchanged
          ? "Bez zmien – nič sa neukladalo."
          : "Telefonát bol opravený v denníku hovorov" +
              (r && r.noteSynced ? ", v poznámke zariadenia" : "") +
              (r && r.taskSynced ? " aj v úlohe zariadenia" : "") +
              ".",
      );
      await applySaved(r);
    } catch (err) {
      $("calledterror").textContent = err.message;
      $("calledterror").hidden = false;
    } finally {
      editSaving = false;
      Array.from(ef()).forEach((el) => (el.disabled = false));
      $("saveedit").textContent = "Uložiť zmeny";
    }
  };
  function devOptions(sel, q) {
    const n = normalize(q || "").trim(),
      cur = sel.value;
    const list = data.devices.filter((d) => !n || normalize([d.name, d.city, d.district].join(" ")).includes(n));
    if (!list.length) return false;
    sel.innerHTML = list
      .map(
        (d) =>
          '<option value="' +
          d.row +
          '">' +
          esc(d.name) +
          (d.city && !normalize(d.name).includes(normalize(d.city)) ? " · " + esc(d.city) : "") +
          "</option>",
      )
      .join("");
    if (list.some((d) => String(d.row) === cur)) sel.value = cur;
    return true;
  }
  function devLabel(d) {
    return d.name + (d.city && !normalize(d.name).includes(normalize(d.city)) ? " · " + d.city : "");
  }
  function devSync(sel) {
    const inp = sel.parentNode.querySelector(".devsearch");
    if (!inp) return;
    const d = data.devices.find((x) => String(x.row) === sel.value);
    inp.value = d ? devLabel(d) : "";
  }
  function devSearch(sel) {
    if (sel.parentNode.querySelector(".devsearch")) return;
    sel.style.display = "none";
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;margin-top:6px";
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "devsearch";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.placeholder = "Začni písať názov, obec alebo okres…";
    inp.style.cssText =
      "display:block;width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:inherit";
    const list = document.createElement("div");
    list.hidden = true;
    list.style.cssText =
      "position:absolute;left:0;right:0;top:100%;z-index:20;background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 8px 24px rgba(9,29,58,.15);max-height:280px;overflow:auto;margin-top:4px";
    wrap.append(inp, list);
    sel.parentNode.insertBefore(wrap, sel);
    let items = [],
      hi = 0;
    const mark = () => {
      [...list.children].forEach((c, i) => {
        c.style.background = i === hi ? "var(--tone)" : "";
      });
      const c = list.children[hi];
      if (c) c.scrollIntoView({ block: "nearest" });
    };
    const draw = (all) => {
      const n = all === true ? "" : normalize(inp.value).trim();
      items = data.devices.filter((d) => !n || normalize([d.name, d.city, d.district].join(" ")).includes(n));
      hi =
        all === true
          ? Math.max(
              0,
              items.findIndex((d) => String(d.row) === sel.value),
            )
          : 0;
      list.innerHTML = items.length
        ? items
            .map(
              (d, i) =>
                '<div data-i="' +
                i +
                '" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--line)"><div style="font-weight:600">' +
                esc(d.name) +
                '</div><small style="color:var(--muted)">' +
                esc([d.city, d.district].filter(Boolean).join(" · ")) +
                "</small></div>",
            )
            .join("")
        : '<div style="padding:9px 12px;color:var(--muted)">Nič sa nenašlo</div>';
      list.hidden = false;
      mark();
    };
    const pick = (i) => {
      const d = items[i];
      if (!d) return;
      const ch = sel.value !== String(d.row);
      sel.value = String(d.row);
      list.hidden = true;
      devSync(sel);
      if (ch) sel.dispatchEvent(new Event("change"));
    };
    inp.addEventListener("focus", () => inp.select());
    inp.addEventListener("input", () => draw(false));
    inp.addEventListener("mousedown", () => {
      if (list.hidden)
        setTimeout(() => {
          draw(true);
          const c = list.children[hi];
          if (c) list.scrollTop = Math.max(0, c.offsetTop - list.clientHeight / 2);
          inp.select();
        }, 0);
    });
    const arrow = document.createElement("span");
    arrow.textContent = "▾";
    arrow.style.cssText = "position:absolute;right:12px;top:10px;color:var(--muted);pointer-events:none;font-size:16px";
    wrap.append(arrow);
    inp.style.paddingRight = "32px";
    inp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (list.hidden) draw(true);
        else {
          hi = Math.min(hi + 1, items.length - 1);
          mark();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        hi = Math.max(hi - 1, 0);
        mark();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!list.hidden) pick(hi);
      } else if (e.key === "Escape" && !list.hidden) {
        e.preventDefault();
        e.stopPropagation();
        list.hidden = true;
        devSync(sel);
      }
    });
    list.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const r = e.target.closest("[data-i]");
      if (r) pick(+r.dataset.i);
    });
    list.addEventListener("mousemove", (e) => {
      const r = e.target.closest("[data-i]");
      if (r && +r.dataset.i !== hi) {
        hi = +r.dataset.i;
        mark();
      }
    });
    inp.addEventListener("blur", () => {
      list.hidden = true;
      devSync(sel);
    });
  }
  let statusSaving = false;
  // Budúci uložený termín ukážky sa pri zmene na stav bez termínu zruší (rovnaké pravidlo ako na serveri).
  function apptToCancel(d, newStatus) {
    const keep = data.lists?.keepAppt || [];
    return d && d.appointment && d.appointment.slice(0, 10) >= data.today && !keep.includes(newStatus)
      ? d.appointment
      : "";
  }
  async function saveStatus(row, btn) {
    if (statusSaving || window.PREVIEW_DATA) return;
    const d = data.devices.find((x) => x.row === +row);
    const st = $("detailstatus") && $("detailstatus").value;
    if (!d || !st) return;
    if (st === d.rawStatus) {
      toast("Stav je rovnaký.");
      return;
    }
    const willCancel = apptToCancel(d, st);
    if (
      willCancel &&
      !confirm("Zmenou stavu na „" + st + "“ sa zruší termín ukážky " + format(willCancel, true) + ". Pokračovať?")
    )
      return;
    statusSaving = true;
    btn.disabled = true;
    btn.textContent = "Ukladám…";
    try {
      const r = await timedSave("setStatus", { row: d.row, name: d.name, version: d.version, status: st });
      toast(
        "Stav zmenený na „" +
          st +
          "“." +
          (r && r.cancelled ? " Termín ukážky " + format(r.cancelled, true) + " bol zrušený." : ""),
      );
      await applySaved(r);
      if ($("detail").open) detail(row);
    } catch (e) {
      toast("Zmena stavu zlyhala: " + e.message);
      btn.disabled = false;
      btn.textContent = "Zmeniť stav";
    } finally {
      statusSaving = false;
    }
  }
  // ---------- odberateľ (IČO) v karte zariadenia (icoSearch, icoSave – src/Ico.js) ----------
  // Hľadá sa v registri RPO až po kliknutí; odberateľa vyberá vždy človek (zariadenie často fakturuje zriaďovateľ).
  // Len v dashboarde a len vlastník – appka ani čitatelia tlačidlo nemajú.
  const icoReset = () => ({ row: 0, busy: "", cands: null, q: "", error: "" });
  let ico = icoReset();
  const icoCan = () => data && !data.readOnly && !window.APPKA;
  const icoAddr = (b) => [b.street, [b.zip, b.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  function buyerBox(d) {
    const b = d.buyer,
      open = ico.row === d.row;
    return (
      '<div class="buyer"><h4>Odberateľ (fakturácia)</h4>' +
      (b
        ? "<p><strong>" +
          esc(b.name) +
          "</strong><br>IČO " +
          esc(b.ico) +
          '<br><span class="muted">' +
          esc(icoAddr(b)) +
          "</span></p>"
        : '<p class="muted">IČO zatiaľ nie je priradené.</p>') +
      (icoCan() && !open
        ? '<p><button class="btn" data-icofind="' +
          d.row +
          '">' +
          (b ? "Zmeniť odberateľa" : "Nájsť IČO") +
          "</button></p>"
        : "") +
      (open ? icoPanel(d) : "") +
      quotesBox(d) +
      "</div>"
    );
  }
  function icoPanel(d) {
    const mine = d.buyer && d.buyer.ico;
    let h = '<div class="icopanel">';
    if (ico.busy) h += '<p class="muted">' + esc(ico.busy) + "</p>";
    else {
      if (ico.error) h += '<div class="banner">' + esc(ico.error) + "</div>";
      if (ico.cands && ico.cands.length)
        h +=
          '<p class="muted" style="font-size:13px;margin:6px 0">Návrhy z registra – vyber, kto bude na ponuke a faktúre:</p><ul class="icolist">' +
          ico.cands
            .map(
              (c) =>
                "<li><div><strong>" +
                esc(c.name) +
                '</strong> <span class="muted">IČO ' +
                esc(c.ico) +
                '</span><br><span class="muted" style="font-size:13px">' +
                esc(icoAddr(c)) +
                "</span> " +
                (c.why || []).map((w) => pill(w, w === "rovnaká adresa" ? "success" : "")).join(" ") +
                '</div><button class="btn' +
                (mine === c.ico ? '" disabled>Priradený' : ' primary" data-icopick="' + esc(c.ico) + '">Vybrať') +
                "</button></li>",
            )
            .join("") +
          "</ul>";
      else if (ico.cands)
        h +=
          '<p class="muted">V registri sa nič vhodné nenašlo. Skús iný názov (napr. zriaďovateľa) alebo zadaj IČO.</p>';
    }
    return (
      h +
      '<form id="icoform" class="icoform"><input name="q" maxlength="200" placeholder="Iný názov alebo IČO" aria-label="Hľadať odberateľa podľa názvu alebo IČO" value="' +
      esc(ico.q) +
      '"><button type="submit" class="btn"' +
      (ico.busy ? " disabled" : "") +
      '>Hľadať</button><button type="button" class="btn" data-icoclose="1"' +
      (ico.busy ? " disabled" : "") +
      '>Zavrieť</button></form><p class="muted" style="font-size:12px;margin:4px 0 0">Zdroj: register RPO, Štatistický úrad SR (CC BY 4.0).</p></div>'
    );
  }
  async function icoFind(row, q) {
    const d = byRow.get(row);
    if (!d || ico.busy || window.PREVIEW_DATA) return;
    ico = {
      row: d.row,
      busy: q ? "Hľadám „" + q + "“ v registri…" : "Hľadám v registri RPO… (môže to trvať do pol minúty)",
      cands: ico.row === d.row ? ico.cands : null,
      q,
      error: "",
    };
    detail(d.row);
    try {
      const r = await api("icoSearch", q ? { row: d.row, name: d.name, q } : { row: d.row, name: d.name });
      ico.cands = r.cands || [];
    } catch (e) {
      ico.error = "Hľadanie zlyhalo: " + ((e && e.message) || e);
    }
    ico.busy = "";
    if ($("detail").open && detailRow === d.row) detail(d.row);
  }
  async function icoPick(no) {
    const d = byRow.get(ico.row);
    if (!d || ico.busy) return;
    if (refreshing) {
      toast("Ešte obnovujem údaje po uložení, vyber o chvíľu.");
      return;
    }
    ico.busy = "Ukladám odberateľa…";
    ico.error = "";
    detail(d.row);
    try {
      const r = await api("icoSave", { row: d.row, name: d.name, ico: no });
      d.buyer = r.buyer;
      ico = icoReset();
      toast("Odberateľ uložený: " + r.buyer.name + " (IČO " + r.buyer.ico + ").");
      if ($("detail").open && detailRow === d.row) detail(d.row);
      refresh(true, "odberateľ");
    } catch (e) {
      ico.busy = "";
      ico.error = "Uloženie zlyhalo: " + ((e && e.message) || e);
      if ($("detail").open && detailRow === d.row) detail(d.row);
    }
  }
  // ---------- cenová ponuka vo Flowii (flowiiQuote, flowiiPdf – src/Flowii.js) ----------
  // Ponuka sa robí pre uloženého odberateľa (IČO); produkty a počty sa vyberú vo formulári (predvolene všetkých päť
  // po 1 ks, data.quoteGoods). Z Flowii sa nič neodosiela.
  let quoteBusy = 0,
    quoteForm = 0;
  const euro = (n) => (+n || 0).toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  function quotesBox(d) {
    const list = d.quotes || [];
    let h = list.length
      ? list
          .slice()
          .reverse()
          .map(
            (q) =>
              '<p class="quoteline">Ponuka č. <strong>' +
              esc(q.no || q.id) +
              "</strong> z " +
              esc(q.date) +
              (q.sum ? ' <span class="muted">· ' + esc(euro(q.sum)) + " bez DPH</span>" : "") +
              (icoCan()
                ? ' <button class="btn" data-qpdf="' + esc(q.id) + '" data-row="' + d.row + '">PDF</button>'
                : "") +
              "</p>",
          )
          .join("")
      : "";
    if (icoCan() && d.buyer && quoteForm === d.row && !quoteBusy) return h + quoteFormHtml();
    if (icoCan() && d.buyer)
      h +=
        quoteBusy === d.row
          ? '<p class="muted">Vytváram ponuku vo Flowii… (môže to trvať do pol minúty)</p>'
          : '<p><button class="btn' +
            (list.length ? "" : " primary") +
            '" data-quote="' +
            d.row +
            '">' +
            (list.length ? "Ďalšia cenová ponuka" : "Cenová ponuka vo Flowii") +
            "</button></p>";
    return h;
  }
  function quoteFormHtml() {
    return (
      '<form id="quoteform" class="quoteform"><p class="muted" style="font-size:13px;margin:6px 0">Produkty na ponuku (ceny bez DPH z cenníka Flowii):</p>' +
      (data.quoteGoods || [])
        .map(
          (g) =>
            '<label class="quoterow"><input type="checkbox" name="on" value="' +
            esc(g.id) +
            '" checked><span>' +
            esc(g.name) +
            ' <span class="muted">' +
            esc(euro(g.price)) +
            '</span></span><input type="number" name="q' +
            esc(g.id) +
            '" min="1" max="999" step="1" value="1" aria-label="Počet kusov ' +
            esc(g.name) +
            '"></label>',
        )
        .join("") +
      '<p class="quotetotal" id="quotetotal"></p><p style="display:flex;gap:8px;flex-wrap:wrap"><button type="submit" class="btn primary">Vytvoriť ponuku</button><button type="button" class="btn" data-quotecancel="1">Zrušiť</button></p></form>'
    );
  }
  // vybrané produkty z formulára → [{id, qty}]; null = neplatný počet kusov
  function quoteItems() {
    const f = $("quoteform");
    if (!f) return [];
    const out = [];
    for (const g of data.quoteGoods || []) {
      const on = f.querySelector('input[name="on"][value="' + g.id + '"]'),
        qty = +f.elements["q" + g.id].value;
      if (!on.checked) continue;
      if (!Number.isInteger(qty) || qty < 1 || qty > 999) return null;
      out.push({ id: g.id, qty });
    }
    return out;
  }
  function quoteTotal() {
    const items = quoteItems(),
      el = $("quotetotal");
    if (!el) return;
    if (!items) el.textContent = "Počet kusov musí byť celé číslo od 1 do 999.";
    else if (!items.length) el.textContent = "Vyber aspoň jeden produkt.";
    else
      el.textContent =
        "Spolu " +
        euro(items.reduce((s, x) => s + x.qty * data.quoteGoods.find((g) => g.id === x.id).price, 0)) +
        " bez DPH (" +
        items.reduce((s, x) => s + x.qty, 0) +
        " ks)";
  }
  function openQuoteForm(row) {
    const d = byRow.get(row);
    if (!d || quoteBusy || window.PREVIEW_DATA) return;
    if (!data.quoteGoods || !data.quoteGoods.length) {
      toast("Zoznam produktov sa ešte nenačítal. Obnov dashboard (Obnoviť).");
      return;
    }
    quoteForm = d.row;
    detail(d.row);
    quoteTotal();
  }
  async function makeQuote(row) {
    const d = byRow.get(row);
    if (!d || quoteBusy || window.PREVIEW_DATA) return;
    const items = quoteItems();
    if (!items || !items.length) {
      quoteTotal();
      return;
    }
    const again = !!(d.quotes && d.quotes.length);
    if (again && !confirm("Pre toto zariadenie už ponuka je. Vytvoriť vo Flowii ďalšiu?")) return;
    quoteBusy = d.row;
    quoteForm = 0;
    detail(d.row);
    try {
      const r = await api("flowiiQuote", { row: d.row, name: d.name, items, again });
      d.quotes = (d.quotes || []).concat([r.quote]);
      toast(
        "Ponuka č. " +
          r.quote.no +
          (r.recovered ? " (vytvorená minule) je teraz zapísaná aj v tabuľke" : " je vo Flowii") +
          (r.partnerCreated ? " (odberateľ bol vo Flowii založený)" : "") +
          (r.quote.sum ? ", suma " + euro(Number(r.quote.sum)) + " bez DPH" : "") +
          "." +
          // suma je podľa cenníka Flowii – ak sa líši od cien vo formulári, povie sa to
          (r.priceChanged && r.priceChanged.length
            ? " Cena vo Flowii je iná ako v dashboarde: " +
              r.priceChanged
                .map((x) => x.name + " " + euro(x.flowii) + " (v dashboarde " + euro(x.dashboard) + ")")
                .join(", ") +
              "."
            : "") +
          (r.priceMissing && r.priceMissing.length
            ? " Cenu vo Flowii sa nepodarilo prečítať (" +
              r.priceMissing.join(", ") +
              ") – suma je odhad, over ju vo Flowii."
            : ""),
      );
      refresh(true, "ponuka");
    } catch (e) {
      const msg = String((e && e.message) || e);
      // „Ponuka č. … je vo Flowii vytvorená, ale…“ – správa servera hovorí sama za seba (nová ponuka nevznikla)
      toast(/^Ponuka č\./.test(msg) ? msg : "Ponuku sa nepodarilo vytvoriť: " + msg);
    }
    quoteBusy = 0;
    if ($("detail").open && detailRow === d.row) detail(d.row);
  }
  function b64Bytes(b64) {
    const bin = atob(b64),
      bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  /* Strana „Ponúkané produkty“ (src/Ponuka.js) sa pripojí za PDF z Flowii knižnicou pdf-lib (načíta sa až pri prvom
     PDF, s kontrolným odtlačkom). Strany prílohy sa vložia ako obraz strany zmenšený na šírku prvej strany ponuky
     (A4 z Flowii), aby mal celý súbor rovnaký formát. Stránky z Flowii sa nemenia. */
  const PDFLIB = {
    js: "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js",
    hash: "sha256-D5pcrQeUHwgmWGyU4InYm5GMRuXBfPLVo8b2ZuO8aU8=",
  };
  let pdfLibLoading = null;
  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve();
    if (!pdfLibLoading)
      pdfLibLoading = new Promise((resolve, reject) => {
        const el = Object.assign(document.createElement("script"), {
          src: PDFLIB.js,
          integrity: PDFLIB.hash,
          crossOrigin: "anonymous",
        });
        el.onload = resolve;
        el.onerror = () => {
          el.remove();
          pdfLibLoading = null;
          reject(new Error("knižnicu PDF sa nepodarilo načítať"));
        };
        document.head.appendChild(el);
      });
    return pdfLibLoading;
  }
  async function pdfAppend(main, extra) {
    await loadPdfLib();
    const { PDFDocument } = window.PDFLib,
      out = await PDFDocument.load(main),
      add = await PDFDocument.load(extra),
      first = out.getPage(0).getSize(),
      pages = await out.embedPdf(add, add.getPageIndices());
    pages.forEach((ep) => {
      const s = Math.min(first.width / ep.width, first.height / ep.height),
        page = out.addPage([first.width, first.height]);
      page.drawPage(ep, {
        x: (first.width - ep.width * s) / 2,
        y: first.height - ep.height * s,
        width: ep.width * s,
        height: ep.height * s,
      });
    });
    return out.save();
  }
  async function quotePdf(row, id, btn) {
    const d = byRow.get(row);
    if (!d || btn.disabled) return;
    btn.disabled = true;
    btn.textContent = "Sťahujem…";
    try {
      const r = await api("flowiiPdf", { row: d.row, name: d.name, id });
      let bytes = b64Bytes(r.b64),
        note = r.extraNote || "";
      if (r.extra)
        try {
          bytes = await pdfAppend(bytes, b64Bytes(r.extra));
        } catch (e) {
          note = "Stranu s fotkami produktov sa nepodarilo pripojiť (" + ((e && e.message) || e) + ").";
        }
      if (note) toast("PDF z Flowii je stiahnuté. " + note);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })),
        a = document.createElement("a");
      a.href = url;
      a.download = r.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast("PDF sa nepodarilo stiahnuť: " + ((e && e.message) || e));
    }
    btn.disabled = false;
    btn.textContent = "PDF";
  }
  // ---------- úprava kontaktu v karte zariadenia (saveContact) ----------
  // Názov, obec a okres sa tu nemenia – podľa nich sa páruje história, mapa, zásielky a kalendár. Názov a obec mení
  // v dashboarde „Premenovať zariadenie“ (renameDevice) naraz vo všetkých hárkoch; okres len v tabuľke.
  const CONTACT_FIELDS = [
    ["person", "Kontaktná osoba / oddelenie", 500],
    ["phone", "Telefón", 500],
    ["email", "E-mail", 500],
    ["address", "Adresa", 500],
    ["web", "Zdroj / web", 1000],
    ["businessNote", "Obchodná poznámka", 5000, true],
  ];
  let contactEdit = 0,
    contactSaving = false;
  // odkaz na web ukáže len adresu stránky; iný text (napr. „register ŽSK“) ostane textom
  function web(v) {
    if (!/^https?:\/\/\S+$/i.test(v)) return esc(v);
    let host = v;
    try {
      host = new URL(v).hostname.replace(/^www\./, "");
    } catch (e) {}
    return '<a target="_blank" rel="noopener" href="' + esc(v) + '">' + esc(host) + "</a>";
  }
  function contactForm(v) {
    return (
      '<form id="contactform">' +
      CONTACT_FIELDS.map(
        ([k, label, max, area]) =>
          '<label class="field">' +
          label +
          (area
            ? '<textarea name="' + k + '" maxlength="' + max + '" rows="3">' + esc(v[k]) + "</textarea>"
            : '<input name="' + k + '" maxlength="' + max + '" value="' + esc(v[k]) + '">') +
          "</label>",
      ).join("") +
      '<p class="muted" style="font-size:13px;margin:4px 0 8px">Viac telefónov alebo e-mailov oddeľ bodkočiarkou.' +
      (renameAllowed() ? "" : " Názov, obec a okres sa menia v tabuľke.") +
      "</p>" +
      '<p style="display:flex;gap:8px;flex-wrap:wrap"><button type="submit" class="btn primary" id="contactsave">Uložiť kontakt</button><button type="button" class="btn" data-contactcancel="1">Zrušiť</button></p></form>' +
      renameForm(byRow.get(contactEdit))
    );
  }
  // ---------- premenovanie zariadenia (renameDevice – len dashboard) ----------
  // Prepíše názov a obec aj v histórii hovorov a návštev, mape, odberateľovi, cenových ponukách a zásielkach.
  const renameAllowed = () => !data.readOnly && !window.APPKA;
  function renameForm(d) {
    if (!d || !renameAllowed()) return "";
    return (
      '<details class="renamebox" style="margin-top:10px"><summary>Premenovať zariadenie (názov, obec)</summary>' +
      '<label class="field">Názov zariadenia / pracoviska<input id="renamename" maxlength="300" value="' +
      esc(d.name) +
      '"></label><label class="field">Obec<input id="renamecity" maxlength="100" value="' +
      esc(d.city) +
      '"></label><p class="muted" style="font-size:13px;margin:4px 0 8px">Zmení sa aj história hovorov a návštev, mapa, odberateľ, cenové ponuky a zásielky. Udalosť v kalendári ukážok sa vytvorí znova. Vo Flowii sa nič nemení.</p>' +
      '<p><button type="button" class="btn" id="renamesave" data-rename="' +
      d.row +
      '">Premenovať</button></p></details>'
    );
  }
  async function renameDevice(row) {
    const d = byRow.get(row);
    if (!d || contactSaving || window.PREVIEW_DATA || !$("renamename")) return;
    if (refreshing) {
      toast("Ešte obnovujem údaje po uložení, skús o chvíľu.");
      return;
    }
    const newName = $("renamename").value.trim(),
      newCity = $("renamecity").value.trim();
    if (!newName) return toast("Názov zariadenia nemôže byť prázdny.");
    if (newName === d.name && newCity === d.city) return toast("Názov ani obec sa nezmenili.");
    if (!confirm("Premenovať „" + d.name + ", " + d.city + "“ na „" + newName + ", " + newCity + "“?")) return;
    const btn = $("renamesave");
    contactSaving = true;
    btn.disabled = true;
    btn.textContent = "Premenúvam…";
    try {
      const r = await timedSave("renameDevice", { row: d.row, name: d.name, version: d.version, newName, newCity });
      const c = (r && r.counts) || {},
        parts = Object.keys(c).map((k) => k + " " + c[k]);
      toast(
        "Zariadenie premenované" +
          (parts.length ? " (prepísané: " + parts.join(", ") + ")" : "") +
          "." +
          (r && r.historySkipped
            ? " Históriu hovorov a návštev som nemenil – pôvodný názov má viac zariadení; uprav ju v tabuľke."
            : ""),
      );
      contactEdit = 0;
      await applySaved(r);
      if ($("detail").open) detail(d.row);
    } catch (e) {
      toast("Premenovanie zlyhalo: " + e.message);
      btn.disabled = false;
      btn.textContent = "Premenovať";
    } finally {
      contactSaving = false;
    }
  }
  $("detail").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rename]");
    if (b) renameDevice(+b.dataset.rename);
  });
  function contactValues() {
    const el = $("contactform").elements,
      v = {};
    CONTACT_FIELDS.forEach(([k]) => (v[k] = el[k].value.trim()));
    return v;
  }
  async function saveContact() {
    if (contactSaving || window.PREVIEW_DATA) return;
    const d = byRow.get(contactEdit);
    if (!d || !$("contactform")) return;
    if (refreshing) {
      toast("Ešte obnovujem údaje po uložení, ulož o chvíľu.");
      return;
    }
    const v = contactValues();
    if (CONTACT_FIELDS.every(([k]) => v[k] === (d[k] || "").trim())) {
      contactEdit = 0;
      detail(d.row);
      toast("Kontakt sa nezmenil.");
      return;
    }
    const btn = $("contactsave");
    contactSaving = true;
    btn.disabled = true;
    btn.textContent = "Ukladám…";
    try {
      const r = await timedSave("saveContact", Object.assign({ row: d.row, name: d.name, version: d.version }, v));
      if (!(r && r.queued)) toast("Kontakt uložený.");
      contactEdit = 0;
      await applySaved(r);
      if ($("detail").open) detail(d.row);
    } catch (e) {
      toast("Uloženie kontaktu zlyhalo: " + e.message);
      btn.disabled = false;
      btn.textContent = "Uložiť kontakt";
    } finally {
      contactSaving = false;
    }
  }
  $("detail").addEventListener("submit", (e) => {
    if (e.target.id !== "contactform") return;
    e.preventDefault();
    saveContact();
  });
  $("detail").addEventListener("submit", (e) => {
    if (e.target.id !== "quoteform") return;
    e.preventDefault();
    makeQuote(quoteForm);
  });
  $("detail").addEventListener("input", (e) => {
    if (e.target.closest("#quoteform")) quoteTotal();
  });
  $("detail").addEventListener("change", (e) => {
    if (e.target.closest("#quoteform")) quoteTotal();
  });
  $("detail").addEventListener("submit", (e) => {
    if (e.target.id !== "icoform") return;
    e.preventDefault();
    const q = e.target.elements.q.value.trim();
    if (q) icoFind(ico.row, q);
  });
  $("detail").addEventListener("close", () => {
    if (!contactSaving) contactEdit = 0;
    if (!ico.busy) ico = icoReset();
    quoteForm = 0;
  });
  $("call").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-cplus]");
    if (b) f().deadline.value = addDays(+b.dataset.cplus);
  });
  let doneDev = null,
    doneSaving = false;
  const df = () => $("doneform").elements;
  // ---------- rýchly zápis v záložke Po mailingu ----------
  // Nezdvihli: zapíše hovor do denníka, stav Nezdvihli, ďalší pokus o 2 pracovné dni; úloha ostáva v Po mailingu.
  // Nemá záujem: zapíše hovor, stav Nemá záujem, zmaže ďalší krok – úloha zmizne.
  // Má záujem: otvorí formulár telefonátu s predvyplneným stavom (treba doplniť termín ukážky a podrobnosti).
  // Používa rovnaký zápis ako „Zapísať telefonát“ (saveCall), takže platia všetky jeho kontroly.
  const quickState = new Map(); // riadok -> text stavu (ukladá sa / zapísané) do najbližšej obnovy
  function addWorkdays(n) {
    const d = new Date(data.today + "T12:00:00Z");
    let k = 0;
    while (k < n) {
      d.setUTCDate(d.getUTCDate() + 1);
      const w = d.getUTCDay();
      if (w !== 0 && w !== 6) k++;
    }
    return d.toISOString().slice(0, 10);
  }
  function quickButtons(d) {
    if (quickState.has(d.row)) return '<span class="muted">' + esc(quickState.get(d.row)) + "</span>";
    return (
      '<div class="quick">' +
      [
        ["nezdvihli", "Nezdvihli"],
        ["zaujem", "Má záujem"],
        ["nezaujem", "Nemá záujem"],
      ]
        .map(
          ([k, l]) =>
            '<button type="button" class="btn" data-quick="' + k + '" data-row="' + d.row + '">' + l + "</button>",
        )
        .join("") +
      "</div>"
    );
  }
  function setQuick(row, text) {
    quickState.set(row, text);
    const cell = document.querySelector('tr[data-taskrow="' + row + '"] .quickcell');
    if (cell) cell.innerHTML = '<span class="muted">' + esc(text) + "</span>";
  }
  async function quickCall(kind, row) {
    const d = byRow.get(+row);
    if (!d || window.PREVIEW_DATA || data.readOnly || quickState.has(d.row)) return;
    if (kind === "zaujem") {
      afterRefresh(() =>
        openCall(d.row, { status: "Má záujem", result: "Má záujem o ukážku", action: "Dohodnúť termín ukážky" }),
      );
      return;
    }
    const p = {
      row: d.row,
      name: d.name,
      version: d.version,
      requestId: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(36).slice(2) + "-quick",
      date: localToday(),
      phone: d.phone,
      person: d.person,
      note: "",
      appointment: "",
      clearAppointment: false,
      products: d.products,
      order: d.order,
    };
    if (kind === "nezdvihli")
      Object.assign(p, {
        status: "Nezdvihli",
        result: "Nezdvihli (po mailingu)",
        action: d.action,
        deadline: addWorkdays(2),
      });
    else Object.assign(p, { status: "Nemá záujem", result: "Nemá záujem (po mailingu)", action: "", deadline: "" });
    setQuick(d.row, "Ukladám…");
    try {
      const r = await timedSave("saveCall", p);
      setQuick(d.row, kind === "nezdvihli" ? "✓ Nezdvihli, ďalší pokus " + format(p.deadline) : "✓ Nemá záujem");
      toast(
        d.name +
          ": " +
          (kind === "nezdvihli"
            ? "nezdvihli, ďalší pokus " + format(p.deadline) + "."
            : "nemá záujem, úloha uzavretá.") +
          (r && r.cancelled ? " Termín ukážky " + format(r.cancelled, true) + " bol zrušený." : ""),
      );
      await applySaved(r);
    } catch (e) {
      quickState.delete(d.row);
      const cell = document.querySelector('tr[data-taskrow="' + d.row + '"] .quickcell');
      if (cell) cell.innerHTML = quickButtons(d);
      toast("Zápis pre " + d.name + " zlyhal: " + e.message);
    }
  }
  function addDays(n) {
    const d = new Date(data.today + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function doneApptHint() {
    const d = doneDev,
      cancel = !df().appointment.value && df().status.value !== d.rawStatus ? apptToCancel(d, df().status.value) : "";
    $("doneappt").textContent = cancel
      ? "Uložený termín " + format(cancel, true) + " sa zmenou stavu zruší."
      : d.appointment
        ? "Uložený termín: " + format(d.appointment, true)
        : "";
    $("doneappt").style.color = cancel ? "var(--accent)" : "";
  }
  function doneWarn() {
    if (doneDev) doneApptHint();
    const st = df().status.value,
      w = !df().action.value.trim() && !df().deadline.value && (data.lists?.actionable || []).includes(st);
    $("donewarn").textContent =
      "Bez ďalšieho kroku a so stavom „" +
      st +
      "“ sa zariadenie znova objaví v Mojich úlohách. Doplň ďalší krok alebo zmeň stav.";
    $("donewarn").hidden = !w;
  }
  function openDone(row) {
    if (saving || visitSaving || editSaving || doneSaving) return;
    const d = data.devices.find((x) => x.row === +row);
    if (!d) return;
    leaveCard(); // formulár z karty: po zatvorení sa karta otvorí znova
    doneDev = d;
    $("donename").textContent = d.name;
    df().done.value = d.taskText || d.action || "";
    df().status.innerHTML = data.statuses.map((s) => "<option>" + esc(s) + "</option>").join("");
    df().status.value = d.rawStatus;
    df().action.value = "";
    df().deadline.value = "";
    df().appointment.value = "";
    doneApptHint();
    df().logCall.checked = /zavol|vola|telefon|potvrd|ozva/i.test(normalize(d.taskText || d.action || ""));
    df().deadline.min = data.today;
    $("doneerror").hidden = true;
    $("savedone").disabled = !!window.PREVIEW_DATA;
    doneWarn();
    $("done").showModal();
  }
  $("done").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-plus]");
    if (b) {
      df().deadline.value = addDays(+b.dataset.plus);
      doneWarn();
    }
  });
  // Zadaný budúci termín ukážky prepne otvorený stav na „Termín dohodnutý“ (to isté urobí aj server).
  df().appointment.addEventListener("change", () => {
    const v = df().appointment.value,
      st = df().status.value;
    if (
      v &&
      v.slice(0, 10) >= data.today &&
      ((data.lists?.actionable || []).includes(st) || st === "Neoslovené" || st === "Stav neoverený")
    )
      df().status.value = "Termín dohodnutý";
    doneWarn();
  });
  ["input", "change"].forEach((ev) => $("doneform").addEventListener(ev, doneWarn));
  $("done").addEventListener("cancel", (e) => {
    if (doneSaving) e.preventDefault();
  });
  $("doneform").onsubmit = async (e) => {
    e.preventDefault();
    if (window.PREVIEW_DATA || doneSaving || !doneDev) return;
    const p = {
      row: doneDev.row,
      name: doneDev.name,
      version: doneDev.version,
      done: df().done.value,
      status: df().status.value,
      action: df().action.value,
      deadline: df().deadline.value,
      appointment: df().appointment.value,
      logCall: df().logCall.checked,
      date: localToday(), // deň úkonu – zápis z fronty appky sa môže odoslať až neskôr
    };
    doneSaving = true;
    Array.from(df()).forEach((el) => (el.disabled = true));
    $("doneerror").hidden = true;
    $("savedone").textContent = "Ukladám…";
    try {
      const r = await timedSave("completeTask", p);
      $("done").close();
      toast(
        p.appointment
          ? "Úloha splnená, termín ukážky " + format(p.appointment, true) + " je uložený."
          : r && r.cancelled
            ? "Úloha splnená, termín ukážky " + format(r.cancelled, true) + " bol zrušený."
            : p.action.trim()
              ? "Úloha splnená, nový krok je uložený."
              : "Úloha označená ako splnená.",
      );
      await applySaved(r);
    } catch (err) {
      $("doneerror").textContent = err.message;
      $("doneerror").hidden = false;
    } finally {
      doneSaving = false;
      Array.from(df()).forEach((el) => (el.disabled = false));
      $("savedone").textContent = "Uložiť";
    }
  };
  /* ---------- mapa zariadení ----------
     Poloha (d.lat, d.lng, d.geo) prichádza s dashboardom z hárka „Mapa - súradnice“ (src/Mapa.js). Mapu kreslí knižnica
     Leaflet nad podkladom OpenStreetMap – načíta sa až pri otvorení záložky (v appke z vlastných súborov, v dashboarde
     zo siete). Bez pripojenia ostane výber zariadenia a vzdialenosti, len bez podkladu. Vzdialenosť = vzdušná čiara. */
  const LEAFLET = window.APPKA
    ? { js: "leaflet.js", css: "leaflet.css" }
    : {
        js: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
        jsHash: "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=",
        css: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        cssHash: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
      };
  let leafletLoading = null,
    mapBox = null, // prvok mapy sa vytvorí raz a pri prekreslení stránky sa len vráti na miesto
    lmap = null,
    mapLayer = null,
    mapSel = 0, // riadok vybraného zariadenia
    mapFitted = false,
    mapPan = false,
    mapBusy = "";
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (!leafletLoading) {
      // štýly aj skript musia byť načítané skôr, než sa mapa vytvorí (bez štýlov by mala zlé rozmery)
      const add = (el, hash) =>
        new Promise((resolve, reject) => {
          if (hash) {
            el.integrity = hash;
            el.crossOrigin = "anonymous";
          }
          el.onload = resolve;
          el.onerror = () => {
            el.remove();
            reject(new Error("Knižnicu mapy sa nepodarilo načítať."));
          };
          document.head.appendChild(el);
        });
      leafletLoading = Promise.all([
        add(Object.assign(document.createElement("link"), { rel: "stylesheet", href: LEAFLET.css }), LEAFLET.cssHash),
        add(Object.assign(document.createElement("script"), { src: LEAFLET.js }), LEAFLET.jsHash),
      ]).catch((e) => {
        leafletLoading = null; // pri ďalšom otvorení záložky sa skúsi znova
        throw e;
      });
    }
    return leafletLoading;
  }
  function kmBetween(a, b) {
    const rad = Math.PI / 180,
      h =
        Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
        Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }
  const kmText = (x) => (x < 1 ? "do 1 km" : x < 10 ? x.toFixed(1).replace(".", ",") + " km" : Math.round(x) + " km");
  const MAP_FILTERS = [
    ["mapstatus", (d) => d.status, "Všetky stavy", "Stav"],
    ["maptype", (d) => d.type, "Všetky typy", "Typ zariadenia"],
    ["mapdistrict", (d) => d.district, "Všetky okresy", "Okres"],
  ];
  function mapDevices() {
    const open = $("mapopen").checked,
      stock = $("mapstock").checked;
    return data.devices.filter(
      (d) =>
        d.lat != null &&
        (!open || d.open) &&
        (!stock || shipInStock(d)) &&
        MAP_FILTERS.every(([id, get]) => !$(id).value || get(d) === $(id).value),
    );
  }
  // Zariadenia s rovnakou polohou (napr. len stred obce) sa rozložia do krúžku, aby sa dali rozlíšiť a kliknúť.
  function mapPositions(list) {
    const groups = new Map(),
      pos = new Map();
    list.forEach((d) => {
      const k = d.lat + "," + d.lng;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(d);
    });
    groups.forEach((g) =>
      g.forEach((d, i) => {
        if (g.length === 1) return pos.set(d.row, [d.lat, d.lng]);
        const a = (2 * Math.PI * i) / g.length,
          r = Math.min(0.004, 0.0006 + 0.00012 * g.length);
        pos.set(d.row, [d.lat + r * Math.sin(a), d.lng + r * 1.5 * Math.cos(a)]);
      }),
    );
    return pos;
  }
  const mapNearest = (list, sel, n) =>
    list
      .filter((d) => d !== sel)
      .map((d) => [kmBetween(sel, d), d])
      .sort((a, b) => a[0] - b[0])
      .slice(0, n);
  function mapMount() {
    if (!mapBox) {
      mapBox = document.createElement("div");
      mapBox.innerHTML =
        '<div class="filters"><label class="field grow">Zariadenie<select id="mappick"></select></label>' +
        MAP_FILTERS.map(
          ([id, , , label]) => '<label class="field">' + label + '<select id="' + id + '"></select></label>',
        ).join("") +
        '<label class="checkbox mapcheck"><input id="mapopen" type="checkbox">Len s otvorenou úlohou</label>' +
        '<label class="checkbox mapcheck"><input id="mapstock" type="checkbox">Len tovar na sklade (rozvoz)</label></div>' +
        '<div class="mapgrid"><div><div id="lmap" class="lmap"></div><div id="maplegend" class="maplegend"></div></div>' +
        '<aside class="panel mapside" id="mapside"></aside></div>';
      mapBox.addEventListener("change", (e) => {
        if (e.target.id === "mappick") mapSelect(+e.target.value, true);
        else if (
          e.target.id === "mapopen" ||
          e.target.id === "mapstock" ||
          MAP_FILTERS.some(([id]) => id === e.target.id)
        )
          mapDraw(true);
      });
    }
    $("mapslot").replaceWith(mapBox);
    MAP_FILTERS.forEach(([id, get, first]) => {
      const el = $(id),
        was = el.value,
        items = [...new Set(data.devices.map(get))].filter(Boolean).sort((a, b) => a.localeCompare(b, "sk"));
      el.innerHTML = options(items, first);
      if (items.includes(was)) el.value = was;
    });
    mapDraw();
    loadLeaflet()
      .then(() => {
        if (view !== "map" || !mapBox.isConnected) return;
        if (!lmap) {
          lmap = L.map($("lmap"), { preferCanvas: true, zoomSnap: 0.5 }).setView([48.7, 19.5], 8);
          lmap.attributionControl.setPrefix(false);
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
          }).addTo(lmap);
          mapLayer = L.layerGroup().addTo(lmap);
          // zmena veľkosti okna alebo rozloženia stránky: mapa si prepočíta rozmery
          if (typeof ResizeObserver === "function") new ResizeObserver(() => lmap.invalidateSize()).observe($("lmap"));
        }
        lmap.invalidateSize();
        mapDraw();
      })
      .catch(() => {
        if (!lmap && $("lmap"))
          $("lmap").innerHTML =
            '<div class="empty">Mapu sa nepodarilo načítať (chýba pripojenie). Výber zariadenia a vzdialenosti fungujú aj bez nej.</div>';
      });
  }
  function mapSelect(row, pan) {
    mapSel = row || 0;
    mapPan = !!pan && !!mapSel;
    mapDraw();
  }
  function mapDraw(fit) {
    if (view !== "map" || !mapBox || !mapBox.isConnected) return;
    const list = mapDevices();
    let sel = mapSel ? byRow.get(mapSel) : null;
    if (!sel || sel.lat == null) {
      sel = null;
      mapSel = 0;
      mapPan = false;
    }
    const shown = sel && !list.includes(sel) ? list.concat(sel) : list; // vybrané zariadenie ostáva na mape aj mimo filtra
    $("mappick").innerHTML =
      '<option value="">Vybrať zariadenie… (' +
      shown.length +
      ")</option>" +
      shown
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "sk"))
        .map((d) => '<option value="' + d.row + '">' + esc(d.name + (d.city ? " · " + d.city : "")) + "</option>")
        .join("");
    $("mappick").value = mapSel || "";
    mapSide(list, sel);
    const counts = new Map();
    shown.forEach((d) => counts.set(d.status, (counts.get(d.status) || 0) + 1));
    $("maplegend").innerHTML = [...counts]
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => '<span><i style="background:' + statusColor(s)[2] + '"></i>' + esc(s) + " (" + n + ")</span>")
      .join("");
    const stockN = shown.filter(shipInStock).length;
    if (stockN)
      $("maplegend").innerHTML +=
        '<span><i style="background:#fff;box-shadow:inset 0 0 0 3px #119039"></i>Tovar na sklade – rozvoz (' +
        stockN +
        ")</span>";
    if (!lmap) return;
    mapLayer.clearLayers();
    const pos = mapPositions(shown);
    const mark = (d) => {
      const on = d === sel,
        stock = shipInStock(d); // tovar na sklade čaká na rozvoz – zelený krúžok EnSafe
      L.circleMarker(pos.get(d.row), {
        radius: on ? 11 : stock ? 10 : 8,
        color: on ? "#111827" : stock ? "#119039" : "#fff",
        weight: on ? 3 : stock ? 4 : 1.5,
        fillColor: statusColor(d.status)[2],
        fillOpacity: 0.95,
      })
        .bindTooltip(esc(d.name + (d.city ? " · " + d.city : "")))
        .on("click", () => mapSelect(d.row))
        .addTo(mapLayer);
    };
    shown.forEach((d) => d !== sel && mark(d));
    if (sel) mark(sel); // navrchu
    if (mapPan && sel) {
      // výrez: vybrané zariadenie a jeho 5 najbližších
      const pts = mapNearest(list, sel, 5).map(([, d]) => pos.get(d.row));
      lmap.fitBounds(L.latLngBounds(pts.concat([pos.get(sel.row)])).pad(0.25), { maxZoom: 13 });
      mapFitted = true;
    } else if ((fit || !mapFitted) && shown.length) {
      lmap.fitBounds(L.latLngBounds([...pos.values()]).pad(0.08), { maxZoom: 13 });
      mapFitted = true;
    }
    mapPan = false;
  }
  const telLinks = (phone) =>
    String(phone || "")
      .split(";")
      .filter((p) => p.trim())
      .map((p) => '<a href="tel:' + esc(p.replace(/[^+\d]/g, "")) + '">' + esc(p.trim()) + "</a>")
      .join(", ");
  function mapSide(list, sel) {
    const all = data.devices,
      placed = all.filter((d) => d.lat != null).length,
      unknown = all.filter((d) => !d.geo).length,
      lost = all.filter((d) => d.geo && d.lat == null);
    let h = "";
    if (sel) {
      const near = mapNearest(list, sel, 15);
      h +=
        '<div class="panelhead"><h2>' +
        nameButton(sel) +
        '</h2><button class="btn" data-mapsel="0">Zrušiť výber</button></div><div class="mapcard"><p>' +
        status(sel) +
        "</p>" +
        shipInfo(sel) +
        line("place", esc([...new Set([sel.address, sel.city, sel.district].filter(Boolean))].join(", "))) +
        line("phone", telLinks(sel.phone)) +
        (sel.person ? "<p>" + esc(sel.person) + "</p>" : "") +
        (sel.open
          ? '<p class="notes"><strong>Ďalší krok:</strong> ' +
            esc(sel.taskText) +
            (sel.deadline ? " · " + esc(format(sel.deadline)) : "") +
            "</p>"
          : "") +
        (sel.geo === "obec" ? '<p class="muted">Poloha je len približná (stred obce).</p>' : "") +
        '<div class="quick">' +
        (data.readOnly ? "" : '<button class="btn primary" data-call="' + sel.row + '">Zapísať telefonát</button>') +
        '<a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' +
        sel.lat +
        "," +
        sel.lng +
        '">Trasa v Google Mapách</a></div></div><div class="panelhead"><h2>Najbližšie zariadenia</h2></div><div class="list">' +
        (near
          .map(
            ([km, d]) =>
              '<div class="item"><div><button class="name" data-mapsel="' +
              d.row +
              '">' +
              esc(d.name) +
              "</button><p>" +
              esc(d.city) +
              (d.phone ? " · " + telLinks(d.phone) : "") +
              '</p></div><div class="near"><strong>' +
              kmText(km) +
              "</strong>" +
              status(d, true) +
              "</div></div>",
          )
          .join("") || '<p class="muted">Vo filtri nie je žiadne ďalšie zariadenie s polohou.</p>') +
        '</div><div class="mapcard"><p class="muted">Vzdialenosti sú vzdušnou čiarou, cesta autom býva dlhšia.</p></div>';
    } else
      h +=
        '<div class="panelhead"><h2>Zariadenia na mape</h2></div><div class="mapcard"><p>Klikni na bod na mape alebo vyber zariadenie zo zoznamu – ukážem kontakt a najbližšie zariadenia so vzdialenosťou.</p></div>';
    h +=
      '<div class="mapcard"><p class="muted">Zobrazených ' +
      list.length +
      " z " +
      all.length +
      " zariadení" +
      (placed < all.length ? ", polohu má " + placed : "") +
      ".</p>";
    if (mapBusy) h += "<p>" + esc(mapBusy) + "</p>";
    else if (window.APPKA || data.readOnly)
      h += unknown
        ? '<p class="muted">' +
          unknown +
          " zariadení ešte nemá dohľadanú polohu. " +
          (data.readOnly && !window.APPKA
            ? "Dohľadáva ich vlastník dashboardu."
            : "Dohľadáš ich v dashboarde na počítači (záložka Mapa).") +
          "</p>"
        : "";
    else
      h +=
        (unknown ? "<p>" + unknown + " zariadení ešte nemá dohľadanú polohu.</p>" : "") +
        '<button class="btn' +
        (unknown ? " primary" : "") +
        '" id="mapgeocode">' +
        (unknown ? "Dohľadať polohy" : "Aktualizovať polohy po zmene adries") +
        '</button><p class="muted">Adresy z Kontaktov sa vyhľadajú cez Google a súradnice sa uložia do hárka „Mapa - súradnice“. Hárok Kontakty sa nemení.</p>';
    if (lost.length)
      h +=
        '<details class="more"><summary>Polohu sa nepodarilo nájsť (' +
        lost.length +
        ')</summary><p class="muted">Oprav adresu v Kontaktoch, alebo dopíš šírku a dĺžku do hárka „Mapa - súradnice“.</p>' +
        lost.map((d) => "<p>" + nameButton(d) + ' <span class="muted">' + esc(d.city) + "</span></p>").join("") +
        "</details>";
    $("mapside").innerHTML = h + "</div>";
  }
  // Polohy sa dohľadávajú po dávkach (server jednu dávku obmedzuje časom), kým nie sú všetky.
  async function mapGeocodeRun() {
    if (mapBusy) return;
    let done = 0,
      lost = 0,
      note = "";
    try {
      for (;;) {
        mapBusy = "Dohľadávam polohy… hotových " + done + ". Nechaj záložku otvorenú.";
        mapDraw();
        const r = await api("mapGeocode");
        done += r.done;
        lost += r.notFound;
        if (r.stopped) note = r.stopped;
        if (r.stopped || !r.left || !r.done) break;
      }
    } catch (e) {
      note = e.message;
    }
    mapBusy = "";
    toast(
      note ||
        (done
          ? "Dohľadaných polôh: " + (done - lost) + (lost ? ", nenájdených: " + lost : "") + "."
          : "Všetky polohy sú aktuálne."),
    );
    if (done) refresh(true, "mapa");
    else mapDraw();
  }
  /* ---------- QR kód (párovací odkaz pre telefón) ----------
     Vlastný malý generátor, aby stránka nepotrebovala cudziu knižnicu: QR verzia 5 (37×37), úroveň opravy L,
     bajtový režim, maska 0 – stačí na text do 106 bajtov. Vracia maticu true/false (true = tmavý bod). */
  function qrMatrix(text) {
    const bytes = Array.from(new TextEncoder().encode(text)),
      size = 37,
      dataLen = 108,
      eccLen = 26;
    if (bytes.length > dataLen - 2) throw new Error("Text je na QR kód pridlhý.");
    // dáta: režim (0100), dĺžka (8 bitov), bajty, ukončenie a výplň
    const bits = [];
    const put = (value, n) => {
      for (let i = n - 1; i >= 0; i--) bits.push((value >>> i) & 1);
    };
    put(4, 4);
    put(bytes.length, 8);
    bytes.forEach((b) => put(b, 8));
    put(0, Math.min(4, dataLen * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (let pad = 0xec; data.length < dataLen; pad ^= 0xec ^ 0x11) data.push(pad);
    // Reedov–Solomonov kód nad GF(256)
    const mul = (x, y) => {
      let z = 0;
      for (let i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11d);
        z ^= ((y >>> i) & 1) * x;
      }
      return z;
    };
    const divisor = new Array(eccLen).fill(0);
    divisor[eccLen - 1] = 1;
    for (let i = 0, root = 1; i < eccLen; i++, root = mul(root, 2))
      for (let j = 0; j < eccLen; j++) {
        divisor[j] = mul(divisor[j], root);
        if (j + 1 < eccLen) divisor[j] ^= divisor[j + 1];
      }
    const ecc = new Array(eccLen).fill(0);
    data.forEach((b) => {
      const factor = b ^ ecc.shift();
      ecc.push(0);
      divisor.forEach((coef, i) => (ecc[i] ^= mul(coef, factor)));
    });
    const all = data.concat(ecc);
    // pevné vzory
    const m = Array.from({ length: size }, () => new Array(size).fill(false)),
      fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      m[y][x] = dark;
      fn[y][x] = true;
    };
    for (let i = 0; i < size; i++) {
      set(6, i, i % 2 === 0);
      set(i, 6, i % 2 === 0);
    }
    [
      [3, 3],
      [size - 4, 3],
      [3, size - 4],
    ].forEach(([cx, cy]) => {
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          set(cx + dx, cy + dy, d !== 2 && d !== 4);
        }
    });
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) set(30 + dx, 30 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    // formát: úroveň L (01), maska 0 + kontrolné bity
    const fdata = 1 << 3;
    let rem = fdata;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const fbits = ((fdata << 10) | rem) ^ 0x5412,
      fb = (i) => ((fbits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, fb(i));
    set(8, 7, fb(6));
    set(8, 8, fb(7));
    set(7, 8, fb(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, fb(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, fb(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, fb(i));
    set(8, size - 8, true);
    // dátové body cik-cak od pravého dolného rohu, potom maska 0
    let k = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++)
        for (let j = 0; j < 2; j++) {
          const x = right - j,
            y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
          if (!fn[y][x] && k < all.length * 8) {
            m[y][x] = ((all[k >>> 3] >>> (7 - (k & 7))) & 1) !== 0;
            k++;
          }
        }
    }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) if (!fn[y][x] && (x + y) % 2 === 0) m[y][x] = !m[y][x];
    return m;
  }
  function qrSvg(text) {
    const m = qrMatrix(text),
      n = m.length + 8; // 4 body bieleho okraja z každej strany
    let d = "";
    m.forEach((row, y) => row.forEach((dark, x) => dark && (d += "M" + (x + 4) + " " + (y + 4) + "h1v1h-1z")));
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" class="qr" role="img" aria-label="QR kód na spárovanie" viewBox="0 0 ' +
      n +
      " " +
      n +
      '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path fill="#000" d="' +
      d +
      '"/></svg>'
    );
  }
  /* ---------- appka a zariadenia ---------- */
  // V dashboarde: zoznam spárovaných zariadení a pripojenie tohto zariadenia. V appke: odhlásenie zariadenia.
  async function loadDevices() {
    $("deviceslist").innerHTML = empty("Načítavam zariadenia…");
    try {
      const list = await api("appDevices");
      $("deviceslist").innerHTML = list.length
        ? list
            .map(
              (d) =>
                '<div class="devicerow"><div><strong>' +
                esc(d.name) +
                '</strong><div class="muted">pripojené ' +
                esc(format(d.created)) +
                (d.used ? " · naposledy použité " + esc(format(d.used)) : " · zatiaľ nepoužité") +
                '</div></div><button class="btn" type="button" data-revoke="' +
                esc(d.id) +
                '">Zrušiť</button></div>',
            )
            .join("")
        : empty("Zatiaľ nie je pripojené žiadne zariadenie.");
    } catch (err) {
      $("deviceslist").innerHTML = empty(err.message);
    }
  }
  $("devices").addEventListener("click", () => {
    if (window.APPKA) {
      const n = window.APPKA.pending ? window.APPKA.pending() : 0;
      if (
        confirm(
          (n ? "POZOR: v zariadení čaká " + n + " neodoslaných zápisov – odhlásením sa nenávratne zmažú.\n\n" : "") +
            "Odhlásiť toto zariadenie? Appku bude treba znova spárovať z dashboardu.",
        )
      )
        window.APPKA.unpair();
      return;
    }
    const ua = navigator.userAgent;
    $("pairform").elements.name.value = /Android/.test(ua)
      ? "Telefón (Android)"
      : /Windows/.test(ua)
        ? "Počítač (Windows)"
        : "Zariadenie";
    $("pairerror").hidden = true;
    $("pairlink").innerHTML = "";
    $("devicesdlg").showModal();
    loadDevices();
  });
  $("deviceslist").addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-revoke]");
    if (!b || !confirm("Zrušiť toto zariadenie? Appka v ňom prestane fungovať, kým ho znova nespáruješ.")) return;
    b.disabled = true;
    try {
      await api("appRevoke", b.dataset.revoke);
    } catch (err) {
      toast(err.message);
    }
    loadDevices();
  });
  $("pairform").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    $("pairstart").disabled = true;
    $("pairerror").hidden = true;
    $("pairlink").innerHTML = "";
    try {
      const r = await api("appPairStart", $("pairform").elements.name.value);
      if (!r.url) throw new Error("Adresa appky ešte nie je nastavená.");
      // odkaz musí otvoriť používateľ sám (okno otvorené po čakaní na server by prehliadač zablokoval)
      const shown = r.code.slice(0, 4) + "-" + r.code.slice(4);
      let qr = "";
      try {
        qr = qrSvg(r.url + "#pair=" + r.code);
      } catch (e) {} // bez QR ostáva kód na opísanie
      $("pairlink").innerHTML =
        '<div class="pairbox">' +
        qr +
        '<div><p class="paircode">' +
        esc(shown) +
        '</p><p class="muted"><strong>Telefón:</strong> naskenuj QR kód fotoaparátom – appka sa otvorí a spáruje sama. ' +
        "Alebo v telefóne otvor <strong>" +
        esc(r.url.replace(/^https?:\/\//, "").replace(/\/$/, "")) +
        "</strong> a opíš kód. Do Google sa tam prihlasovať netreba.</p></div></div>" +
        '<p class="muted"><strong>Toto zariadenie:</strong> <a target="_blank" rel="noopener" href="' +
        esc(r.url + "#pair=" + r.code) +
        '">otvoriť appku a spárovať</a>.</p><p class="muted">Kód platí ' +
        r.minutes +
        " minút a len raz. Appku si potom nainštaluj cez ponuku prehliadača („Nainštalovať aplikáciu“ / „Pridať do telefónu“).</p>";
      loadDevices();
    } catch (err) {
      $("pairerror").textContent = err.message;
      $("pairerror").hidden = false;
    } finally {
      $("pairstart").disabled = false;
    }
  });
  // Appka: najprv údaje uložené v zariadení (hneď, aj bez signálu), potom čerstvé zo servera.
  async function startApp() {
    try {
      const s = await window.APPKA.savedDashboard();
      if (s && !data) install((await unpackDashboard(s.result)).r);
    } catch (e) {}
    refresh();
    // po návrate spojenia alebo do popredia (po viac než 5 minútach) sa údaje obnovia samy
    const again = () => {
      if (window.APPKA.pending && window.APPKA.pending()) return window.APPKA.flush(); // najprv odoslať čakajúce zápisy
      if (!refreshing && !saving && !visitSaving && !editSaving && !doneSaving) refresh(false, "automatická obnova");
    };
    window.addEventListener("online", again);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && (offline || Date.now() - lastFresh > 300000)) again();
    });
    // Jedno zlyhané načítanie (počítač sa práve zobudil, server neodpovedal včas) nesmie nechať appku „bez pripojenia“
    // natrvalo: kým je otvorená, skúša to znova sama – po 15 s, potom s dvojnásobnou pauzou, najviac po 5 minútach.
    // Otvorená appka s pripojením si údaje obnoví každých 10 minút.
    let retryAt = 0,
      retryDelay = 15000;
    setInterval(() => {
      if (document.visibilityState !== "visible" || refreshing) return;
      const now = Date.now();
      if (now < retryAt) return;
      if (offline) {
        retryAt = now + retryDelay;
        retryDelay = Math.min(retryDelay * 2, 300000);
        again();
      } else {
        retryDelay = 15000;
        if (now - lastFresh > 600000) {
          retryAt = now + 60000;
          again();
        }
      }
    }, 5000);
  }
  /* ---------- klienti BOZP a OPP (src/Klienti.js) ----------
     Záložka Klienti: zoznam klientov (z Flowii), karta klienta, zápis výkonu s nedostatkami, otvorené nedostatky
     a výkony, ktoré ešte treba preniesť do EcoSunu / EBOZ. Rozpísaný výkon sa priebežne ukladá v zariadení
     (localStorage „ensafe-vykon-<klient>“), aby sa nestratil pri zatvorení okna alebo obnovení stránky. */
  let klSaving = false,
    klShowHidden = false,
    klQuery = "",
    klCardId = "",
    klFormId = "",
    klPreview = null,
    klLoading = false;
  const KL_DRAFT = "ensafe-vykon-";
  const klTypes = () => data.clientTypes || ["Kontrola BOZP", "Kontrola OPP", "Školenie BOZP", "Školenie OPP"];
  const klById = (id) => (data.clients || []).find((c) => c.id === id);
  const klVisitsOf = (id) =>
    (data.visits || [])
      .filter((v) => v.client === id)
      .sort((a, b) => (b.date + b.from).localeCompare(a.date + a.from) || b.row - a.row);
  const klOpenDefects = (id) => (data.defects || []).filter((x) => !x.fixed && (!id || x.client === id));
  const klCanWrite = () => data && !data.readOnly && !window.PREVIEW_DATA;
  const klOwnerDash = () => klCanWrite() && !window.APPKA;
  const klDays = (n) => n + (n === 1 ? " deň" : n >= 2 && n <= 4 ? " dni" : " dní");
  const klMin = (m) =>
    m === "" || m == null
      ? ""
      : m >= 60
        ? Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "")
        : m + " min";
  const klNum = (x) => String(x).replace(".", ",");
  function klDeadline(c) {
    if (!c.deadline) return "";
    const days = Math.round((new Date(c.deadline + "T12:00") - new Date(data.today + "T12:00")) / 864e5);
    return (
      '<span class="' +
      (days < 0 ? "kllate" : "") +
      '">zákazka do ' +
      esc(format(c.deadline)) +
      (days < 0 ? " · " + klDays(-days) + " po termíne" : "") +
      "</span>"
    );
  }
  // Ďalší výkon podľa najbližšej otvorenej úlohy „Výkon technika …“ vo Flowii. Ak je v dashboarde zapísaný výkon
  // najviac 45 dní pred termínom úlohy (alebo neskôr), výkon je hotový a čaká sa len na uzavretie úlohy vo Flowii.
  // Pri krátkej periodicite najviac polovica periódy (1M → 15 dní), inak by výkon minulého mesiaca „splnil“ aj ďalšiu úlohu.
  const KL_GROUPS = [
    ["late", "Po termíne"],
    ["week", "Tento týždeň"],
    ["next", "Nasledujúci týždeň"],
    ["later", "Neskôr"],
    ["done", "Výkon zapísaný – uzavri úlohu vo Flowii"],
    ["none", "Bez úlohy vo Flowii"],
  ];
  const klAddDays = (iso, n) => {
    const d = new Date(iso + "T12:00");
    d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  };
  const klDoneWindow = (c) => {
    const m = /^(\d+)M$/.exec(c.period || "");
    return m ? Math.min(45, Math.floor((+m[1] * 30) / 2)) : 45;
  };
  // uplynutý plán bez výkonu: plánovaný deň je za nami a od neho nie je zapísaný žiadny výkon (inak by plán ticho zmizol)
  const klPlanMissed = (c) =>
    c.plan && c.plan.slice(0, 10) < data.today && !klVisitsOf(c.id).some((v) => v.date >= c.plan.slice(0, 10))
      ? c.plan
      : "";
  // Klient bez úlohy vo Flowii: termín podľa uplynutého plánu, budúceho plánu alebo posledného výkonu + periodicita.
  function klNextNoTask(c) {
    const missed = klPlanMissed(c);
    if (missed)
      return {
        group: "late",
        html: '<span class="kllate">plán ' + esc(klPlanText(missed)) + " uplynul · výkon nezapísaný</span>",
      };
    const last = klVisitsOf(c.id)[0],
      m = /^(\d+)M$/.exec(c.period || ""),
      due = c.plan && c.plan.slice(0, 10) >= data.today ? "" : m && last ? klAddMonths(last.date, +m[1]) : "";
    const when = c.plan && c.plan.slice(0, 10) >= data.today ? c.plan.slice(0, 10) : due;
    if (!when) return { group: "none", html: "" };
    const days = Math.round((new Date(when + "T12:00") - new Date(data.today + "T12:00")) / 864e5),
      dow = (new Date(data.today + "T12:00").getDay() + 6) % 7,
      weekEnd = klAddDays(data.today, 6 - dow),
      group = days < 0 ? "late" : when <= weekEnd ? "week" : when <= klAddDays(weekEnd, 7) ? "next" : "later";
    return {
      group,
      days,
      html: due
        ? '<span class="' +
          (days < 0 ? "kllate" : "") +
          '">podľa periodicity ' +
          esc(format(due)) +
          (days < 0 ? " · mešká " + klDays(-days) : "") +
          " · bez úlohy vo Flowii</span>"
        : '<span class="muted">bez úlohy vo Flowii</span>',
    };
  }
  function klNext(c) {
    if (!c.next) return klNextNoTask(c);
    const days = Math.round((new Date(c.next + "T12:00") - new Date(data.today + "T12:00")) / 864e5),
      done = klVisitsOf(c.id).find((v) => v.date >= klAddDays(c.next, -klDoneWindow(c))),
      dow = (new Date(data.today + "T12:00").getDay() + 6) % 7, // 0 = pondelok
      weekEnd = klAddDays(data.today, 6 - dow),
      group = done
        ? "done"
        : days < 0
          ? "late"
          : c.next <= weekEnd
            ? "week"
            : c.next <= klAddDays(weekEnd, 7)
              ? "next"
              : "later",
      wd = CAL_DOW[(new Date(c.next + "T12:00").getDay() + 6) % 7];
    return {
      group,
      days,
      html:
        '<span class="' +
        (group === "late" ? "kllate" : group === "done" ? "kldone" : "") +
        '">' +
        (done
          ? "✓ výkon " + esc(format(done.date)) + " · úloha vo Flowii " + wd + " " + esc(format(c.next))
          : "ďalší výkon " +
            wd +
            " " +
            esc(format(c.next)) +
            (days < 0 ? " · mešká " + klDays(-days) : days === 0 ? " · dnes" : " · o " + klDays(days))) +
        "</span>",
    };
  }
  function klDraftGet(id) {
    try {
      return JSON.parse(localStorage.getItem(KL_DRAFT + id) || "null");
    } catch (e) {
      return null;
    }
  }
  function klDraftSet(id, v) {
    try {
      if (v) localStorage.setItem(KL_DRAFT + id, JSON.stringify(v));
      else localStorage.removeItem(KL_DRAFT + id);
    } catch (e) {}
  }
  const klNewId = () =>
    (window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now() + "-" + Math.random().toString(36).slice(2)) + "";

  /* ---------- záložky ---------- */
  function klView() {
    if (view === "kldefects") return klDefectsView();
    if (view === "kltransfer") return klTransferView();
    if (view === "klhelp") return klHelpView();
    const all = data.clients || [],
      hidden = all.filter((c) => c.hidden).length,
      recent = [
        ...new Set(
          (data.visits || [])
            .slice()
            .sort((a, b) => (b.date + b.recorded).localeCompare(a.date + a.recorded))
            .map((v) => v.client),
        ),
      ]
        .map(klById)
        .filter((c) => c && !c.hidden)
        .slice(0, 4);
    return (
      (data.clientError ? '<div class="error">' + esc(data.clientError) + "</div>" : "") +
      '<div class="filters"><label class="field grow">Vyhľadať klienta<input id="klsearch" type="search" placeholder="Názov, obec, IČO, kontakt" value="' +
      esc(klQuery) +
      '"></label>' +
      (klOwnerDash()
        ? '<div class="field"><span>&nbsp;</span><button class="btn" id="klflowii"' +
          (klLoading ? " disabled" : "") +
          ">" +
          (klLoading ? "Načítavam z Flowii…" : "Načítať z Flowii") +
          "</button></div>"
        : "") +
      "</div>" +
      (hidden
        ? '<label class="checkbox" style="margin:-4px 0 12px"><input type="checkbox" id="klhidden"' +
          (klShowHidden ? " checked" : "") +
          ">Zobraziť aj skrytých klientov (" +
          hidden +
          ")</label>"
        : "") +
      (recent.length && !klQuery
        ? '<div class="quick klrecent"><span class="muted">Naposledy:</span>' +
          recent
            .map((c) => '<button class="btn" data-klcard="' + esc(c.id) + '">' + esc(c.name) + "</button>")
            .join("") +
          "</div>"
        : "") +
      '<section class="panel"><div class="list" id="kllist">' +
      klListHtml() +
      "</div></section>"
    );
  }
  function klListHtml() {
    const q = normalize(klQuery.trim()),
      list = (data.clients || [])
        .filter((c) => klShowHidden || !c.hidden)
        .filter((c) => !q || normalize([c.name, c.city, c.ico, c.person, c.address].join(" ")).includes(q))
        .sort((a, b) => (a.next || "9999").localeCompare(b.next || "9999") || a.name.localeCompare(b.name, "sk"));
    if (!list.length)
      return empty(
        (data.clients || []).length
          ? "Žiadny klient nezodpovedá hľadaniu."
          : klOwnerDash()
            ? "Zatiaľ tu nie sú žiadni klienti. Klikni „Načítať z Flowii“ – načítajú sa klienti zákaziek, kde si zodpovedná osoba."
            : "Zatiaľ tu nie sú žiadni klienti. Načítajú sa v dashboarde na počítači (Načítať z Flowii).",
      );
    const rows = list.map((c) => [c, klNext(c)]);
    return KL_GROUPS.map(([g, title]) => {
      const part = rows.filter(([, n]) => n.group === g);
      return part.length
        ? '<div class="klgroup' +
            (g === "late" ? " late" : "") +
            '">' +
            esc(title) +
            " (" +
            part.length +
            ")</div>" +
            part.map(([c, n]) => klRowHtml(c, n)).join("")
        : "";
    }).join("");
  }
  function klRowHtml(c, n) {
    const open = klOpenDefects(c.id).length,
      last = klVisitsOf(c.id)[0],
      duties = klRemindLines(c),
      late = duties.some((x) => x.flag === "late");
    return (
      '<div class="item klrow' +
      (c.hidden ? " klhid" : "") +
      '"><div><button class="name" data-klcard="' +
      esc(c.id) +
      '">' +
      esc(c.name) +
      "</button><p>" +
      [
        n.html,
        c.plan && c.plan.slice(0, 10) >= data.today
          ? '<span class="klplan">plán ' + esc(klPlanText(c.plan)) + "</span>"
          : c.next && klPlanMissed(c)
            ? '<span class="kllate">plán ' + esc(klPlanText(c.plan)) + " uplynul · výkon nezapísaný</span>"
            : "",
        c.city ? esc(c.city) : "",
        c.subtype ? pill(c.subtype + (c.period ? " · " + c.period : "")) : c.period ? pill(c.period) : "",
        c.hidden ? pill("Skrytý") : "",
      ]
        .filter(Boolean)
        .join(" · ") +
      '</p></div><div class="klright">' +
      (duties.length ? pill("Pamätať: " + duties.length, late ? "danger" : "warn") : "") +
      (open ? pill(open + (open === 1 ? " nedostatok" : open < 5 ? " nedostatky" : " nedostatkov"), "warn") : "") +
      '<small class="muted">' +
      (last ? "naposledy " + esc(format(last.date)) : "bez výkonu") +
      "</small></div></div>"
    );
  }
  function klDefectsView() {
    const open = klOpenDefects(""),
      by = new Map();
    open.forEach((x) => {
      if (!by.has(x.client)) by.set(x.client, []);
      by.get(x.client).push(x);
    });
    return (
      '<p class="muted" style="margin:0 0 12px;font-size:14px">Nedostatky zo všetkých výkonov, ktoré ešte nie sú odstránené. Po odstránení u klienta klikni „Odstránené“.</p>' +
      ([...by.entries()]
        .map(([id, list]) => {
          const c = klById(id);
          return (
            '<section class="panel kldefpanel"><div class="panelhead"><h2><button class="link" data-klcard="' +
            esc(id) +
            '">' +
            esc((c && c.name) || list[0].name) +
            '</button></h2><span class="muted">' +
            list.length +
            '</span></div><div class="list">' +
            list.map(klDefectHtml).join("") +
            "</div></section>"
          );
        })
        .join("") || empty("Žiadne otvorené nedostatky."))
    );
  }
  function klDefectHtml(x) {
    return (
      '<div class="item kldefect"><div><strong>' +
      esc(klDefectPlace(x) + (x.room || "Bez miestnosti")) +
      "</strong><p>" +
      esc(x.text) +
      '</p><small class="muted">zistené ' +
      esc(format(x.date)) +
      (x.fixed ? " · odstránené " + esc(format(x.fixedOn)) : "") +
      "</small></div>" +
      (klCanWrite()
        ? '<div class="quick"><button class="btn" data-kldefedit="' +
          x.row +
          '">Opraviť</button><button class="btn" data-kldefect="' +
          x.row +
          '" data-fix="' +
          (x.fixed ? "0" : "1") +
          '">' +
          (x.fixed ? "Znova otvoriť" : "Odstránené") +
          "</button></div>"
        : "") +
      "</div>"
    );
  }
  // oprava popisu a miestnosti nedostatku (preklep, presnejší popis)
  let klDefEditRow = 0;
  const KL_DEFEDIT_FORM =
    '<div class="panelhead"><h2>Opraviť nedostatok</h2><button class="btn" data-close="kldefeditdlg">Zavrieť</button></div><div class="dialogbody"><form id="kldefeditform" novalidate>' +
    '<label class="field">Miestnosť<input name="room" maxlength="200"></label>' +
    '<label class="field">Popis<textarea name="text" maxlength="2000" rows="3" required></textarea></label>' +
    '<p id="kldefediterror" class="error" hidden role="alert"></p>' +
    '<div class="formfoot"><button type="button" class="btn" data-close="kldefeditdlg">Zavrieť</button><button type="submit" class="btn primary">Uložiť</button></div></form></div>';
  function klDefEditOpen(row) {
    const x = (data.defects || []).find((y) => y.row === +row);
    if (!x || !klCanWrite()) return;
    klDefEditRow = x.row;
    klDialog("kldefeditdlg", KL_DEFEDIT_FORM);
    const e = $("kldefeditform").elements;
    e.room.value = x.room;
    e.text.value = x.text;
    $("kldefediterror").hidden = true;
    $("kldefeditdlg").showModal();
  }
  async function klDefEditSubmit(ev) {
    ev.preventDefault();
    const x = (data.defects || []).find((y) => y.row === klDefEditRow),
      e = $("kldefeditform").elements,
      room = e.room.value.trim(),
      text = e.text.value.trim();
    if (!x || klSaving) return;
    if (!text) {
      $("kldefediterror").textContent = "Doplň popis nedostatku.";
      $("kldefediterror").hidden = false;
      return;
    }
    if (refreshing) {
      $("kldefediterror").textContent = "Ešte obnovujem údaje po uložení, skús to o chvíľu.";
      $("kldefediterror").hidden = false;
      return;
    }
    $("kldefeditdlg").close();
    if (room === x.room && text === x.text) return;
    await klWrite(
      "nedostatokSet",
      { row: x.row, id: x.visit, name: x.name, version: x.version, room, text },
      "Nedostatok opravený.",
    );
  }
  // prevádzka nedostatku = prevádzka jeho výkonu („Reštaurácia 2 · Kuchyňa“)
  function klDefectPlace(x) {
    const v = (data.visits || []).find((y) => y.id === x.visit);
    return v && v.placeName ? v.placeName + " · " : "";
  }
  function klVisitDefects(v) {
    return (data.defects || []).filter((x) => x.visit === v.id);
  }
  // výkon ako text na prepísanie do EcoSunu / EBOZ
  function klVisitText(v) {
    const d = klVisitDefects(v);
    return [
      v.name + (v.placeName ? " – " + v.placeName : ""),
      format(v.date) +
        (v.from ? " " + v.from + (v.to ? "–" + v.to : "") : "") +
        (v.minutes ? " (" + klMin(v.minutes) + ")" : ""),
      v.types,
      v.km !== "" || v.travelMin !== ""
        ? "Cesta: " +
          (v.km !== "" ? klNum(v.km) + " km" : "") +
          (v.travelMin !== "" ? (v.km !== "" ? ", " : "") + klMin(v.travelMin) : "")
        : "",
      v.note ? "Poznámka: " + v.note : "",
      d.length
        ? "Nedostatky:\n" + d.map((x, i) => i + 1 + ". " + (x.room ? x.room + ": " : "") + x.text).join("\n")
        : "Nedostatky: žiadne",
    ]
      .filter(Boolean)
      .join("\n");
  }
  function klVisitHtml(v, withName) {
    const d = klVisitDefects(v),
      can = klCanWrite(),
      mark = (field, label) =>
        can
          ? '<button class="btn' +
            (v[field] ? " klon" : "") +
            '" data-klmark="' +
            v.row +
            '" data-field="' +
            field +
            '" data-on="' +
            (v[field] ? "0" : "1") +
            '" title="' +
            (v[field] ? "Prenesené " + esc(format(v[field])) + " – klik zruší označenie" : "Označiť ako prenesené") +
            '">' +
            (v[field] ? "✓ " : "") +
            label +
            "</button>"
          : v[field]
            ? pill("✓ " + label, "success")
            : "";
    return (
      '<div class="item klvisit"><div class="grow"><strong>' +
      (withName ? '<button class="link" data-klcard="' + esc(v.client) + '">' + esc(v.name) + "</button> · " : "") +
      esc(format(v.date)) +
      (v.from ? " · " + esc(v.from) + (v.to ? "–" + esc(v.to) : "") : "") +
      (v.minutes ? " (" + esc(klMin(v.minutes)) + ")" : "") +
      "</strong><p>" +
      (v.placeName ? "<b>" + esc(v.placeName) + "</b> · " : "") +
      esc(v.types) +
      (v.km !== "" || v.travelMin !== ""
        ? " · cesta " +
          esc(
            [v.km !== "" ? klNum(v.km) + " km" : "", v.travelMin !== "" ? klMin(v.travelMin) : ""]
              .filter(Boolean)
              .join(", "),
          )
        : "") +
      "</p>" +
      (v.note ? '<p class="notes">' + esc(v.note) + "</p>" : "") +
      (d.length
        ? '<ul class="kllist">' +
          d
            .map(
              (x) =>
                "<li" +
                (x.fixed ? ' class="klfixed"' : "") +
                ">" +
                (x.room ? "<b>" + esc(x.room) + ":</b> " : "") +
                esc(x.text) +
                (x.fixed ? " (odstránené)" : "") +
                (can
                  ? ' <span class="kldefbtns"><button class="link" data-kldefedit="' +
                    x.row +
                    '">opraviť</button>' +
                    (x.fixed
                      ? ' · <button class="link" data-kldefect="' + x.row + '" data-fix="0">znova otvoriť</button>'
                      : "") +
                    "</span>"
                  : "") +
                "</li>",
            )
            .join("") +
          "</ul>"
        : '<p class="muted">Bez nedostatkov.</p>') +
      '</div><div class="quick klmarks">' +
      (can ? '<button class="btn" data-kledit="' + v.row + '">Upraviť</button>' : "") +
      mark("ecosun", "V EcoSune") +
      mark("eboz", "V EBOZ") +
      '<button class="btn" data-klcopy="' +
      v.row +
      '">Kopírovať text</button>' +
      "</div></div>"
    );
  }
  function klTransferView() {
    const list = (data.visits || [])
      .filter((v) => !v.ecosun || !v.eboz)
      .sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from) || a.row - b.row);
    return (
      '<p class="muted" style="margin:0 0 12px;font-size:14px">Výkony, ktoré ešte nie sú prenesené do EcoSunu alebo EBOZ (najstaršie hore). Po prepísaní klikni „V EcoSune“ / „V EBOZ“. „Kopírovať text“ skopíruje výkon aj s nedostatkami.</p>' +
      '<section class="panel"><div class="list">' +
      (list.map((v) => klVisitHtml(v, true)).join("") || empty("Všetko je prenesené.")) +
      "</div></section>"
    );
  }

  /* ---------- na čo pamätať (povinnosti klienta) a nápoveda ---------- */
  // šablóny: [text, lehota v mesiacoch ("" = jednorazová úloha)]; lehoty podľa nápovedy, v okne sa dajú zmeniť
  const KL_DUTY_TPL = [
    ["PPP a záznam v požiarnej knihe", 3],
    ["Školenie OPP zamestnancov", 24],
    ["Školenie OPP – osoby v mimopracovnom čase", 12],
    ["Odborná príprava protipožiarnej hliadky", 12],
    ["Cvičný požiarny poplach", 12],
    ["Kontrola dokumentácie OPP", 12],
    ["Kontrola požiarnych zariadení", 12],
    ["Opakované oboznamovanie BOZP", 24],
    ["Pripomenúť: aktualizačná príprava VZV (zabezpečuje klient)", 60],
    ["Doplniť denník uzáverov", ""],
  ];
  let klDutyClient = "",
    klDutyRow = 0;
  function klAddMonths(iso, n) {
    const [y, m, d] = iso.split("-").map(Number),
      t = new Date(y, m - 1 + n, 1, 12),
      last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    return t.getFullYear() + "-" + pad2(t.getMonth() + 1) + "-" + pad2(Math.min(d, last));
  }
  // Aktívne povinnosti klienta s termínom (dueAt) a príznakom: late = po termíne, soon = treba riešiť do ďalšieho
  // výkonu (najmenej 30 dní dopredu); jednorazová úloha a povinnosť bez dátumu sú vždy „soon“.
  function klDutiesOf(c) {
    const limit = [klAddDays(data.today, 30), c.next || ""].sort()[1];
    return (data.duties || [])
      .filter((x) => x.client === c.id && x.state === "active")
      .map((x) => {
        const due = x.due || (x.last && x.months ? klAddMonths(x.last, x.months) : "");
        return Object.assign({}, x, {
          dueAt: due,
          flag: !due ? "soon" : due < data.today ? "late" : due <= limit ? "soon" : "",
        });
      })
      .sort((a, b) => (a.dueAt || "0").localeCompare(b.dueAt || "0") || a.text.localeCompare(b.text, "sk"));
  }
  function klDutyWhen(x) {
    return x.dueAt
      ? (x.dueAt < data.today ? "po termíne od " : "do ") + format(x.dueAt)
      : x.months
        ? "doplň, kedy bolo naposledy"
        : "jednorazová úloha";
  }
  function klDutyHtml(x) {
    return (
      '<div class="item klduty' +
      (x.flag ? " " + x.flag : "") +
      '"><div class="grow"><strong>' +
      esc(x.text) +
      "</strong><p>" +
      esc(
        [klDutyWhen(x), x.months ? "každých " + x.months + " mes." : "", x.last ? "naposledy " + format(x.last) : ""]
          .filter(Boolean)
          .join(" · "),
      ) +
      "</p>" +
      (x.note ? '<p class="notes">' + esc(x.note) + "</p>" : "") +
      "</div>" +
      (klCanWrite()
        ? '<div class="quick klmarks"><button class="btn" data-kldutydone="' +
          x.row +
          '">' +
          (x.months ? "Splnené" : "Hotové") +
          '</button><button class="btn" data-kldutyedit="' +
          x.row +
          '">Upraviť</button></div>'
        : "") +
      "</div>"
    );
  }
  function klDutiesBox(c) {
    const list = klDutiesOf(c),
      train = klTrainRemind(c);
    return (
      '<div class="history klduties"><div class="klhead"><h3>Na čo pamätať' +
      (list.length + train.length ? " · " + (list.length + train.length) : "") +
      '</h3><div class="quick">' +
      (klCanWrite() ? '<button class="btn" data-kldutyadd="' + esc(c.id) + '">+ Pridať</button>' : "") +
      '<button class="btn" data-klhelp="1">Nápoveda</button></div></div>' +
      (list.length + train.length
        ? '<div class="list kllistbox">' +
          train
            .map(
              (t) =>
                '<div class="item klduty ' +
                t.flag +
                '"><div class="grow"><strong>' +
                esc(t.text) +
                "</strong><p>" +
                esc(t.when + " · končí platnosť školenia") +
                "</p></div></div>",
            )
            .join("") +
          list.map(klDutyHtml).join("") +
          "</div>"
        : '<p class="muted">Nič. Pridaj napr. cvičný poplach alebo doplnenie denníka uzáverov; školenia zamestnancov zapisuj nižšie.</p>') +
      klDutiesDoneHtml(c) +
      "</div>"
    );
  }
  // hotové jednorazové úlohy (posledných 5) – omylom označenú sa dá vrátiť medzi aktívne
  function klDutiesDoneHtml(c) {
    const done = (data.duties || [])
      .filter((x) => x.client === c.id && x.state === "done")
      .sort((a, b) => (b.doneOn || "").localeCompare(a.doneOn || "") || b.row - a.row)
      .slice(0, 5);
    if (!done.length) return "";
    return (
      '<details class="kldone-list"><summary class="muted">Hotové úlohy (' +
      done.length +
      ")</summary>" +
      done
        .map(
          (x) =>
            '<div class="item"><div class="grow">' +
            esc(x.text) +
            (x.doneOn ? ' <small class="muted">hotové ' + esc(format(x.doneOn)) + "</small>" : "") +
            "</div>" +
            (klCanWrite() ? '<button class="btn" data-kldutyreopen="' + x.row + '">Vrátiť</button>' : "") +
            "</div>",
        )
        .join("") +
      "</details>"
    );
  }
  const KL_DUTY_FORM =
    '<div class="panelhead"><h2 id="kldutytitle">Na čo pamätať</h2><button class="btn" data-close="klduty">Zavrieť</button></div><div class="dialogbody"><form id="kldutyform" novalidate>' +
    '<p id="kldutyname" style="margin-top:0;font-weight:700"></p>' +
    '<div class="field" id="kldutytplbox"><span>Rýchly výber</span><div class="quick" id="kldutytpl"></div></div>' +
    '<label class="field">Na čo pamätať<input name="text" maxlength="300" required placeholder="napr. Školenie vodičov VZV, Doplniť denník uzáverov"></label>' +
    '<div class="formgrid" style="margin-top:12px">' +
    '<label class="field">Opakovať každých (mesiacov)<input name="months" type="number" min="1" max="120" step="1" inputmode="numeric" placeholder="prázdne = jednorazovo"></label>' +
    '<label class="field">Naposledy<input name="last" type="date"></label>' +
    '<label class="field">Ďalší termín<input name="due" type="date"></label>' +
    "</div>" +
    '<p class="muted">Ďalší termín sa vypočíta z dátumu „naposledy“ a lehoty – vyplň ho len vtedy, ak je iný (napr. dátum z preukazu).</p>' +
    '<label class="field">Poznámka<textarea name="note" maxlength="1000" rows="2" placeholder="napr. 3 vodiči, preukazy u p. Novákovej"></textarea></label>' +
    '<p id="kldutyerror" class="error" hidden role="alert"></p>' +
    '<div class="formfoot"><button type="button" class="btn" id="kldutycancel">Zrušiť povinnosť</button><button type="button" class="btn" data-close="klduty">Zavrieť</button><button type="submit" class="btn primary" id="kldutysave">Uložiť</button></div></form></div>';
  function klDutyOpen(clientId, row) {
    const c = klById(clientId),
      x = row ? (data.duties || []).find((y) => y.row === row && y.state === "active") : null;
    if (!c || !klCanWrite() || (row && !x)) return;
    klDutyClient = clientId;
    klDutyRow = x ? x.row : 0;
    klDialog("klduty", KL_DUTY_FORM);
    const e = $("kldutyform").elements;
    $("kldutytitle").textContent = x ? "Upraviť – na čo pamätať" : "Pridať – na čo pamätať";
    $("kldutyname").textContent = c.name;
    $("kldutytplbox").hidden = !!x;
    $("kldutycancel").hidden = !x;
    $("kldutytpl").innerHTML = KL_DUTY_TPL.map(
      (t, i) => '<button type="button" class="btn" data-kltpl="' + i + '">' + esc(t[0]) + "</button>",
    ).join("");
    e.text.value = x ? x.text : "";
    e.months.value = x ? x.months : "";
    e.last.value = x ? x.last : "";
    e.due.value = x ? x.due : "";
    e.note.value = x ? x.note : "";
    $("kldutyform").dataset.rid = klNewId();
    $("kldutyerror").hidden = true;
    $("kldutysave").disabled = false;
    $("klduty").showModal();
  }
  async function klDutySubmit(ev) {
    ev.preventDefault();
    if (klSaving) return;
    const e = $("kldutyform").elements,
      c = klById(klDutyClient),
      x = klDutyRow ? (data.duties || []).find((y) => y.row === klDutyRow) : null,
      err = (s) => {
        $("kldutyerror").textContent = s;
        $("kldutyerror").hidden = false;
      },
      months = e.months.value.trim();
    if (!c) return;
    if (!e.text.value.trim()) return err("Doplň, na čo treba pamätať.");
    if (months && !(/^\d+$/.test(months) && +months >= 1 && +months <= 120))
      return err("Lehota musí byť 1 až 120 mesiacov.");
    if (e.last.value && e.last.value > data.today) return err("Dátum „naposledy“ nemôže byť v budúcnosti.");
    if (refreshing) return err("Ešte obnovujem údaje po uložení, skús to o chvíľu.");
    const arg = Object.assign(
      x ? { row: x.row, id: x.id, version: x.version } : { requestId: $("kldutyform").dataset.rid, client: c.id },
      {
        name: c.name, // len pre frontu appky (popis zápisu a kontrola riadku)
        text: e.text.value.trim(),
        months: months ? +months : "",
        last: e.last.value,
        due: e.due.value,
        note: e.note.value.trim(),
      },
    );
    klSaving = true;
    $("kldutyerror").hidden = true;
    $("kldutysave").disabled = true;
    try {
      const r = await timedSave("povinnostSave", arg);
      $("klduty").close();
      if (!(r && r.queued)) toast(x ? "Povinnosť upravená." : "Pridané do „Na čo pamätať“.");
      await applySaved(r);
    } catch (e2) {
      err("Uloženie zlyhalo: " + ((e2 && e2.message) || e2));
      $("kldutysave").disabled = false;
    } finally {
      klSaving = false;
    }
  }
  // „Splnené“ s potvrdením: dátum splnenia (predvolene dnes) a pri opakovanej povinnosti ďalší termín – predvyplnený
  // výpočtom z lehoty; ak ho človek nezmení, v tabuľke ostane prázdny (počíta sa z dátumu „naposledy“).
  let klDoneRow = 0;
  const KL_DONE_FORM =
    '<div class="panelhead"><h2>Splnené</h2><button class="btn" data-close="kldutydonedlg">Zavrieť</button></div><div class="dialogbody"><form id="kldutydoneform" novalidate>' +
    '<p id="kldonetext" style="margin-top:0;font-weight:700"></p>' +
    '<div class="formgrid"><label class="field">Kedy splnené<input name="date" type="date" required></label>' +
    '<label class="field" id="kldoneduebox">Ďalší termín<input name="due" type="date"></label></div>' +
    '<p class="muted" id="kldonehint"></p>' +
    '<p id="kldoneerror" class="error" hidden role="alert"></p>' +
    '<div class="formfoot"><button type="button" class="btn" data-close="kldutydonedlg">Zavrieť</button><button type="submit" class="btn primary" id="kldonesave">Potvrdiť splnenie</button></div></form></div>';
  function klDoneOpen(row) {
    const x = (data.duties || []).find((y) => y.row === +row && y.state === "active");
    if (!x || !klCanWrite()) return;
    klDoneRow = x.row;
    klDialog("kldutydonedlg", KL_DONE_FORM);
    const e = $("kldutydoneform").elements;
    $("kldonetext").textContent = x.text;
    e.date.value = data.today;
    e.date.max = data.today;
    $("kldoneduebox").hidden = !x.months;
    e.due.value = x.months ? klAddMonths(data.today, x.months) : "";
    $("kldonehint").textContent = x.months
      ? "Ďalší termín je vypočítaný z lehoty " + x.months + " mes. – zmeň ho len vtedy, ak je iný."
      : "Jednorazová úloha zmizne zo zoznamu „Na čo pamätať“ (omyl sa dá vrátiť v karte klienta).";
    $("kldoneerror").hidden = true;
    $("kldonesave").disabled = false;
    $("kldutydonedlg").showModal();
  }
  function klDoneDateChanged() {
    const x = (data.duties || []).find((y) => y.row === klDoneRow),
      e = $("kldutydoneform").elements;
    if (x && x.months && e.date.value) e.due.value = klAddMonths(e.date.value, x.months);
  }
  async function klDoneSubmit(ev) {
    ev.preventDefault();
    const x = (data.duties || []).find((y) => y.row === klDoneRow && y.state === "active"),
      e = $("kldutydoneform").elements,
      err = (s) => {
        $("kldoneerror").textContent = s;
        $("kldoneerror").hidden = false;
      };
    if (!x || klSaving) return;
    const date = e.date.value,
      calc = x.months && date ? klAddMonths(date, x.months) : "",
      due = x.months && e.due.value !== calc ? e.due.value : "";
    if (!date) return err("Doplň, kedy bolo splnené.");
    if (date > data.today) return err("Dátum splnenia nemôže byť v budúcnosti.");
    if (due && due <= date) return err("Ďalší termín musí byť po dátume splnenia.");
    if (refreshing) return err("Ešte obnovujem údaje po uložení, skús to o chvíľu.");
    $("kldutydonedlg").close();
    await klWrite(
      "povinnostSet",
      { row: x.row, id: x.id, name: x.name, version: x.version, text: x.text, action: "done", date, due },
      x.months ? "Splnené – ďalší termín " + format(due || calc) + "." : "Úloha je hotová.",
    );
  }
  function klDutySet(row, action, btn) {
    const x = (data.duties || []).find((y) => y.row === +row && y.state === (action === "reopen" ? "done" : "active"));
    if (!x) return;
    if (action === "reopen" && !confirm("Vrátiť „" + x.text + "“ medzi aktívne (na čo pamätať)?")) return;
    if (
      action === "cancel" &&
      !confirm("Zrušiť povinnosť „" + x.text + "“? Zo zoznamu zmizne (v tabuľke ostane ako Zrušená).")
    )
      return;
    if (action === "cancel") $("klduty").close();
    klWrite(
      "povinnostSet",
      { row: x.row, id: x.id, name: x.name, version: x.version, text: x.text, action },
      action === "cancel" ? "Povinnosť zrušená." : "Úloha je znova medzi aktívnymi.",
      btn,
    );
  }
  // Nápoveda: lehoty a obsah záznamov podľa predpisov v priečinku Zákony (klient môže určiť kratšie lehoty).
  // Pri novom znení predpisu skontrolovať texty aj šablóny KL_DUTY_TPL.
  const KL_HELP = [
    [
      "Požiarna kniha a preventívne protipožiarne prehliadky (PPP)",
      [
        "<b>PPP každé 3 mesiace</b> – bežné prevádzky (ak štatutár neurčí kratšiu lehotu); <b>6 mesiacov</b> – priestory len s administratívnou činnosťou; <b>12 mesiacov</b> – obytné domy a priestory len s občasnými pracovnými miestami. <i>121/2002 § 14 ods. 1</i>",
        "<b>Čo PPP kontroluje:</b> organizačné zabezpečenie OPP, súlad skutočného stavu s dokumentáciou, stavebné riešenie, zariadenia pre protipožiarny zásah, voľnosť únikových ciest, horľavé látky (výroba, skladovanie, manipulácia), funkčnosť požiarnych zariadení, technické a technologické zariadenia, označenie pracovísk (príkazy, zákazy, pokyny). <i>§ 14 ods. 2</i>",
        "<b>Do požiarnej knihy sa zapisuje</b> najmä: vykonaná PPP, zistené nedostatky a spôsob ich odstránenia, cvičný požiarny poplach, kontrola dokumentácie OPP a výsledok kontroly požiarnych zariadení. <i>§ 29 ods. 1, § 13 ods. 1</i>",
        "<b>Záznam obsahuje:</b> dátum, označenie objektu, zistené skutočnosti (prípadne vykonanú akciu), navrhované opatrenia, podpis vedúceho zamestnanca organizačnej zložky a podpis toho, kto záznam vyhotovil. <i>§ 29 ods. 1</i>",
        "<b>Predloženie:</b> samostatnú požiarnu knihu vedúcemu zložky najmenej raz za 3 mesiace; hlavnú požiarnu knihu štatutárovi raz za 6 mesiacov, a ak treba jeho rozhodnutie o nedostatkoch, bez zbytočného odkladu. <i>§ 29 ods. 3 a 4</i>",
      ],
    ],
    [
      "Ďalšie lehoty OPP",
      [
        "<b>Cvičný požiarny poplach</b> – najmenej raz za 12 mesiacov v objektoch bez jednoduchých podmienok na evakuáciu; zapísať do požiarnej knihy. <i>314/2001 § 5 písm. e), 121/2002 § 29</i>",
        "<b>Kontrola dokumentácie OPP</b> (požiarna identifikačná karta, analýza nebezpečenstva, požiarne poriadky, poplachové smernice, evakuačné plány, zloženie hliadok) – najmenej raz za 12 mesiacov a po každej organizačnej zmene. <i>121/2002 § 31 ods. 3</i>",
        "<b>Požiarne zariadenia</b> – kontrola najmenej raz za 12 mesiacov, výsledok do požiarnej knihy. <i>121/2002 § 13 ods. 1</i>",
      ],
    ],
    [
      "Školenia OPP",
      [
        "<b>Vedúci a ostatní zamestnanci</b> – raz za 24 mesiacov. <i>121/2002 § 21 ods. 1 písm. b)</i>",
        "<b>Osoby zabezpečujúce OPP v mimopracovnom čase</b> – raz za 12 mesiacov, hneď po školení písomný test. <i>§ 21 ods. 1 písm. a), ods. 2</i>",
        "<b>Protipožiarna hliadka pracoviska</b> – odborná príprava raz za 12 mesiacov. <i>§ 23 ods. 4</i>",
        "<b>Novoprijatí zamestnanci</b> – po zaradení na pracovisko, pred začatím práce. Školia sa aj osoby, ktoré v objektoch klienta pracujú pre neho. <i>§ 22 ods. 1, § 20 ods. 3</i>",
      ],
    ],
    [
      "BOZP",
      [
        "<b>Oboznámenie</b> pri prijatí, preložení na iné pracovisko, zmene práce, novej technológii, pracovnom postupe alebo pracovnom prostriedku. <i>124/2006 § 7 ods. 3</i>",
        "<b>Opakované oboznamovanie</b> – v lehote podľa vnútorného predpisu klienta, najmenej raz za 3 roky. Skontroluj, akú lehotu má klient v predpise. <i>§ 7 ods. 5</i>",
        "<b>Odborná spôsobilosť</b> (obsluha motorových vozíkov – VZV, viazač bremien, pracovné plošiny, motorová reťazová píla, lešenár, stavebné stroje…) – aktualizačná odborná príprava do 5 rokov od vydania preukazu a potom každých 5 rokov. <i>124/2006 § 16 ods. 8</i>",
      ],
    ],
    [
      "Pred výkonom",
      [
        "V karte klienta pozri <b>Na čo pamätať</b> (červené = po termíne, oranžové = treba riešiť teraz) a <b>Otvorené nedostatky</b> z minulého výkonu.",
        "Požiarna kniha: zápis PPP; skontroluj, či je zapísaný cvičný poplach a kontrola požiarnych zariadení.",
        "Over platnosť školení a preukazov (VZV, hliadky, mimopracovný čas) – čo chýba, pridaj do „Na čo pamätať“.",
      ],
    ],
  ];
  function klHelpHtml() {
    return (
      KL_HELP.map(
        ([title, items]) =>
          '<section class="panel klhelp"><h3>' +
          esc(title) +
          "</h3><ul>" +
          items.map((t) => "<li>" + t + "</li>").join("") +
          "</ul></section>",
      ).join("") +
      '<p class="muted klhelpsrc">Podľa predpisov v priečinku Zákony: vyhláška 121/2002 Z. z. (znenie od 1. 9. 2015), zákon 314/2001 Z. z. (od 1. 4. 2025), zákon 124/2006 Z. z. (od 1. 7. 2025). Klient môže určiť kratšie lehoty.</p>'
    );
  }
  const klHelpView = () => klHelpHtml();
  function klHelpOpen() {
    const dlg = klDialog(
      "klhelpdlg",
      '<div class="panelhead"><h2>Nápoveda – lehoty a záznamy</h2><button class="btn" data-close="klhelpdlg">Zavrieť</button></div><div class="dialogbody" id="klhelpbody"></div>',
    );
    $("klhelpbody").innerHTML = klHelpHtml();
    dlg.showModal();
  }

  /* ---------- zamestnanci klienta a ich školenia ---------- */
  // šablóny školení: [názov, lehota v mesiacoch]; podľa nápovedy, v okne sa dajú zmeniť
  const KL_TRAIN_TPL = [
    ["Školenie OPP – zamestnanci", 24],
    ["Školenie OPP – vedúci zamestnanci", 24],
    ["Školenie OPP – osoby v mimopracovnom čase", 12],
    ["Odborná príprava protipožiarnej hliadky", 12],
    ["Oboznamovanie BOZP", 36],
  ];
  let klTrainClient = "",
    klEmpRow = 0;
  const klStaff = (c) =>
    (data.employees || []).filter((e) => e.client === c.id).sort((a, b) => a.person.localeCompare(b.person, "sk"));
  const klLimit = (c) => [klAddDays(data.today, 30), c.next || ""].sort()[1];
  // posledné školenie každého druhu u zamestnanca: [{ type, date, months, dueAt, flag }]
  function klEmpTrainings(c, e) {
    const last = new Map(),
      limit = klLimit(c);
    (data.trainings || [])
      .filter((t) => t.employee === e.id)
      .forEach((t) => {
        const was = last.get(t.type);
        if (!was || t.date > was.date || (t.date === was.date && t.row > was.row)) last.set(t.type, t);
      });
    return [...last.values()]
      .map((t) => {
        const dueAt = t.months ? klAddMonths(t.date, t.months) : "";
        return Object.assign({}, t, {
          dueAt,
          flag: !dueAt || e.left ? "" : dueAt < data.today ? "late" : dueAt <= limit ? "soon" : "",
        });
      })
      .sort((a, b) => (a.dueAt || "9999").localeCompare(b.dueAt || "9999"));
  }
  // upozornenia na školenia podľa druhu: [{ text, when, flag, dueAt }] – len zamestnanci, ktorí neodišli
  function klTrainRemind(c) {
    const by = new Map();
    klStaff(c)
      .filter((e) => !e.left)
      .forEach((e) =>
        klEmpTrainings(c, e)
          .filter((t) => t.flag)
          .forEach((t) => {
            if (!by.has(t.type)) by.set(t.type, []);
            by.get(t.type).push({ person: e.person, dueAt: t.dueAt, flag: t.flag });
          }),
      );
    return [...by.entries()]
      .map(([type, list]) => {
        list.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
        const first = list[0].dueAt,
          same = list.every((p) => p.dueAt === first);
        return {
          text: type + ": " + list.map((p) => p.person + (same ? "" : " (" + format(p.dueAt) + ")")).join(", "),
          when: (first < data.today ? "po termíne od " : "do ") + format(first),
          flag: list.some((p) => p.flag === "late") ? "late" : "soon",
          dueAt: first,
        };
      })
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }
  // všetko, na čo treba myslieť pri klientovi (štítok v zozname, formulár výkonu)
  const klRemindLines = (c) =>
    klDutiesOf(c)
      .filter((x) => x.flag)
      .map((x) => ({ text: x.text, when: klDutyWhen(x), flag: x.flag }))
      .concat(klTrainRemind(c));
  function klStaffBox(c) {
    const staff = klStaff(c),
      active = staff.filter((e) => !e.left),
      left = staff.filter((e) => e.left),
      can = klCanWrite();
    return (
      '<div class="history klduties"><div class="klhead"><h3>Zamestnanci a školenia' +
      (active.length ? " · " + active.length : "") +
      "</h3>" +
      (can
        ? '<div class="quick"><button class="btn" data-klstaffadd="' +
          esc(c.id) +
          '">+ Zamestnanci</button><button class="btn" data-kltrain="' +
          esc(c.id) +
          '">Zapísať školenie</button></div>'
        : "") +
      "</div>" +
      (active.length
        ? '<div class="list kllistbox">' +
          active
            .map((e) => {
              const ts = klEmpTrainings(c, e);
              return (
                '<div class="item klemp"><div class="grow"><strong>' +
                esc(e.person) +
                "</strong>" +
                (e.role ? ' <span class="muted">' + esc(e.role) + "</span>" : "") +
                (ts.length
                  ? '<ul class="kllist">' +
                    ts
                      .map(
                        (t) =>
                          '<li class="' +
                          (t.flag === "late" ? "kllate" : t.flag === "soon" ? "klsoon" : "") +
                          '">' +
                          esc(t.type) +
                          " – " +
                          esc(format(t.date)) +
                          (t.dueAt
                            ? " · " + (t.dueAt < data.today ? "platnosť skončila " : "platí do ") + esc(format(t.dueAt))
                            : "") +
                          "</li>",
                      )
                      .join("") +
                    "</ul>"
                  : '<p class="muted">Bez zapísaného školenia.</p>') +
                "</div>" +
                (can ? '<button class="btn" data-klemp="' + e.row + '">Upraviť</button>' : "") +
                "</div>"
              );
            })
            .join("") +
          "</div>"
        : '<p class="muted">Zatiaľ žiadni zamestnanci. Pri „Zapísať školenie“ ich dopíšeš – dashboard potom upozorní, keď sa im bude končiť platnosť školenia.</p>') +
      (left.length
        ? '<p class="muted klleft">Odišli: ' +
          left
            .map((e) =>
              can ? '<button class="link" data-klemp="' + e.row + '">' + esc(e.person) + "</button>" : esc(e.person),
            )
            .join(", ") +
          "</p>"
        : "") +
      "</div>"
    );
  }
  const KL_TRAIN_FORM =
    '<div class="panelhead"><h2>Zapísať školenie</h2><button class="btn" data-close="kltrain">Zavrieť</button></div><div class="dialogbody"><form id="kltrainform" novalidate>' +
    '<p id="kltrainname" style="margin-top:0;font-weight:700"></p>' +
    '<div class="field" id="kltraintplbox"><span>Školenia – vyber všetky, ktoré boli (napr. BOZP aj OPP)</span><div class="quick kltraintpl" id="kltraintpl"></div></div>' +
    '<div id="kltrainkinds"></div>' +
    '<div class="quick"><button type="button" class="btn" id="kltrainadd">+ Iné školenie</button></div>' +
    '<label class="field" style="margin-top:12px">Dátum školenia<input name="date" type="date" required></label>' +
    '<h3 class="klh">Kto bol na školení</h3><div id="kltrainstaff"></div>' +
    '<label class="field" style="margin-top:12px">Noví zamestnanci – každý na nový riadok, funkcia za pomlčkou<textarea name="people" rows="3" placeholder="Meno Priezvisko – funkcia&#10;Meno Priezvisko"></textarea></label>' +
    '<p class="muted" style="margin-top:-4px">Nových zamestnancov bez školenia pridáš tak, že školenie necháš prázdne (odober ho krížikom).</p>' +
    '<label class="field">Poznámka<input name="note" maxlength="500"></label>' +
    '<p id="kltrainerror" class="error" hidden role="alert"></p>' +
    '<div class="formfoot"><button type="button" class="btn" data-close="kltrain">Zavrieť</button><button type="submit" class="btn primary" id="kltrainsave">Uložiť školenie</button></div></form></div>';
  // nové mená z poľa (riadok = zamestnanec, „Meno – funkcia“)
  const klPeopleOf = (txt) =>
    txt
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = /^(.+?)\s+[–-]\s+(.+)$/.exec(l);
        return m ? { name: m[1].trim(), role: m[2].trim() } : { name: l, role: "" };
      });
  // vybrané školenia v okne: riadok = názov + lehota; šablóny sa zapínajú a vypínajú (viac naraz)
  function klTrainKindAdd(type, months) {
    const d = document.createElement("div");
    d.className = "kltrainkind";
    d.innerHTML =
      '<label class="field">Školenie<input class="kltype" maxlength="150"></label>' +
      '<label class="field">Platnosť (mesiacov)<input class="klmonths" type="number" min="1" max="120" step="1" inputmode="numeric" placeholder="bez opakovania"></label>' +
      '<button type="button" class="btn" data-kltrainrm="1" aria-label="Odobrať školenie" title="Odobrať">×</button>';
    d.querySelector(".kltype").value = type;
    d.querySelector(".klmonths").value = months;
    $("kltrainkinds").appendChild(d);
    klTrainSync();
    return d;
  }
  const klTrainRows = () => [...$("kltrainkinds").querySelectorAll(".kltrainkind")];
  function klTrainSync() {
    const names = klTrainRows().map((r) => normalize(r.querySelector(".kltype").value.trim()));
    $("kltraintpl")
      .querySelectorAll("[data-kltraintpl]")
      .forEach((b) => {
        const on = names.includes(normalize(KL_TRAIN_TPL[+b.dataset.kltraintpl][0]));
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on);
      });
  }
  function klTrainTpl(i) {
    const t = KL_TRAIN_TPL[i];
    if (!t) return;
    const rows = klTrainRows(),
      has = rows.find((r) => normalize(r.querySelector(".kltype").value.trim()) === normalize(t[0]));
    if (has) {
      has.remove();
      if (!klTrainRows().length) klTrainKindAdd("", "");
    } else {
      const empty = rows.find((r) => !r.querySelector(".kltype").value.trim());
      if (empty) {
        empty.querySelector(".kltype").value = t[0];
        empty.querySelector(".klmonths").value = t[1];
      } else klTrainKindAdd(t[0], t[1]);
    }
    klTrainSync();
  }
  function klTrainOpen(clientId, pre) {
    const c = klById(clientId);
    if (!c || !klCanWrite()) return;
    klTrainClient = clientId;
    klDialog("kltrain", KL_TRAIN_FORM);
    const e = $("kltrainform").elements,
      active = klStaff(c).filter((x) => !x.left),
      tpls = [...new Set((pre && pre.tpls) || [])];
    $("kltrainname").textContent = c.name;
    $("kltraintpl").innerHTML = KL_TRAIN_TPL.map(
      (t, i) =>
        '<button type="button" class="btn" aria-pressed="false" data-kltraintpl="' + i + '">' + esc(t[0]) + "</button>",
    ).join("");
    $("kltrainkinds").innerHTML = "";
    if (!(pre && pre.noTrain)) klTrainKindAdd("", "");
    else klTrainSync();
    tpls.forEach(klTrainTpl);
    e.date.value = (pre && pre.date) || data.today;
    e.people.value = "";
    e.note.value = "";
    $("kltrainstaff").innerHTML = active.length
      ? '<label class="checkbox"><input type="checkbox" id="kltrainall">Označiť všetkých</label><div class="kltrainstaff">' +
        active
          .map(
            (x) =>
              '<label class="checkbox"><input type="checkbox" class="kltrainemp" value="' +
              esc(x.id) +
              '">' +
              esc(x.person) +
              (x.role ? ' <span class="muted">' + esc(x.role) + "</span>" : "") +
              "</label>",
          )
          .join("") +
        "</div>"
      : '<p class="muted">Zatiaľ nikto – dopíš mená nižšie.</p>';
    $("kltrainform").dataset.rid = klNewId();
    $("kltrainerror").hidden = true;
    $("kltrainsave").disabled = false;
    $("kltrain").showModal();
  }
  async function klTrainSubmit(ev) {
    ev.preventDefault();
    if (klSaving) return;
    const e = $("kltrainform").elements,
      c = klById(klTrainClient),
      err = (s) => {
        $("kltrainerror").textContent = s;
        $("kltrainerror").hidden = false;
      },
      kinds = klTrainRows()
        .map((r) => ({
          type: r.querySelector(".kltype").value.trim(),
          months: r.querySelector(".klmonths").value.trim(),
        }))
        .filter((k) => k.type || k.months),
      ids = [...$("kltrainstaff").querySelectorAll(".kltrainemp:checked")].map((i) => i.value),
      people = klPeopleOf(e.people.value);
    if (!c) return;
    // bez školenia = len noví zamestnanci (školenie sa zapíše neskôr)
    if (!kinds.length && (ids.length || !people.length))
      return err("Vyber alebo napíš školenie. Bez školenia sa dajú uložiť len novo dopísaní zamestnanci.");
    if (kinds.some((k) => !k.type)) return err("Doplň názov školenia (alebo riadok odober krížikom).");
    if (kinds.some((k) => k.months && !(/^\d+$/.test(k.months) && +k.months >= 1 && +k.months <= 120)))
      return err("Platnosť musí byť 1 až 120 mesiacov.");
    if (new Set(kinds.map((k) => normalize(k.type))).size < kinds.length) return err("Školenie je v zozname dvakrát.");
    if (kinds.length && !e.date.value) return err("Doplň dátum školenia.");
    if (e.date.value > data.today) return err("Dátum školenia nemôže byť v budúcnosti.");
    if (!ids.length && !people.length) return err("Zaškrtni zamestnancov alebo dopíš nových.");
    const known = new Map(klStaff(c).map((x) => [normalize(x.person), x])),
      twice = people.find((p) => known.has(normalize(p.name)));
    if (twice)
      return err(
        "„" +
          twice.name +
          "“ už v zozname je" +
          (known.get(normalize(twice.name)).left ? " (medzi tými, čo odišli – vráť ho v Upraviť)" : " – zaškrtni ho") +
          ".",
      );
    if (refreshing) return err("Ešte obnovujem údaje po uložení, skús to o chvíľu.");
    klSaving = true;
    $("kltrainerror").hidden = true;
    $("kltrainsave").disabled = true;
    try {
      const r = await timedSave("skolenieSave", {
        requestId: $("kltrainform").dataset.rid,
        client: c.id,
        name: c.name, // len pre frontu appky (popis zápisu)
        types: kinds.map((k) => ({ type: k.type, months: k.months ? +k.months : "" })),
        date: kinds.length ? e.date.value : "",
        employees: ids,
        newPeople: people,
        note: e.note.value.trim(),
      });
      $("kltrain").close();
      if (!(r && r.queued))
        toast(
          (!kinds.length
            ? "Zamestnanci pridaní bez školenia: "
            : kinds.length > 1
              ? "Školenia zapísané (" + kinds.length + "): "
              : "Školenie zapísané: ") +
            (ids.length + people.length) +
            " zam." +
            (r && r.duplicate ? " (už bolo uložené skôr)" : ""),
        );
      await applySaved(r);
    } catch (e2) {
      err("Uloženie zlyhalo: " + ((e2 && e2.message) || e2));
      $("kltrainsave").disabled = false;
    } finally {
      klSaving = false;
    }
  }
  const KL_EMP_FORM =
    '<div class="panelhead"><h2>Zamestnanec</h2><button class="btn" data-close="klemp">Zavrieť</button></div><div class="dialogbody"><form id="klempform" novalidate>' +
    '<div class="formgrid"><label class="field">Meno<input name="person" maxlength="120" required></label>' +
    '<label class="field">Funkcia<input name="role" maxlength="120"></label></div>' +
    '<label class="checkbox" style="margin-top:12px"><input type="checkbox" name="left">Odišiel od klienta (nebude sa naňho upozorňovať)</label>' +
    '<h3 class="klh">Školenia</h3><div id="klemptrain"></div>' +
    '<p id="klemperror" class="error" hidden role="alert"></p>' +
    '<div class="formfoot"><button type="button" class="btn" data-close="klemp">Zavrieť</button><button type="submit" class="btn primary" id="klempsave">Uložiť</button></div></form></div>';
  function klEmpOpen(row) {
    const x = (data.employees || []).find((y) => y.row === +row);
    if (!x || !klCanWrite()) return;
    klEmpRow = x.row;
    klDialog("klemp", KL_EMP_FORM);
    const e = $("klempform").elements,
      ts = (data.trainings || [])
        .filter((t) => t.employee === x.id)
        .sort((a, b) => b.date.localeCompare(a.date) || b.row - a.row);
    e.person.value = x.person;
    e.role.value = x.role;
    e.left.checked = x.left;
    $("klemptrain").innerHTML = ts.length
      ? '<div class="list kllistbox">' +
        ts
          .map(
            (t) =>
              '<div class="item"><div class="grow">' +
              esc(t.type) +
              " – " +
              esc(format(t.date)) +
              (t.months ? ' <span class="muted">(platnosť ' + t.months + " mes.)</span>" : "") +
              (t.note ? '<p class="muted">' + esc(t.note) + "</p>" : "") +
              '</div><div class="quick"><button type="button" class="btn" data-kltrainedit="' +
              t.row +
              '">Upraviť</button><button type="button" class="btn" data-kltrainzrus="' +
              t.row +
              '">Zrušiť</button></div></div>',
          )
          .join("") +
        "</div>"
      : '<p class="muted">Zatiaľ žiadne.</p>';
    $("klemperror").hidden = true;
    $("klempsave").disabled = false;
    $("klemp").showModal();
  }
  async function klEmpSubmit(ev) {
    ev.preventDefault();
    if (klSaving) return;
    const e = $("klempform").elements,
      x = (data.employees || []).find((y) => y.row === klEmpRow),
      err = (s) => {
        $("klemperror").textContent = s;
        $("klemperror").hidden = false;
      };
    if (!x) return;
    if (!e.person.value.trim()) return err("Doplň meno zamestnanca.");
    if (refreshing) return err("Ešte obnovujem údaje po uložení, skús to o chvíľu.");
    klSaving = true;
    $("klempsave").disabled = true;
    try {
      const r = await timedSave("zamestnanecSet", {
        row: x.row,
        id: x.id,
        name: x.name,
        version: x.version,
        person: e.person.value.trim(),
        role: e.role.value.trim(),
        left: e.left.checked,
      });
      $("klemp").close();
      if (!(r && r.queued)) toast("Zamestnanec uložený.");
      await applySaved(r);
    } catch (e2) {
      err("Uloženie zlyhalo: " + ((e2 && e2.message) || e2));
      $("klempsave").disabled = false;
    } finally {
      klSaving = false;
    }
  }
  // úprava zapísaného školenia (druh, dátum, platnosť, poznámka) – „Platí do“ prepočíta server
  let klTrainEditRow = 0;
  const KL_TRAINEDIT_FORM =
    '<div class="panelhead"><h2>Upraviť školenie</h2><button class="btn" data-close="kltraineditdlg">Zavrieť</button></div><div class="dialogbody"><form id="kltraineditform" novalidate>' +
    '<p id="kltraineditwho" style="margin-top:0;font-weight:700"></p>' +
    '<label class="field">Školenie<input name="type" maxlength="150" required></label>' +
    '<div class="formgrid"><label class="field">Dátum školenia<input name="date" type="date" required></label>' +
    '<label class="field">Platnosť (mesiacov)<input name="months" type="number" min="1" max="120" step="1" inputmode="numeric" placeholder="bez opakovania"></label></div>' +
    '<label class="field">Poznámka<input name="note" maxlength="500"></label>' +
    '<p id="kltrainediterror" class="error" hidden role="alert"></p>' +
    '<div class="formfoot"><button type="button" class="btn" data-close="kltraineditdlg">Zavrieť</button><button type="submit" class="btn primary">Uložiť</button></div></form></div>';
  function klTrainEditOpen(row) {
    const t = (data.trainings || []).find((y) => y.row === +row);
    if (!t || !klCanWrite()) return;
    klTrainEditRow = t.row;
    if ($("klemp") && $("klemp").open) $("klemp").close();
    klDialog("kltraineditdlg", KL_TRAINEDIT_FORM);
    const e = $("kltraineditform").elements;
    $("kltraineditwho").textContent = t.person;
    e.type.value = t.type;
    e.date.value = t.date;
    e.date.max = data.today;
    e.months.value = t.months;
    e.note.value = t.note;
    $("kltrainediterror").hidden = true;
    $("kltraineditdlg").showModal();
  }
  async function klTrainEditSubmit(ev) {
    ev.preventDefault();
    const t = (data.trainings || []).find((y) => y.row === klTrainEditRow),
      e = $("kltraineditform").elements,
      months = e.months.value.trim(),
      err = (s) => {
        $("kltrainediterror").textContent = s;
        $("kltrainediterror").hidden = false;
      };
    if (!t || klSaving) return;
    if (!e.type.value.trim()) return err("Doplň názov školenia.");
    if (!e.date.value) return err("Doplň dátum školenia.");
    if (e.date.value > data.today) return err("Dátum školenia nemôže byť v budúcnosti.");
    if (months && !(/^\d+$/.test(months) && +months >= 1 && +months <= 120))
      return err("Platnosť musí byť 1 až 120 mesiacov.");
    if (refreshing) return err("Ešte obnovujem údaje po uložení, skús to o chvíľu.");
    $("kltraineditdlg").close();
    await klWrite(
      "skolenieUprav",
      {
        row: t.row,
        id: t.id,
        name: t.name,
        version: t.version,
        person: t.person,
        type: e.type.value.trim(),
        date: e.date.value,
        months: months ? +months : "",
        note: e.note.value.trim(),
      },
      "Školenie upravené.",
    );
  }
  function klTrainCancel(row, btn) {
    const t = (data.trainings || []).find((y) => y.row === +row);
    if (!t || !confirm("Zrušiť omylom zapísané školenie „" + t.type + "“ z " + format(t.date) + " (" + t.person + ")?"))
      return;
    $("klemp").close();
    klWrite(
      "skolenieZrus",
      { row: t.row, id: t.id, name: t.name, version: t.version, person: t.person, type: t.type },
      "Školenie zrušené.",
      btn,
    );
  }

  /* ---------- plán výkonu a kalendár v karte klienta ----------
     Plán = hárok Klienti R (termín) a S (poznámka); budúci plán je v Google kalendári „Výkony BOZP a OPP“
     (src/Kalendar.js, obojsmerne). Kalendár v karte ukazuje ukážky EnSafe aj výkony všetkých klientov;
     klik na deň otvorí plán výkonu. Otvorenie kalendára sa pamätá (localStorage ensafe-klcal). */
  let klCalOpen = false,
    klCalMonth = "",
    klCalFor = "";
  try {
    klCalOpen = localStorage.getItem("ensafe-klcal") === "1";
  } catch (e) {}
  function klPlanText(iso) {
    const wd = CAL_DOW[(new Date(iso.slice(0, 10) + "T12:00").getDay() + 6) % 7],
      t = calTime(iso);
    return wd + " " + format(iso.slice(0, 10)) + (t ? " " + t.replace(/^0/, "") : " (celý deň)");
  }
  function klPlanBox(c) {
    const has = c.plan && c.plan.slice(0, 10) >= data.today,
      missed = klPlanMissed(c),
      can = klCanWrite();
    return (
      '<div class="klplanbox"><div class="grow">' +
      (has
        ? "<strong>Plánovaný výkon: " +
          esc(klPlanText(c.plan)) +
          (klPlaceById(c.planPlace) ? " – " + esc(klPlaceById(c.planPlace).place) : "") +
          '</strong><small class="muted">v Google kalendári „Výkony BOZP a OPP“</small>'
        : missed
          ? '<strong class="kllate">Plánovaný výkon ' +
            esc(klPlanText(missed)) +
            ' uplynul – výkon nie je zapísaný</strong><small class="muted">zapíš výkon alebo ho naplánuj znova' +
            (c.next ? " · termín podľa Flowii " + esc(format(c.next)) : "") +
            "</small>"
          : "<strong>Výkon nie je naplánovaný</strong>" +
            (c.next ? '<small class="muted">termín podľa Flowii ' + esc(format(c.next)) + "</small>" : "")) +
      (c.planNote ? '<p class="notes">' + esc(c.planNote) + "</p>" : "") +
      '</div><div class="quick">' +
      (can
        ? '<button class="btn" data-klplan="' +
          esc(c.id) +
          '">' +
          (has ? "Zmeniť plán" : "Naplánovať výkon") +
          "</button>"
        : "") +
      '<button class="btn" data-klcaltoggle="1">' +
      (klCalOpen ? "Skryť kalendár" : "Kalendár výkonov") +
      "</button></div></div>" +
      (klCalOpen ? klCalCardHtml(c) : "")
    );
  }
  function klCalCardHtml(c) {
    if (klCalFor !== c.id || !klCalMonth) {
      klCalFor = c.id;
      // začne mesiacom plánu, inak termínu z Flowii (ak je dopredu), inak tento mesiac
      klCalMonth = (
        c.plan && c.plan >= data.today ? c.plan : c.next && c.next >= data.today ? c.next : data.today
      ).slice(0, 7);
    }
    const g = calGrid(klCalMonth, null, null, c);
    return (
      '<section class="calcard"><div class="calhead"><button type="button" class="btn" data-klcalnav="-1" aria-label="Predchádzajúci mesiac">‹</button><h3>' +
      CAL_MONTHS[g.m - 1] +
      " " +
      g.y +
      '</h3><button type="button" class="btn" data-klcalnav="1" aria-label="Nasledujúci mesiac">›</button>' +
      (klCalMonth !== data.today.slice(0, 7)
        ? '<button type="button" class="btn" data-klcalnav="0">Tento mesiac</button>'
        : "") +
      '</div><div class="calgrid">' +
      g.cells +
      '</div><p class="muted">Ukážky EnSafe (zelené) a výkony všetkých klientov (modré) s časom a obcou.' +
      (klCanWrite() ? " Klikni na číslo dňa – otvorí sa plán výkonu na ten deň." : "") +
      "</p></section>"
    );
  }
  function klCalToggle() {
    klCalOpen = !klCalOpen;
    try {
      localStorage.setItem("ensafe-klcal", klCalOpen ? "1" : "0");
    } catch (e) {}
    if (klCardId) klCard(klCardId);
  }
  function klCalShift(n) {
    if (!n) klCalMonth = data.today.slice(0, 7);
    else {
      const [y, m] = klCalMonth.split("-").map(Number),
        x = new Date(y, m - 1 + n, 1);
      klCalMonth = x.getFullYear() + "-" + pad2(x.getMonth() + 1);
    }
    if (klCardId) klCard(klCardId);
  }
  const KL_PLAN_FORM =
    '<div class="panelhead"><h2>Plán výkonu</h2><button class="btn" data-close="klplandlg">Zavrieť</button></div><div class="dialogbody"><form id="klplanform" novalidate>' +
    '<p id="klplanname" style="margin-top:0;font-weight:700"></p><p id="klplanflowii" class="muted"></p>' +
    '<div class="formgrid"><label class="field">Dátum<input name="date" type="date" required></label>' +
    '<label class="field">Čas<input name="time" type="time"><small class="muted">prázdne = celý deň</small></label></div>' +
    '<label class="field" id="klplanplacebox" style="margin-top:12px">Prevádzka<select name="place"></select></label>' +
    '<div id="klplanday" class="klplanday"></div>' +
    '<label class="field" style="margin-top:12px">Poznámka k plánu<textarea name="note" maxlength="5000" rows="3" placeholder="napr. Kontrola OPP + školenie vodičov VZV, vziať požiarnu knihu"></textarea></label>' +
    '<p id="klplanerror" class="error" hidden role="alert"></p>' +
    '<div class="formfoot"><button type="button" class="btn" id="klplancancel">Zrušiť plán</button><button type="button" class="btn" data-close="klplandlg">Zavrieť</button><button type="submit" class="btn primary" id="klplansave">Uložiť plán</button></div></form></div>';
  let klPlanFor = "";
  function klPlanOpen(id, iso) {
    const c = klById(id);
    if (!c || !klCanWrite()) return;
    klPlanFor = id;
    klDialog("klplandlg", KL_PLAN_FORM);
    const e = $("klplanform").elements,
      has = c.plan && c.plan.slice(0, 10) >= data.today;
    $("klplanname").textContent = c.name;
    $("klplanflowii").textContent = c.next
      ? "Termín podľa Flowii: " + format(c.next) + (c.task ? " – " + c.task : "")
      : "Vo Flowii nie je úloha „Výkon“.";
    e.date.value = iso || (has ? c.plan.slice(0, 10) : c.next && c.next >= data.today ? c.next : "");
    e.time.value = has && !iso ? calTime(c.plan) : has && iso ? calTime(c.plan) || "08:00" : "08:00";
    e.note.value = c.planNote || "";
    klPlaceSelect(e.place, $("klplanplacebox"), c, has ? c.planPlace : klLastPlace(c));
    $("klplancancel").hidden = !has;
    $("klplanerror").hidden = true;
    $("klplansave").disabled = false;
    klPlanDay();
    $("klplandlg").showModal();
  }
  // čo už je v zvolený deň: ukážky EnSafe a výkony iných klientov
  function klPlanDay() {
    const box = $("klplanday"),
      iso = $("klplanform").elements.date.value;
    if (!box) return;
    if (!iso) return void (box.innerHTML = "");
    const items = appointments()
      .filter((d) => d.appointment.slice(0, 10) === iso)
      .map((d) => [calTime(d.appointment), "Ukážka – " + d.name + (d.city ? ", " + d.city : "")])
      .concat(
        klPlans()
          .filter((c) => c.id !== klPlanFor && c.plan.slice(0, 10) === iso)
          .map((c) => [calTime(c.plan), "Výkon – " + c.name + (c.city ? ", " + c.city : "")]),
      )
      .sort((a, b) => (a[0] || "").localeCompare(b[0] || ""));
    box.innerHTML = items.length
      ? "<strong>V ten deň už je:</strong><ul>" +
        items.map(([t, x]) => "<li>" + (t ? "<b>" + t + "</b> " : "celý deň – ") + esc(x) + "</li>").join("") +
        "</ul>"
      : '<span class="muted">V ten deň nie je naplánovaná žiadna ukážka ani výkon.</span>';
  }
  async function klPlanSend(c, start, note, okMsg, btn) {
    if (refreshing) throw new Error("Ešte obnovujem údaje po uložení, skús to o chvíľu.");
    klSaving = true;
    if (btn) btn.disabled = true;
    try {
      const place = start ? $("klplanform").elements.place.value : "";
      const r = await timedSave("vykonPlan", {
        row: c.row,
        id: c.id,
        version: c.version,
        name: c.name,
        start,
        note,
        place,
      });
      $("klplandlg").close();
      if (!(r && r.queued)) toast(okMsg);
      await applySaved(r);
    } finally {
      klSaving = false;
      if (btn) btn.disabled = false;
    }
  }
  async function klPlanSubmit(ev) {
    ev.preventDefault();
    if (klSaving) return;
    const e = $("klplanform").elements,
      c = klById(klPlanFor),
      err = (s) => {
        $("klplanerror").textContent = s;
        $("klplanerror").hidden = false;
      };
    if (!c) return;
    if (!e.date.value) return err("Doplň dátum výkonu.");
    if (e.date.value < data.today) return err("Termín výkonu nemôže byť v minulosti.");
    const start = e.date.value + "T" + (e.time.value || "00:00");
    try {
      await klPlanSend(
        c,
        start,
        e.note.value.trim(),
        "Výkon naplánovaný na " + klPlanText(start) + ".",
        $("klplansave"),
      );
    } catch (e2) {
      err("Uloženie zlyhalo: " + ((e2 && e2.message) || e2));
    }
  }
  async function klPlanCancel(btn) {
    const c = klById(klPlanFor);
    if (!c || klSaving || !confirm("Zrušiť plánovaný výkon " + klPlanText(c.plan) + "? Zmizne aj z Google kalendára."))
      return;
    try {
      await klPlanSend(c, "", $("klplanform").elements.note.value.trim(), "Plán výkonu je zrušený.", btn);
    } catch (e2) {
      $("klplanerror").textContent = "Uloženie zlyhalo: " + ((e2 && e2.message) || e2);
      $("klplanerror").hidden = false;
    }
  }

  /* ---------- prevádzky klienta (miesto výkonu; len v dashboarde, do Flowii sa nič nezapisuje) ---------- */
  const klPlacesOf = (id) =>
    (data.places || []).filter((x) => x.client === id).sort((a, b) => a.place.localeCompare(b.place, "sk"));
  const klPlaceById = (id) => (id && (data.places || []).find((x) => x.id === id)) || null;
  // prevádzka posledného výkonu (ak ešte existuje)
  function klLastPlace(c) {
    const v = klVisitsOf(c.id).find((x) => x.place);
    return v && klPlaceById(v.place) ? v.place : "";
  }
  // výber prevádzky vo formulári; klient bez prevádzok = pole sa skryje
  // keep = {id, name} doterajšej prevádzky upravovaného výkonu – ponúkne sa aj vtedy, keď je medzitým zrušená,
  // aby úprava (napr. poznámky) prevádzku výkonu potichu nevymazala
  function klPlaceSelect(sel, box, c, value, keep) {
    const list = c ? klPlacesOf(c.id) : [];
    if (keep && keep.id && keep.name && !list.some((x) => x.id === keep.id))
      list.push({ id: keep.id, place: keep.name + " (zrušená prevádzka)" });
    box.hidden = !list.length;
    sel.innerHTML =
      '<option value="">' +
      esc("Adresa klienta" + (c && c.address ? " – " + c.address : "")) +
      "</option>" +
      list
        .map(
          (x) =>
            '<option value="' +
            esc(x.id) +
            '">' +
            esc(x.place + (x.address || x.city ? " – " + [x.address, x.city].filter(Boolean).join(", ") : "")) +
            "</option>",
        )
        .join("");
    sel.value = list.some((x) => x.id === value) ? value : "";
  }
  const klPlaceWhere = (x) =>
    x.city &&
    !String(x.address || "")
      .toLowerCase()
      .includes(x.city.toLowerCase())
      ? [x.address, x.city].filter(Boolean).join(", ")
      : x.address || x.city || "";
  // odkaz na mapu (navigácia): poloha, inak adresa
  const klPlaceMap = (x) =>
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(x.lat != null ? x.lat + "," + x.lng : klPlaceWhere(x) + ", Slovensko");
  const KL_GEO = { adresa: "", obec: "poloha len podľa obce", ručne: "poloha ručne", nenájdené: "poloha nenájdená" };
  function klPlacesBox(c) {
    const list = klPlacesOf(c.id),
      can = klCanWrite();
    if (!list.length && !can) return "";
    return (
      '<div class="history klplaces"><h3>Prevádzky' +
      (list.length ? " · " + list.length : "") +
      "</h3>" +
      (list.length
        ? '<div class="list kllistbox">' +
          list
            .map(
              (x) =>
                '<div class="item"><div class="grow"><strong>' +
                esc(x.place) +
                "</strong>" +
                line(
                  "place",
                  '<a href="' +
                    esc(klPlaceMap(x)) +
                    '" target="_blank" rel="noopener">' +
                    esc(klPlaceWhere(x)) +
                    "</a>" +
                    (KL_GEO[x.geo] ? ' <small class="muted">(' + esc(KL_GEO[x.geo]) + ")</small>" : ""),
                ) +
                (x.person || x.phone
                  ? "<p>" +
                    esc(x.person || "") +
                    (x.phone
                      ? (x.person ? " · " : "") +
                        '<a href="tel:' +
                        esc(x.phone.replace(/[^\d+]/g, "")) +
                        '">' +
                        esc(x.phone) +
                        "</a>"
                      : "") +
                    "</p>"
                  : "") +
                (x.note ? '<p class="notes">' + esc(x.note) + "</p>" : "") +
                "</div>" +
                (can ? '<button class="btn" data-klplaceedit="' + x.row + '">Upraviť</button>' : "") +
                "</div>",
            )
            .join("") +
          "</div>"
        : '<p class="muted">Výkon sa robí na adrese klienta. Ak chodíš inam (alebo na viac miest), pridaj prevádzku.</p>') +
      (can ? '<button class="btn" data-klplaceadd="' + esc(c.id) + '">+ Pridať prevádzku</button>' : "") +
      "</div>"
    );
  }
  const KL_PLACE_FORM =
    '<div class="panelhead"><h2 id="klplacetitle">Prevádzka</h2><button class="btn" data-close="klplacedlg">Zavrieť</button></div><div class="dialogbody"><form id="klplaceform" novalidate>' +
    '<p id="klplacename" style="margin-top:0;font-weight:700"></p>' +
    '<label class="field">Názov prevádzky<input name="place" maxlength="150" required placeholder="napr. Reštaurácia Pod hradom"></label>' +
    '<div class="formgrid" style="margin-top:12px"><label class="field">Adresa<input name="address" maxlength="300" placeholder="Ulica a číslo"></label>' +
    '<label class="field">Obec<input name="city" maxlength="100"></label>' +
    '<label class="field">Kontaktná osoba na prevádzke<input name="person" maxlength="150"></label>' +
    '<label class="field">Telefón<input name="phone" maxlength="100" inputmode="tel"></label></div>' +
    '<label class="field" style="margin-top:12px">Poznámka<textarea name="note" maxlength="2000" rows="2" placeholder="napr. vchod zo dvora, kľúče u vedúcej"></textarea></label>' +
    '<details style="margin-top:12px"><summary>Poloha ručne</summary><p class="muted">Poloha sa dohľadá podľa adresy sama. Ak je nepresná, vlož súradnice z Google Máp (pravý klik na miesto → prvý riadok), napr. 49.2093, 19.3012.</p>' +
    '<label class="field">Zemepisná šírka, dĺžka<input name="pos" maxlength="60" inputmode="decimal" placeholder="49.2093, 19.3012"></label></details>' +
    '<p id="klplaceerror" class="error" hidden role="alert"></p>' +
    '<div class="formfoot"><button type="button" class="btn" id="klplacecancel">Zrušiť prevádzku</button><button type="button" class="btn" data-close="klplacedlg">Zavrieť</button><button type="submit" class="btn primary" id="klplacesave">Uložiť</button></div></form></div>';
  let klPlaceCtx = null; // { client, row } – row = 0 nová prevádzka
  const klPosText = (x) => (x && x.lat != null ? x.lat + ", " + x.lng : "");
  function klPlaceOpen(clientId, row) {
    const c = klById(clientId),
      x = row ? (data.places || []).find((y) => y.row === +row) : null;
    if (!c || !klCanWrite() || (row && !x)) return;
    klPlaceCtx = { client: c.id, row: x ? x.row : 0 };
    klDialog("klplacedlg", KL_PLACE_FORM);
    const e = $("klplaceform").elements;
    $("klplacetitle").textContent = x ? "Upraviť prevádzku" : "Nová prevádzka";
    $("klplacename").textContent = c.name;
    ["place", "address", "city", "person", "phone", "note"].forEach((k) => (e[k].value = x ? x[k] || "" : ""));
    if (!x) e.city.value = c.city || "";
    e.pos.value = klPosText(x);
    e.pos.dataset.was = e.pos.value;
    $("klplaceform").dataset.rid = klNewId();
    $("klplacecancel").hidden = !x;
    $("klplaceerror").hidden = true;
    $("klplacesave").disabled = false;
    $("klplacedlg").showModal();
  }
  async function klPlaceSend(arg, okMsg, btn) {
    if (refreshing) throw new Error("Ešte obnovujem údaje po uložení, skús to o chvíľu.");
    klSaving = true;
    if (btn) btn.disabled = true;
    try {
      const r = await timedSave("prevadzkaSave", arg);
      $("klplacedlg").close();
      if (!(r && r.queued))
        toast(okMsg + (r && r.geo === "nenájdené" ? " Polohu sa podľa adresy nepodarilo nájsť." : ""));
      await applySaved(r);
    } finally {
      klSaving = false;
      if (btn) btn.disabled = false;
    }
  }
  async function klPlaceSubmit(ev) {
    ev.preventDefault();
    if (klSaving || !klPlaceCtx) return;
    const e = $("klplaceform").elements,
      c = klById(klPlaceCtx.client),
      x = klPlaceCtx.row ? (data.places || []).find((y) => y.row === klPlaceCtx.row) : null,
      err = (s2) => {
        $("klplaceerror").textContent = s2;
        $("klplaceerror").hidden = false;
      };
    if (!c || (klPlaceCtx.row && !x)) return err("Prevádzka sa medzičasom zmenila. Zavri okno a obnov dashboard.");
    const v = {};
    ["place", "address", "city", "person", "phone", "note"].forEach((k) => (v[k] = e[k].value.trim()));
    if (!v.place) return err("Doplň názov prevádzky.");
    if (!v.address && !v.city) return err("Doplň adresu alebo obec prevádzky.");
    const pos = e.pos.value.trim();
    // poloha sa pošle len zmenená (inak by sa dohľadaná poloha zapísala ako ručná)
    if (pos !== e.pos.dataset.was && pos) {
      const m = /^\s*(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*$/.exec(pos);
      if (!m) return err("Polohu zadaj ako dve čísla, napr. 49.2093, 19.3012.");
      v.lat = +m[1].replace(",", ".");
      v.lng = +m[2].replace(",", ".");
    }
    const arg = x
      ? Object.assign({ row: x.row, id: x.id, version: x.version, name: x.name }, v)
      : Object.assign({ client: c.id, name: c.name, requestId: $("klplaceform").dataset.rid }, v);
    try {
      await klPlaceSend(arg, x ? "Prevádzka uložená." : "Prevádzka pridaná.", $("klplacesave"));
    } catch (e2) {
      err("Uloženie zlyhalo: " + ((e2 && e2.message) || e2));
    }
  }
  async function klPlaceCancel(btn) {
    const x = klPlaceCtx && (data.places || []).find((y) => y.row === klPlaceCtx.row);
    if (!x || klSaving || !confirm("Zrušiť prevádzku „" + x.place + "“? Zapísané výkony ju budú mať naďalej.")) return;
    try {
      await klPlaceSend(
        { row: x.row, id: x.id, version: x.version, name: x.name, place: x.place, cancelled: true },
        "Prevádzka je zrušená.",
        btn,
      );
    } catch (e2) {
      $("klplaceerror").textContent = "Uloženie zlyhalo: " + ((e2 && e2.message) || e2);
      $("klplaceerror").hidden = false;
    }
  }

  /* ---------- karta klienta ---------- */
  function klDialog(id, html) {
    let dlg = $(id);
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = id;
      dlg.innerHTML = html;
      document.body.append(dlg);
    }
    return dlg;
  }
  function klCard(id) {
    const c = klById(id);
    if (!c) return;
    klCardId = id;
    const dlg = klDialog(
      "kldlg",
      '<div class="panelhead"><h2 id="kltitle"></h2><button class="btn" data-close="kldlg">Zavrieť</button></div><div class="dialogbody" id="klcontent"></div>',
    );
    const visits = klVisitsOf(id),
      open = klOpenDefects(id),
      draft = klDraftGet(id),
      phones = String(c.phone || "")
        .split(/[,;]/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => '<a href="tel:' + esc(p.replace(/[^\d+]/g, "")) + '">' + esc(p) + "</a>")
        .join(", ");
    $("kltitle").textContent = c.name;
    $("klcontent").innerHTML =
      (klCanWrite()
        ? '<div class="klstart"><button class="btn primary" data-klstart="' +
          esc(id) +
          '">' +
          (draft ? "Pokračovať v rozpísanom výkone" : "Začať výkon") +
          "</button></div>"
        : "") +
      klPlanBox(c) +
      klPlacesBox(c) +
      klDutiesBox(c) +
      klStaffBox(c) +
      '<div class="detailgrid"><div class="detailbox"><h3>Kontakt</h3>' +
      (c.person ? "<p><strong>" + esc(c.person) + "</strong></p>" : "") +
      line("phone", phones) +
      line("mail", c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "") +
      line("place", esc(c.address)) +
      (c.ico ? "<p>IČO " + esc(c.ico) + "</p>" : "") +
      '</div><div class="detailbox"><h3>Zákazka vo Flowii</h3>' +
      "<p>" +
      (c.subtype ? pill(c.subtype) + " " : "") +
      esc(c.state || "") +
      "</p><p>" +
      (c.next
        ? klNext(c).html + (c.task ? '<br><small class="muted">' + esc(c.task) + "</small>" : "")
        : "Bez úlohy „Výkon“ vo Flowii") +
      "</p>" +
      (c.deadline ? "<p>" + klDeadline(c) + "</p>" : "") +
      (c.orders ? '<p class="muted">' + esc(c.orders) + "</p>" : "") +
      (klOwnerDash()
        ? '<p><button class="btn" data-klhide="' +
          esc(id) +
          '" data-on="' +
          (c.hidden ? "0" : "1") +
          '">' +
          (c.hidden ? "Zobraziť v zozname" : "Skryť zo zoznamu") +
          "</button></p>"
        : "") +
      "</div></div>" +
      '<div class="history"><h3>Otvorené nedostatky' +
      (open.length ? " · " + open.length : "") +
      "</h3>" +
      (open.length
        ? '<div class="list kllistbox">' + open.map(klDefectHtml).join("") + "</div>"
        : '<p class="muted">Žiadne.</p>') +
      "</div>" +
      '<div class="history"><h3>Výkony' +
      (visits.length ? " · " + visits.length : "") +
      "</h3>" +
      (visits.length
        ? '<div class="list kllistbox">' + visits.map((v) => klVisitHtml(v, false)).join("") + "</div>"
        : '<p class="muted">Zatiaľ žiadny výkon.</p>') +
      "</div>";
    if (!dlg.open) dlg.showModal();
  }

  /* ---------- formulár výkonu ---------- */
  const KL_FORM =
    '<div class="panelhead"><h2>Výkon u klienta</h2><button class="btn" data-close="klvykon">Zavrieť</button></div><div class="dialogbody"><form id="klform" novalidate>' +
    '<p id="klformname" style="margin-top:0;font-weight:700"></p>' +
    '<div id="klremind"></div>' +
    '<label class="field" id="klplacebox" style="margin-bottom:12px">Prevádzka<select name="place"></select></label>' +
    '<div class="field"><span>Typ výkonu</span><div class="kltypes" id="kltypes"></div></div>' +
    '<div class="formgrid" style="margin-top:12px">' +
    '<label class="field">Dátum<input name="date" type="date" required></label>' +
    '<div class="field"><span>Čas od – do</span><div class="kltime"><input name="from" type="time" aria-label="Začiatok"><span>–</span><input name="to" type="time" aria-label="Koniec"></div>' +
    '<div class="quick"><button type="button" class="btn" data-klnow="from">Začiatok teraz</button><button type="button" class="btn" data-klnow="to">Koniec teraz</button></div><small id="klduration" class="muted"></small></div>' +
    '<label class="field">Cesta (km)<input name="km" type="number" min="0" step="0.1" inputmode="decimal"></label>' +
    '<label class="field">Cesta (min)<input name="travelMin" type="number" min="0" step="1" inputmode="numeric"></label>' +
    "</div>" +
    '<h3 class="klh">Nedostatky</h3><div id="kloldefs"></div><div id="kldefs"></div>' +
    '<button type="button" class="btn" data-kladd="1">+ Pridať nedostatok</button>' +
    '<label class="field" style="margin-top:16px">Poznámka k výkonu<textarea name="note" maxlength="5000" rows="3"></textarea></label>' +
    '<datalist id="klrooms"></datalist>' +
    '<p class="muted" id="kldraftnote">Rozpísaný výkon sa priebežne ukladá v tomto zariadení – nestratí sa ani po zatvorení okna. <button type="button" class="link" data-klreset="1">Začať odznova</button></p>' +
    '<p id="klerror" class="error" hidden role="alert"></p>' +
    '<div class="formfoot"><button type="button" class="btn" id="kldelete" hidden>Zmazať výkon</button><button type="button" class="btn" data-close="klvykon">Zavrieť</button><button type="submit" class="btn primary" id="klsave">Uložiť výkon</button></div></form></div>';
  const klf = () => $("klform").elements;
  const klNow = () => {
    const d = new Date(),
      m = Math.round((d.getHours() * 60 + d.getMinutes()) / 5) * 5;
    return pad2(Math.floor(m / 60) % 24) + ":" + pad2(m % 60);
  };
  function klDefRow(x) {
    return (
      '<div class="kldef"><input class="klroom" list="klrooms" maxlength="200" placeholder="Miestnosť (napr. Kotolňa, 1. poschodie)" value="' +
      esc((x && x.room) || "") +
      '"><button type="button" class="btn" data-kldel="1" aria-label="Odstrániť nedostatok" title="Odstrániť nedostatok">✕</button>' +
      '<textarea class="kltext" maxlength="3000" rows="2" placeholder="Popis nedostatku">' +
      esc((x && x.text) || "") +
      "</textarea></div>"
    );
  }
  function klFormValue() {
    const e = klf(),
      ed = klEditVisit();
    return {
      requestId: $("klform").dataset.rid,
      // úprava uloženého výkonu: riadok, ID a verzia (server overí, že sa medzitým nezmenil)
      ...(ed ? { row: ed.row, id: ed.id, version: ed.version } : {}),
      client: klFormId,
      name: (klById(klFormId) || {}).name || "", // len pre frontu appky (popis zápisu)
      date: e.date.value,
      from: e.from.value,
      to: e.to.value,
      place: e.place.value,
      types: [...$("kltypes").querySelectorAll("input:checked")].map((i) => i.value),
      km: e.km.value,
      travelMin: e.travelMin.value,
      note: e.note.value,
      defects: [...$("kldefs").querySelectorAll(".kldef")].map((r) => ({
        room: r.querySelector(".klroom").value,
        text: r.querySelector(".kltext").value,
      })),
    };
  }
  function klDuration() {
    const e = klf(),
      min = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5),
      d = e.from.value && e.to.value ? min(e.to.value) - min(e.from.value) : null;
    $("klduration").textContent = d == null ? "" : d > 0 ? "Trvanie " + klMin(d) : "Koniec musí byť po začiatku.";
  }
  function klRooms() {
    const used = new Set();
    (data.defects || []).filter((x) => x.client === klFormId && x.room).forEach((x) => used.add(x.room));
    $("kldefs")
      .querySelectorAll(".klroom")
      .forEach((i) => i.value.trim() && used.add(i.value.trim()));
    $("klrooms").innerHTML = [...used]
      .sort((a, b) => a.localeCompare(b, "sk"))
      .map((r) => '<option value="' + esc(r) + '">')
      .join("");
  }
  function klFill(v) {
    const e = klf();
    ["date", "from", "to", "km", "travelMin", "note"].forEach((k) => (e[k].value = v[k] == null ? "" : v[k]));
    klPlaceSelect(e.place, $("klplacebox"), klById(klFormId), v.place || "", { id: v.place, name: v.placeName });
    $("kltypes").innerHTML = klTypes()
      .map(
        (t) =>
          '<label class="kltype"><input type="checkbox" value="' +
          esc(t) +
          '"' +
          ((v.types || []).includes(t) ? " checked" : "") +
          "><span>" +
          esc(t) +
          "</span></label>",
      )
      .join("");
    $("kldefs").innerHTML = (v.defects || []).map(klDefRow).join("");
    $("klform").dataset.rid = v.requestId || klNewId();
    klRooms();
    klDuration();
  }
  function klFresh(c) {
    const last = klVisitsOf(c.id)[0],
      sub = c.subtype || "";
    // prevádzka: z dnešného plánu, inak z posledného výkonu
    const planned = c.plan && c.plan.slice(0, 10) === data.today ? c.planPlace : "";
    return {
      requestId: klNewId(),
      place: planned || klLastPlace(c),
      date: data.today,
      from: klNow(),
      to: "",
      types: last
        ? last.types.split(/,\s*/).filter((t) => klTypes().includes(t))
        : klTypes().filter(
            (t) => (t === "Kontrola BOZP" && /BOZP/.test(sub)) || (t === "Kontrola OPP" && /OPP/.test(sub)),
          ),
      km: last ? last.km : "",
      travelMin: last ? last.travelMin : "",
      note: "",
      defects: [],
    };
  }
  // upravovaný výkon (null = nový výkon); rozpísaná úprava sa v zariadení neukladá
  let klEditId = "",
    klEditRec = null; // stav výkonu pri otvorení úpravy (riadok, ID, verzia)
  const klEditVisit = () => (klEditId ? klEditRec : null);
  function klEditOpen(row) {
    const v = (data.visits || []).find((x) => x.row === +row),
      c = v && klById(v.client);
    if (!v || !c || !klCanWrite()) return;
    klFormId = c.id;
    klEditId = v.id;
    klEditRec = { row: v.row, id: v.id, version: v.version };
    klDialog("klvykon", KL_FORM);
    $("klvykon").querySelector(".panelhead h2").textContent = "Upraviť výkon";
    $("klformname").textContent = c.name;
    const sent = [v.ecosun ? "EcoSun" : "", v.eboz ? "EBOZ" : ""].filter(Boolean);
    $("klremind").innerHTML = sent.length
      ? '<div class="klremind"><strong>Výkon je už označený ako prenesený do ' +
        esc(sent.join(" a ")) +
        ".</strong> Zmenu prepíš aj tam (značky ostanú).</div>"
      : "";
    klFill({
      requestId: klNewId(),
      place: v.place,
      date: v.date,
      from: v.from,
      to: v.to,
      types: v.types.split(/,\s*/).filter(Boolean),
      km: v.km,
      travelMin: v.travelMin,
      note: v.note,
      defects: [],
    });
    const old = klVisitDefects(v);
    $("kloldefs").innerHTML = old.length
      ? '<ul class="kllist">' +
        old
          .map(
            (x) =>
              "<li" +
              (x.fixed ? ' class="klfixed"' : "") +
              ">" +
              (x.room ? "<b>" + esc(x.room) + ":</b> " : "") +
              esc(x.text) +
              "</li>",
          )
          .join("") +
        '</ul><p class="muted">Zapísané nedostatky ostanú; nové pridáš tlačidlom nižšie.</p>'
      : "";
    $("kldraftnote").hidden = true;
    $("kldelete").hidden = false;
    $("klerror").hidden = true;
    $("klsave").disabled = false;
    $("klsave").textContent = "Uložiť zmeny";
    $("klvykon").showModal();
  }
  function klStart(id) {
    const c = klById(id);
    if (!c || !klCanWrite()) return;
    klFormId = id;
    klEditId = "";
    klDialog("klvykon", KL_FORM);
    $("klvykon").querySelector(".panelhead h2").textContent = "Výkon u klienta";
    $("kloldefs").innerHTML = "";
    $("kldraftnote").hidden = false;
    $("kldelete").hidden = true;
    $("klformname").textContent = c.name;
    const remind = klRemindLines(c);
    $("klremind").innerHTML = remind.length
      ? '<div class="klremind"><strong>Na čo pamätať pri tomto výkone</strong><ul>' +
        remind.map((x) => "<li>" + esc(x.text) + " – " + esc(x.when) + "</li>").join("") +
        "</ul></div>"
      : "";
    const draft = klDraftGet(id);
    klFill(draft || klFresh(c));
    if (draft) toast("Pokračuješ v rozpísanom výkone z " + (draft.savedAt || "skôr") + ".");
    $("klerror").hidden = true;
    $("klsave").disabled = false;
    $("klsave").textContent = "Uložiť výkon";
    $("klvykon").showModal();
  }
  // zmazanie omylom zapísaného výkonu (v tabuľke ostane so stavom Zrušený, zmizne aj s nedostatkami)
  function klDeleteVisit(btn) {
    const rec = klEditVisit(),
      v = rec && (data.visits || []).find((x) => x.id === rec.id);
    if (!v || klSaving) return;
    const n = klVisitDefects(v).length;
    if (
      !confirm(
        "Zmazať výkon " +
          format(v.date) +
          (v.from ? " " + v.from + (v.to ? "–" + v.to : "") : "") +
          (n ? " aj s nedostatkami (" + n + ")" : "") +
          "? Z dashboardu zmizne; v tabuľke ostane so stavom Zrušený." +
          (v.ecosun || v.eboz
            ? "\n\nPozor: výkon je už prenesený do " +
              [v.ecosun ? "EcoSunu" : "", v.eboz ? "EBOZ" : ""].filter(Boolean).join(" a ") +
              " – tam ho treba zmazať ručne."
            : ""),
      )
    )
      return;
    klEditId = "";
    $("klvykon").close();
    klWrite(
      "vykonZrus",
      { row: rec.row, id: rec.id, version: rec.version, name: v.name, date: v.date },
      "Výkon zmazaný.",
      btn,
    );
  }
  function klKeep() {
    if (!klFormId || !$("klform") || klEditId) return;
    klDraftSet(klFormId, Object.assign(klFormValue(), { savedAt: new Date().toLocaleString("sk") }));
  }
  async function klSubmit(ev) {
    ev.preventDefault();
    if (klSaving) return;
    const v = klFormValue(),
      err = (s) => {
        $("klerror").textContent = s;
        $("klerror").hidden = false;
      };
    if (!v.types.length) return err("Vyber typ výkonu.");
    if (!v.date) return err("Doplň dátum výkonu.");
    if (v.date > data.today) return err("Dátum výkonu nemôže byť v budúcnosti.");
    v.defects = v.defects.filter((x) => x.room.trim() || x.text.trim());
    if (v.defects.some((x) => !x.text.trim())) return err("Pri nedostatku chýba popis.");
    if (v.from && v.to && v.to <= v.from) return err("Koniec výkonu musí byť po začiatku.");
    klKeep();
    klSaving = true;
    $("klerror").hidden = true;
    $("klsave").disabled = true;
    $("klsave").textContent = "Ukladám…";
    const editing = !!klEditId;
    try {
      const r = await timedSave("vykonSave", v);
      if (!editing) klDraftSet(klFormId, null);
      klEditId = "";
      $("klvykon").close();
      if (!(r && r.queued))
        toast(
          (editing ? (r && r.unchanged ? "Výkon bez zmeny" : "Výkon upravený") : "Výkon uložený") +
            (v.defects.length ? " · " + (editing ? "nové " : "") + "nedostatky: " + v.defects.length : "") +
            (r && r.duplicate ? " (už bol uložený skôr)" : "") +
            ".",
        );
      await applySaved(r);
      const school = editing ? [] : v.types.filter((t) => /^Školenie/.test(t));
      if (school.length) {
        const id = v.client;
        afterRefresh(() =>
          klTrainOpen(id, {
            date: v.date,
            tpls: school.map((t) => (t === "Školenie OPP" ? 0 : 4)),
          }),
        );
      }
    } catch (e) {
      err(
        "Uloženie zlyhalo: " +
          ((e && e.message) || e) +
          (editing ? "" : " Rozpísaný výkon ostáva uložený v zariadení."),
      );
    } finally {
      klSaving = false;
      if ($("klvykon").open) {
        $("klsave").disabled = false;
        $("klsave").textContent = editing ? "Uložiť zmeny" : "Uložiť výkon";
      }
    }
  }

  /* ---------- prenos, nedostatky, skrytie ---------- */
  async function klWrite(name, arg, okMsg, btn) {
    if (klSaving || !klCanWrite()) return;
    if (refreshing) return toast("Ešte obnovujem údaje po uložení, skús to o chvíľu.");
    klSaving = true;
    if (btn) btn.disabled = true;
    try {
      const r = await timedSave(name, arg);
      if (!(r && r.queued)) toast(okMsg);
      await applySaved(r);
    } catch (e) {
      toast("Zápis zlyhal: " + ((e && e.message) || e));
      if (btn) btn.disabled = false;
    } finally {
      klSaving = false;
    }
  }
  async function klCopy(row) {
    const v = (data.visits || []).find((x) => x.row === +row);
    if (!v) return;
    const text = klVisitText(v);
    try {
      await navigator.clipboard.writeText(text);
      toast("Výkon skopírovaný – vlož ho do EcoSunu alebo EBOZ.");
    } catch (e) {
      // v Apps Scripte môže byť schránka zakázaná – text sa ukáže na ručné skopírovanie
      const dlg = klDialog(
        "klcopydlg",
        '<div class="panelhead"><h2>Text výkonu</h2><button class="btn" data-close="klcopydlg">Zavrieť</button></div><div class="dialogbody"><p class="muted">Označ text a skopíruj ho.</p><textarea id="klcopytext" rows="12" style="width:100%"></textarea></div>',
      );
      $("klcopytext").value = text;
      dlg.showModal();
      $("klcopytext").select();
    }
  }

  /* ---------- načítanie z Flowii (len vlastník v dashboarde) ---------- */
  async function klFlowiiLoad() {
    if (klLoading || !klOwnerDash()) return;
    klLoading = true;
    render();
    toast("Načítavam zákazky a klientov z Flowii – môže to trvať minútu.");
    try {
      klPreview = await api("klientiFlowii");
      klPreviewShow();
    } catch (e) {
      toast("Načítanie z Flowii zlyhalo: " + ((e && e.message) || e));
    } finally {
      klLoading = false;
      if (view === "clients") render();
    }
  }
  function klPreviewShow() {
    const p = klPreview,
      dlg = klDialog(
        "klimport",
        '<div class="panelhead"><h2>Klienti z Flowii</h2><button class="btn" data-close="klimport">Zavrieť</button></div><div class="dialogbody" id="klimportbody"></div>',
      ),
      label = { new: ["Nový", "success"], changed: ["Zmenený", "warn"], same: ["Bez zmeny", ""] };
    $("klimportbody").innerHTML =
      '<p class="muted">Zákazky, kde je zodpovedná osoba <strong>' +
      esc(p.user) +
      "</strong>: " +
      p.orders +
      ", z toho aktívnych " +
      p.active +
      ". Klienti z aktívnych zákaziek sú nižšie – vyber, ktorých uložiť. Z Flowii sa len číta.</p>" +
      (p.items.length
        ? '<div class="list kllistbox">' +
          p.items
            .map(
              (x) =>
                '<label class="item klimp"><input type="checkbox" value="' +
                esc(x.id) +
                '"' +
                (x.status !== "same" ? " checked" : "") +
                "><div><strong>" +
                esc(x.name) +
                "</strong> " +
                pill(label[x.status][0], label[x.status][1]) +
                (x.hidden ? " " + pill("Skrytý") : "") +
                "<p>" +
                esc(
                  [
                    x.city,
                    x.ico ? "IČO " + x.ico : "",
                    x.subtype,
                    x.next
                      ? "ďalší výkon " + format(x.next) + (x.period ? " (" + x.period + ")" : "")
                      : "bez úlohy Výkon",
                    x.state,
                    x.orders > 1 ? x.orders + " zákazky" : "",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                ) +
                "</p>" +
                (x.changes.length ? '<p class="muted">Zmenené: ' + esc(x.changes.join(", ")) + "</p>" : "") +
                (x.skipped || [])
                  .map(
                    (s) =>
                      '<p class="muted">Vynechaná ako hotová: ' +
                      esc(format(s.date) + " " + s.caption + (s.why ? " – " + s.why : "")) +
                      "</p>",
                  )
                  .join("") +
                "</div></label>",
            )
            .join("") +
          "</div>"
        : empty("Vo Flowii nie je žiadna aktívna zákazka s touto zodpovednou osobou.")) +
      (p.gone.length
        ? '<p class="muted">V zozname, ale bez aktívnej zákazky vo Flowii: ' +
          esc(p.gone.join(", ")) +
          ". Ak už nie sú tvoji klienti, skry ich v karte klienta.</p>"
        : "") +
      '<p id="klimporterror" class="error" hidden role="alert"></p><div class="formfoot"><button class="btn" data-close="klimport">Zrušiť</button><button class="btn primary" id="klimportsave"' +
      (p.items.length ? "" : " disabled") +
      ">Uložiť vybraných</button></div>";
    if (!dlg.open) dlg.showModal();
  }
  async function klFlowiiSave(btn) {
    const ids = [...$("klimportbody").querySelectorAll("input:checked")].map((i) => i.value);
    if (!ids.length) {
      $("klimporterror").textContent = "Nevybral si žiadneho klienta.";
      $("klimporterror").hidden = false;
      return;
    }
    btn.disabled = true;
    btn.textContent = "Ukladám…";
    try {
      const r = await api("klientiFlowiiSave", { key: klPreview.key, ids });
      $("klimport").close();
      toast("Klienti uložení: nových " + r.added + ", aktualizovaných " + r.updated + ".");
      refresh(true, "obnova po načítaní klientov");
    } catch (e) {
      $("klimporterror").textContent = "Uloženie zlyhalo: " + ((e && e.message) || e);
      $("klimporterror").hidden = false;
      btn.disabled = false;
      btn.textContent = "Uložiť vybraných";
    }
  }

  /* ---------- udalosti ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !data) return;
    const ds = b.dataset;
    if (ds.klcard) klCard(ds.klcard);
    if (ds.klstart) afterRefresh(() => klStart(ds.klstart));
    if (b.id === "klflowii") klFlowiiLoad();
    if (b.id === "klimportsave") klFlowiiSave(b);
    if (ds.klnow) {
      klf()[ds.klnow].value = klNow();
      klDuration();
      klKeep();
    }
    if (ds.kladd) {
      $("kldefs").insertAdjacentHTML("beforeend", klDefRow(null));
      const rows = $("kldefs").querySelectorAll(".kldef");
      rows[rows.length - 1].querySelector(".klroom").focus();
      klKeep();
    }
    if (ds.kldel) {
      const r = b.closest(".kldef");
      if (r && (!r.querySelector(".kltext").value.trim() || confirm("Odstrániť tento nedostatok z formulára?"))) {
        r.remove();
        klRooms();
        klKeep();
      }
    }
    if (ds.klreset && confirm("Zahodiť rozpísaný výkon a začať odznova?")) {
      klDraftSet(klFormId, null);
      const c = klById(klFormId);
      if (c) klFill(klFresh(c));
    }
    if (ds.klmark) {
      const v = (data.visits || []).find((x) => x.row === +ds.klmark);
      if (v)
        klWrite(
          "vykonMark",
          { row: v.row, id: v.id, name: v.name, version: v.version, field: ds.field, on: ds.on === "1" },
          (ds.field === "ecosun" ? "EcoSun" : "EBOZ") +
            (ds.on === "1" ? ": označené ako prenesené." : ": označenie zrušené."),
          b,
        );
    }
    if (ds.kldefedit) afterRefresh(() => klDefEditOpen(ds.kldefedit));
    if (ds.kldefect) {
      const x = (data.defects || []).find((y) => y.row === +ds.kldefect);
      if (x)
        klWrite(
          "nedostatokSet",
          { row: x.row, id: x.visit, name: x.name, version: x.version, fixed: ds.fix === "1" },
          ds.fix === "1" ? "Nedostatok označený ako odstránený." : "Nedostatok je znova otvorený.",
          b,
        );
    }
    if (ds.klhide) {
      const c = klById(ds.klhide);
      if (c)
        klWrite(
          "klientSkryt",
          { row: c.row, id: c.id, version: c.version, hidden: ds.on === "1" },
          ds.on === "1" ? "Klient je skrytý zo zoznamu." : "Klient je znova v zozname.",
          b,
        );
    }
    if (ds.klcopy) klCopy(ds.klcopy);
    if (b.id === "kldelete") klDeleteVisit(b);
    if (ds.kledit) {
      const row = ds.kledit;
      afterRefresh(() => klEditOpen(row));
    }
    if (ds.klhelp) klHelpOpen();
    if (ds.kldutyadd) afterRefresh(() => klDutyOpen(ds.kldutyadd, 0));
    if (ds.kldutyedit) {
      const x = (data.duties || []).find((y) => y.row === +ds.kldutyedit);
      if (x) afterRefresh(() => klDutyOpen(x.client, x.row));
    }
    if (ds.kldutydone) afterRefresh(() => klDoneOpen(ds.kldutydone));
    if (ds.kldutyreopen) klDutySet(ds.kldutyreopen, "reopen", b);
    if (ds.kltrain) afterRefresh(() => klTrainOpen(ds.kltrain, null));
    if (ds.klstaffadd) afterRefresh(() => klTrainOpen(ds.klstaffadd, { noTrain: true }));
    if (ds.kltrainedit) afterRefresh(() => klTrainEditOpen(ds.kltrainedit));
    if (ds.klplan) afterRefresh(() => klPlanOpen(ds.klplan, ""));
    if (ds.klplanpick && klCardId) {
      const id = klCardId;
      afterRefresh(() => klPlanOpen(id, ds.klplanpick));
    }
    if (ds.klcaltoggle) klCalToggle();
    if (ds.klcalnav) klCalShift(+ds.klcalnav);
    if (b.id === "klplancancel") klPlanCancel(b);
    if (ds.klplaceadd) afterRefresh(() => klPlaceOpen(ds.klplaceadd, 0));
    if (ds.klplaceedit) {
      const x = (data.places || []).find((y) => y.row === +ds.klplaceedit);
      if (x) afterRefresh(() => klPlaceOpen(x.client, x.row));
    }
    if (b.id === "klplacecancel") klPlaceCancel(b);
    if (ds.klemp) afterRefresh(() => klEmpOpen(ds.klemp));
    if (ds.kltrainzrus) klTrainCancel(ds.kltrainzrus, b);
    if (ds.kltraintpl) klTrainTpl(+ds.kltraintpl);
    if (b.id === "kltrainadd") klTrainKindAdd("", "").querySelector(".kltype").focus();
    if (ds.kltrainrm) {
      b.closest(".kltrainkind").remove();
      if (!klTrainRows().length) klTrainKindAdd("", "");
      klTrainSync();
    }
    if (b.id === "kldutycancel" && klDutyRow) klDutySet(klDutyRow, "cancel", b);
    if (ds.kltpl) {
      const t = KL_DUTY_TPL[+ds.kltpl],
        e2 = $("kldutyform").elements;
      if (t) {
        e2.text.value = t[0];
        e2.months.value = t[1];
        e2.last.focus();
      }
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "klsearch") {
      klQuery = e.target.value;
      if ($("kllist")) $("kllist").innerHTML = klListHtml();
    } else if (e.target.classList && e.target.classList.contains("kltype")) {
      klTrainSync();
    } else if (e.target.closest && e.target.closest("#klplanform")) {
      klPlanDay();
    } else if (e.target.closest && e.target.closest("#klform")) {
      if (e.target.name === "from" || e.target.name === "to") klDuration();
      if (e.target.classList.contains("klroom")) klRooms();
      klKeep();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.closest && e.target.closest("#kldutydoneform") && e.target.name === "date") klDoneDateChanged();
    if (e.target.id === "kltrainall")
      $("kltrainstaff")
        .querySelectorAll(".kltrainemp")
        .forEach((i) => (i.checked = e.target.checked));
    if (e.target.id === "klhidden") {
      klShowHidden = e.target.checked;
      render();
    } else if (e.target.closest && e.target.closest("#klform")) klKeep();
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id === "klform") klSubmit(e);
    if (e.target.id === "kldutyform") klDutySubmit(e);
    if (e.target.id === "kldutydoneform") klDoneSubmit(e);
    if (e.target.id === "kldefeditform") klDefEditSubmit(e);
    if (e.target.id === "kltraineditform") klTrainEditSubmit(e);
    if (e.target.id === "kltrainform") klTrainSubmit(e);
    if (e.target.id === "klplanform") klPlanSubmit(e);
    if (e.target.id === "klempform") klEmpSubmit(e);
    if (e.target.id === "klplaceform") klPlaceSubmit(e);
  });
  if (window.PREVIEW_DATA) {
    $("preview").hidden = false;
    install(window.PREVIEW_DATA);
  } else if (window.APPKA) startApp();
  else refresh();
