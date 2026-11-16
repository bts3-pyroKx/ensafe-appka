
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
      (window.APPKA && window.APPKA.pendingFor && window.APPKA.pendingFor(d.name) ? " " + pill("Čaká na odoslanie", "warn") : "")
    );
  }
  function nameButton(d) {
    return '<button class="link" data-detail="' + d.row + '">' + esc(d.name) + "</button>";
  }
  function empty(s) {
    return '<div class="empty">' + esc(s) + "</div>";
  }
  function toast(s) {
    $("toast").textContent = s;
    $("toast").hidden = false;
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => ($("toast").hidden = true), 6500);
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
  function hay(d) {
    let s = hayCache.get(d);
    if (s === undefined) {
      s = normalize(
        [d.name, d.city, d.district, d.address, d.person, d.phone, d.action, d.taskText, d.result, d.note].join(" "),
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
  const CAL_WRITES = ["saveCall", "completeTask", "setStatus"];
  function syncCalendarLater() {
    api("syncCalendar").catch((e) =>
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
  let detailRow = null;
  function install(next) {
    data = next;
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
  function overview() {
    const ds = data.devices,
      upcoming = appointments().filter((d) => d.confirmed && d.appointment.slice(0, 10) >= data.today);
    const overdue = tasks().filter((d) => d.category === "Po termíne").length;
    const mailT = tasks("mail"),
      mailDue = mailT.filter((d) => d.category === "Po termíne" || d.category === "Dnes").length;
    return (
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
      (mailT.length
        ? '<div class="banner" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><span>Po mailingu čaká na zavolanie <strong>' +
          mailT.length +
          "</strong> zariadení" +
          (mailDue ? " (" + mailDue + " dnes alebo po termíne)" : "") +
          '. V Ďalších krokoch nie sú, majú samostatný zoznam.</span><button class="btn" data-view="mailtasks">Zobraziť Po mailingu</button></div>'
        : "") +
      '<div class="grid"><section class="panel"><div class="panelhead"><h2>Ďalšie kroky' +
      (overdue ? ' · <span style="color:var(--accent)">' + overdue + " po termíne</span>" : "") +
      '</h2><button class="btn" data-view="tasks">Všetky úlohy</button></div><div class="list">' +
      (tasks().slice(0, 5).map(taskItem).join("") || empty("Všetky úlohy sú vybavené.")) +
      '</div></section><section class="panel"><div class="panelhead"><h2>Najbližšie ukážky</h2><button class="btn" data-view="appointments">Všetky termíny</button></div><div class="list">' +
      (upcoming.slice(0, 5).map(apptItem).join("") || empty("Zatiaľ nie je dohodnutá budúca ukážka.")) +
      "</div></section></div>" +
      '<div class="grid"><section class="panel"><div class="panelhead"><h2>Stav oslovenia</h2></div>' +
      barChart("status") +
      '</section><section class="panel"><div class="panelhead"><h2>Zariadenia podľa okresu</h2></div>' +
      barChart("district") +
      "</section></div>"
    );
  }
  const GROUPS = {
    mail: ["mailing"],
    overview: ["overview"],
    work: ["tasks", "mailtasks", "appointments"],
    contacts: ["devices", "social", "schools", "companies"],
    log: ["history", "calls"],
  };
  const LABELS = {
    mailing: "Mailing",
    tasks: "Moje úlohy",
    mailtasks: "Po mailingu",
    appointments: "Termíny",
    devices: "Všetky",
    social: "Sociálne zariadenia",
    schools: "Školy",
    companies: "Firmy",
    history: "Návštevy a ukážky",
    calls: "Telefonáty",
  };
  const LAST = { work: "tasks", contacts: "devices", log: "history" };
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
      '<div class="filters"><label class="field grow">Vyhľadať<input id="search" type="search" placeholder="Názov, obec, okres (aj RK, ZA…), kontakt"></label><label class="field">Okres<select id="district">' +
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
        options(["Samostatná ukážka", "Spoločná ukážka", "Návšteva"], "Všetky udalosti") +
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
    const q = normalize($("search")?.value || "").trim(),
      dist = $("district")?.value;
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
    if (["devices", "social", "schools", "companies"].includes(view))
      rows = rows.filter(
        (d) =>
          (!$("stage").value || d.status === $("stage").value) && (!$("type")?.value || d.type === $("type").value),
      );
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
          pill(a.type, a.type === "Návšteva" ? "warn" : "success") +
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
      heads = [view === "companies" ? "Firma" : "Zariadenie", "Okres / obec", "Stav", "Posledný kontakt", "Ďalší krok"];
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
          esc(d.action || "—") +
          "</td></tr>",
      );
    }
    $("results").innerHTML =
      '<div class="tablewrap"><table><thead><tr>' +
      heads.map((h) => '<th scope="col">' + h + "</th>").join("") +
      "</tr></thead><tbody>" +
      body.join("") +
      "</tbody></table></div>";
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
      devices: "Kontakty",
      social: "Kontakty",
      schools: "Kontakty",
      companies: "Kontakty",
      history: "História",
      calls: "História",
    };
    const g = groupOf(view);
    if (g !== "overview") LAST[g] = view;
    $("title").textContent = titles[view];
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
          : subtabs() + (view === "companies" ? companySummary() : "") + filters();
    if (same) {
      Object.keys(keep).forEach((id) => {
        const el = $(id);
        if (!el) return;
        if (el.type === "checkbox") el.checked = keep[id];
        else if (el.tagName !== "SELECT" || [...el.options].some((o) => o.value === keep[id])) el.value = keep[id];
      });
    }
    if (view !== "overview" && view !== "mailing") results();
    if (same) window.scrollTo(0, sy);
  }
  function detail(row) {
    const d = byRow.get(+row);
    if (!d) return;
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
    $("detailcontent").innerHTML =
      (d.flags.length ? '<div class="banner">' + esc(d.flags.join(" · ")) + "</div>" : "") +
      '<div class="detailgrid"><div class="detailbox"><h3>Kontakt</h3><p><strong>' +
      esc(d.person) +
      "</strong></p>" +
      line("phone", d.phone ? phoneLinks : "") +
      line("mail", mailLinks) +
      line("place", esc([d.address, d.district].filter(Boolean).join(", "))) +
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
      mailInfo(d) +
      "<p>Posledný kontakt: " +
      esc(d.lastContact ? format(d.lastContact) : "Neuvedený") +
      "</p><p>Stretnutie: " +
      esc(d.appointment ? format(d.appointment, true) : d.appointmentRaw || "Neuvedené") +
      "</p><p>" +
      pill(d.order ? "Objednávka potvrdená" : "Objednávka zatiaľ nepotvrdená", d.order ? "success" : "") +
      '</p></div><div class="detailbox"><h3>Ďalší krok</h3><p class="notes">' +
      esc(d.action || "Zatiaľ neurčený") +
      "</p><p>" +
      esc(format(d.deadline)) +
      "</p><p>" +
      esc(d.products) +
      '</p></div><div class="detailbox"><h3>Poznámky</h3><p class="notes">' +
      esc(d.note || "Bez poznámky") +
      '</p><p class="muted">' +
      esc(d.businessNote) +
      '</p></div></div><div class="formfoot"><a class="btn" target="_blank" rel="noopener" href="' +
      esc(data.sourceUrl + "&range=A" + d.row + ":R" + d.row) +
      '">Otvoriť v tabuľke</a><button class="btn" data-visit="' +
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
    if ($("detail").open) $("detail").close();
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
    const ds = Object.assign({}, b.dataset);
    if (ds.call) afterRefresh(() => openCall(ds.call));
    if (ds.visit) afterRefresh(() => openVisit(ds.visit));
    if (ds.editcall) afterRefresh(() => openEditCall(ds.editcall));
    if (ds.done) afterRefresh(() => openDone(ds.done));
    if (ds.quick) quickCall(ds.quick, ds.row);
    if (ds.setstatus) {
      if (refreshing) toast("Ešte obnovujem údaje po uložení, stav zmeň o chvíľu.");
      else saveStatus(ds.setstatus, b);
    }
    if (b.dataset.close && !saving && !visitSaving && !editSaving && !doneSaving) $(b.dataset.close).close();
  });
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
    if ($("detail").open) $("detail").close();
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
    vf().type.value = "Samostatná ukážka";
    vf().type.disabled = false;
    vf().date.value = data.today;
    vf().date.max = data.today;
    vf().date.disabled = false;
    vf().visited.checked = true;
    vf().note.value = "";
    $("visiterror").hidden = true;
    visitSelected = data.devices.find((d) => d.row === +vf().device.value);
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
    visitPending = crypto.randomUUID();
  };
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
    };
    visitSaving = true;
    Array.from(vf()).forEach((el) => (el.disabled = true));
    $("visiterror").hidden = true;
    $("savevisit").textContent = "Ukladám…";
    try {
      const r = await timedSave("saveActivity", p);
      $("visit").close();
      toast("Návšteva / ukážka bola uložená.");
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
    if ($("detail").open) $("detail").close();
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
          : r && r.noteSynced
            ? "Telefonát bol opravený v denníku aj v poznámke zariadenia."
            : "Telefonát bol opravený v denníku hovorov.",
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
      date: data.today,
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
            : "nemá záujem, úloha uzavretá."),
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
      "“ sa zariadenie znova objaví v Úlohách. Doplň ďalší krok alebo zmeň stav.";
    $("donewarn").hidden = !w;
  }
  function openDone(row) {
    if (saving || visitSaving || editSaving || doneSaving) return;
    const d = data.devices.find((x) => x.row === +row);
    if (!d) return;
    if ($("detail").open) $("detail").close();
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
    $("pairform").elements.name.value = /Android/.test(ua) ? "Telefón (Android)" : /Windows/.test(ua) ? "Počítač (Windows)" : "Zariadenie";
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
      $("pairlink").innerHTML =
        '<p><a class="btn primary" target="_blank" rel="noopener" href="' +
        esc(r.url + "#pair=" + r.code) +
        '">Otvoriť appku a spárovať</a></p><p class="muted">Odkaz platí ' +
        r.minutes +
        " minút a len raz. Po otvorení si appku nainštaluj cez ponuku prehliadača („Nainštalovať aplikáciu“ / „Pridať na plochu“).</p>";
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
      if (document.visibilityState === "visible" && Date.now() - lastFresh > 300000) again();
    });
  }
  if (window.PREVIEW_DATA) {
    $("preview").hidden = false;
    install(window.PREVIEW_DATA);
  } else if (window.APPKA) startApp();
  else refresh();
