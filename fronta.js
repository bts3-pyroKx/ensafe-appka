/* Fronta zápisov appky: zápis, ktorý sa nepodarilo odoslať (bez signálu), počká v zariadení a odošle sa po pripojení.
   Načíta sa po skripte dashboardu (app.js) a používa jeho funkcie (refresh, render, toast, byRow, deviceByName…).

   Pravidlá:
   - zápisy sa odosielajú po jednom, v poradí, v akom vznikli; každý má stále to isté číslo (rid), takže ho server
     nevykoná dvakrát, ani keď sa odpoveď stratí;
   - pred odoslaním sa načíta čerstvý stav. Ak sa riadok medzitým zmenil inde (iná verzia riadku), zápis sa NEODOŠLE
     a čaká na rozhodnutie: „Odoslať aj tak“ alebo „Zahodiť“. Nič sa ticho neprepíše ani nezahodí;
   - po vlastnom úspešnom zápise sa ostatným čakajúcim zápisom toho istého riadku posunie verzia (zmenili sme ho my). */
(function () {
  "use strict";
  const A = window.APPKA;
  if (!A) return;
  const STOP = ["offline", "server", "busy", "auth", "version", "config"]; // odosielanie sa preruší, zápisy ostanú čakať
  let items = [], // { id, name, arg, at, state: "wait" | "conflict" | "error", msg }
    flushing = false,
    loaded = false;
  const keyOf = (it) => (it.name === "updateCall" ? "d:" : "c:") + it.arg.row;
  // aktuálna verzia riadku na serveri podľa naposledy načítaného dashboardu (undefined = riadok tam nie je / má iný názov)
  function versionNow(it) {
    if (!data) return undefined;
    const rec = it.name === "updateCall" ? (data.calls || []).find((c) => c.row === it.arg.row) : byRow.get(it.arg.row);
    return rec && rec.name === it.arg.name ? rec.version : undefined;
  }
  const save = () => A.queueStore.set(items);
  const waiting = () => items.filter((i) => i.state === "wait").length;

  function label(it) {
    const a = it.arg,
      n = a.name || "";
    if (it.name === "saveCall")
      return "Telefonát – " + n + ": " + (a.result || "") + (a.status ? " → " + a.status : "");
    if (it.name === "completeTask") return "Úloha splnená – " + n + ": " + (a.done || "");
    if (it.name === "setStatus") return "Zmena stavu – " + n + " → " + a.status;
    if (it.name === "saveActivity") return (a.type || "Návšteva") + " – " + n;
    return "Úprava telefonátu – " + n;
  }

  /* ---------- zobrazenie ---------- */
  let bar, dlg;
  function ui() {
    if (bar) return;
    bar = document.createElement("div");
    bar.id = "queuebar";
    bar.className = "banner";
    bar.hidden = true;
    $("content").before(bar);
    dlg = document.createElement("dialog");
    dlg.id = "queuedlg";
    dlg.innerHTML =
      '<div class="panelhead"><h2>Zápisy čakajúce na odoslanie</h2><button class="btn" data-close="queuedlg">Zavrieť</button></div>' +
      '<div class="dialogbody"><div id="queuelist"></div><div class="formfoot"><button class="btn primary" type="button" id="queuesend">Odoslať teraz</button></div></div>';
    document.body.append(dlg);
    bar.addEventListener("click", (ev) => {
      if (ev.target.closest("button")) {
        paintList();
        dlg.showModal();
      }
    });
    dlg.addEventListener("click", async (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.id === "queuesend") return flush(true);
      const it = items.find((i) => i.id === b.dataset.item);
      if (!it) return;
      if (b.dataset.act === "drop") {
        if (!confirm("Zahodiť tento zápis? Do tabuľky sa nedostane.\n\n" + label(it))) return;
        items = items.filter((i) => i !== it);
      } else if (b.dataset.act === "force") {
        // odoslať aj tak: zápis sa prenesie na aktuálny stav riadku (aj keby sa riadok v tabuľke posunul)
        const target = it.name === "updateCall" ? null : deviceByName(it.arg.name);
        if (it.name === "updateCall" ? versionNow(it) === undefined : !target) {
          toast("Záznam „" + it.arg.name + "“ už v tabuľke nie je – zápis sa nedá odoslať, len zahodiť.");
          return;
        }
        if (target) it.arg.row = target.row;
        it.arg.version = versionNow(it);
        it.state = "wait";
        it.msg = "";
      } else return;
      await save();
      paint();
      if (b.dataset.act === "force") flush(true);
    });
  }
  function paint() {
    ui();
    const w = waiting(),
      bad = items.length - w;
    bar.hidden = !items.length;
    if (items.length)
      bar.innerHTML =
        "<strong>" +
        (flushing
          ? "Odosielam zápisy zo zariadenia"
          : (w ? w + (w === 1 ? " zápis čaká" : w < 5 ? " zápisy čakajú" : " zápisov čaká") + " na odoslanie" : "") +
            (w && bad ? " · " : "") +
            (bad ? bad + (bad === 1 ? " zápis potrebuje" : " zápisy potrebujú") + " tvoje rozhodnutie" : "")) +
        '.</strong> <button class="btn" type="button">Zobraziť</button>';
    if (dlg.open) paintList();
    if (typeof render === "function" && data) render(); // štítky „Čaká na odoslanie“ pri zariadeniach
  }
  function paintList() {
    $("queuelist").innerHTML = items.length
      ? items
          .map((it) => {
            const now = it.name === "updateCall" ? null : deviceByName(it.arg.name);
            return (
              '<div class="queueitem"><div><strong>' +
              esc(label(it)) +
              '</strong><div class="muted">zapísané ' +
              esc(new Date(it.at).toLocaleString("sk")) +
              "</div>" +
              (it.state === "wait"
                ? '<div class="muted">Čaká na pripojenie.</div>'
                : '<div class="error">' +
                  esc(it.msg || "Zápis sa nepodarilo odoslať.") +
                  "</div>" +
                  (it.state === "conflict" && now
                    ? '<div class="muted">V tabuľke je teraz: stav „' +
                      esc(now.status) +
                      "“" +
                      (now.action ? ", ďalší krok „" + esc(now.action) + "“" : "") +
                      (now.lastContact ? ", posledný kontakt " + esc(format(now.lastContact)) : "") +
                      ".</div>"
                    : "") +
                  '<div class="quick"><button class="btn" type="button" data-act="force" data-item="' +
                  esc(it.id) +
                  '">Odoslať aj tak</button><button class="btn" type="button" data-act="drop" data-item="' +
                  esc(it.id) +
                  '">Zahodiť</button></div>') +
              "</div></div>"
            );
          })
          .join("")
      : empty("Všetko je odoslané.");
    $("queuesend").disabled = flushing || !waiting();
  }

  /* ---------- odosielanie ---------- */
  // čerstvý dashboard cez bežnú obnovu stránky; false = nepodarilo sa (bez signálu alebo beží iná obnova)
  async function fresh() {
    const before = lastFresh;
    await refresh(true, "odosielanie zápisov zo zariadenia");
    return lastFresh !== before;
  }
  async function flush(manual) {
    if (flushing || !loaded || !waiting()) return;
    if (saving || visitSaving || editSaving || doneSaving) return; // práve sa ukladá formulár – skúsi sa neskôr
    flushing = true;
    paint();
    let sent = 0,
      calendar = false,
      stopped = "";
    try {
      if (!(await fresh())) {
        stopped = "offline";
        return;
      }
      for (const it of items.slice()) {
        if (it.state !== "wait") continue;
        if (it.arg.version !== versionNow(it)) {
          it.state = "conflict";
          it.msg =
            "Údaje zariadenia sa medzičasom zmenili inde (v tabuľke alebo na inom zariadení). Zápis sa neodoslal.";
          continue;
        }
        const others = items.filter((o) => o !== it && o.state === "wait").map((o) => [o, versionNow(o)]);
        try {
          const r = await A.send(it.name, [it.arg], it.id);
          if (["saveCall", "completeTask", "setStatus"].includes(it.name) && !(r && r.duplicate)) calendar = true;
        } catch (e) {
          if (STOP.includes(e.code)) {
            stopped = e.code;
            break;
          }
          it.state = e.code === "conflict" ? "conflict" : "error";
          it.msg = e.message;
          continue;
        }
        items = items.filter((o) => o !== it);
        sent++;
        await save();
        if (!others.length) break;
        // čerstvý stav po našom zápise; čakajúcim zápisom, ktoré sedeli na stave pred ním, sa posunie verzia
        if (!(await fresh())) {
          stopped = "offline";
          break;
        }
        for (const [o, was] of others) if (was !== undefined && o.arg.version === was) o.arg.version = versionNow(o);
        await save();
      }
    } finally {
      flushing = false;
      await save();
      paint();
      const bad = items.length - waiting();
      if (sent || bad || manual)
        toast(
          (sent ? "Odoslané zo zariadenia: " + sent + ". " : "") +
            (bad ? "Zápisy na rozhodnutie: " + bad + " – otvor „Zobraziť“. " : "") +
            (stopped === "offline" || stopped === "server"
              ? "Bez pripojenia – zvyšok sa odošle neskôr."
              : stopped === "busy"
                ? "Prebieha iný zápis – skúsim to znova."
                : !sent && !bad
                  ? "Nič na odoslanie."
                  : ""),
        );
      if (sent) {
        if (calendar) api("syncCalendar").catch(() => {});
        refresh(true, "obnova po odoslaní zápisov");
      }
    }
  }

  /* ---------- rozhranie pre appku ---------- */
  // Zápis z formulára: bez čakajúcich zápisov ide rovno na server; pri výpadku (alebo ak už niečo čaká) do fronty.
  let ready;
  A.write = async function (name, arg) {
    await ready; // fronta zo zariadenia musí byť načítaná, inak by nový zápis predbehol čakajúce
    const id = A.newId();
    if (!items.length) {
      try {
        return await A.send(name, [arg], id);
      } catch (e) {
        if (e.code !== "offline" && e.code !== "server") throw e;
      }
    }
    items.push({ id, name, arg, at: Date.now(), state: "wait", msg: "" });
    await save();
    paint();
    setTimeout(flush, 1500);
    return { ok: true, queued: true };
  };
  A.flush = flush;
  A.pending = () => items.length;
  A.pendingFor = (name) => items.some((i) => i.arg && i.arg.name === name);

  ready = A.queueStore.get().then((list) => {
    items = Array.isArray(list) ? list : [];
    loaded = true;
    paint();
    flush();
  });
  window.addEventListener("online", () => flush());
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && flush());
  setInterval(() => document.visibilityState === "visible" && flush(), 60000);
})();
