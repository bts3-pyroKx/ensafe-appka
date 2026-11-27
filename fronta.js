/* Fronta zápisov appky: zápis, ktorý sa nepodarilo odoslať (bez signálu), počká v zariadení a odošle sa po pripojení.
   Načíta sa po skripte dashboardu (app.js) a používa jeho funkcie (refresh, render, toast, byRow, deviceByName…).

   Pravidlá:
   - zápisy sa odosielajú po jednom, v poradí, v akom vznikli; každý má stále to isté číslo (rid), takže ho server
     nevykoná dvakrát, ani keď sa odpoveď stratí;
   - pred odoslaním sa načíta čerstvý stav. Ak sa riadok medzitým zmenil inde (iná verzia riadku), zápis sa NEODOŠLE
     a čaká na rozhodnutie: „Odoslať aj tak“ alebo „Zahodiť“. Nič sa ticho neprepíše ani nezahodí;
   - po vlastnom úspešnom zápise sa ostatným čakajúcim zápisom toho istého riadku posunie verzia (zmenili sme ho my);
   - zápis, ktorý už raz na server odišiel a odpoveď sa stratila (tried), sa pri inej verzii riadku neoznačí za konflikt
     hneď – riadok sme mohli zmeniť my sami. Pošle sa znova s tým istým číslom a rozhodne server: buď vráti pôvodný
     výsledok (zápis už prebehol), alebo ho odmietne ako konflikt. */
(function () {
  "use strict";
  const A = window.APPKA;
  if (!A) return;
  const STOP = ["offline", "server", "busy", "auth", "version", "config"]; // odosielanie sa preruší, zápisy ostanú čakať
  let items = [], // { id, name, arg, at, state: "wait" | "conflict" | "error", msg, tried }
    flushing = false,
    loaded = false;
  // čoho sa zápis týka: "d" = riadok denníka hovorov, "s" = riadok zásielky, "c" = zariadenie v Kontaktoch,
  // "v" = nový výkon alebo nová povinnosť u klienta (nový riadok, bez verzie), "x" = výkon (prenos), "n" = nedostatok,
  // "p" = povinnosť klienta (úprava, splnenie), "e" = zamestnanec klienta, "t" = školenie zamestnanca (zrušenie);
  // nové školenie (skolenieSave) a nová prevádzka (prevadzkaSave bez riadku) sú „v“; "k" = klient (plán výkonu);
  // "r" = prevádzka klienta (úprava, zrušenie)
  const KINDS = {
    vykonPlan: "k",
    skolenieSave: "v",
    zamestnanecSet: "e",
    skolenieZrus: "t",
    updateCall: "d",
    shipSetStatus: "s",
    vykonSave: "v",
    vykonMark: "x",
    vykonZrus: "x",
    nedostatokSet: "n",
    povinnostSet: "p",
  };
  const kind = (it) =>
    it.name === "povinnostSave"
      ? it.arg.row != null
        ? "p"
        : "v"
      : it.name === "vykonSave"
        ? it.arg.row != null
          ? "x"
          : "v"
        : it.name === "prevadzkaSave"
        ? it.arg.row != null
          ? "r"
          : "v"
        : KINDS[it.name] || "c";
  // aktuálna verzia riadku na serveri podľa naposledy načítaného dashboardu (undefined = riadok tam nie je / má iný názov)
  function versionNow(it) {
    if (!data) return undefined;
    const k = kind(it),
      rec =
        k === "d"
          ? (data.calls || []).find((c) => c.row === it.arg.row)
          : k === "s"
            ? (data.shipments || []).find((s) => s.row === it.arg.row)
            : k === "x"
              ? (data.visits || []).find((v) => v.row === it.arg.row && v.id === it.arg.id)
              : k === "n"
                ? (data.defects || []).find((x) => x.row === it.arg.row && x.visit === it.arg.id)
                : k === "p"
                  ? (data.duties || []).find((x) => x.row === it.arg.row && x.id === it.arg.id && x.state === "active")
                  : k === "k"
                    ? (data.clients || []).find((x) => x.row === it.arg.row && x.id === it.arg.id)
                    : k === "e"
                      ? (data.employees || []).find((x) => x.row === it.arg.row && x.id === it.arg.id)
                      : k === "t"
                        ? (data.trainings || []).find((x) => x.row === it.arg.row && x.id === it.arg.id)
                        : k === "r"
                          ? (data.places || []).find((x) => x.row === it.arg.row && x.id === it.arg.id)
                          : byRow.get(it.arg.row);
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
    if (it.name === "saveContact") return "Úprava kontaktu – " + n;
    if (it.name === "shipSetStatus") return "Zásielka – " + (n || "bez zariadenia") + " → " + a.status;
    if (it.name === "saveActivity") return (a.type || "Návšteva") + " – " + n;
    if (it.name === "vykonSave")
      return (
        (a.row != null ? "Úprava výkonu – " : "Výkon – ") +
        n +
        ": " +
        (a.types || []).join(", ") +
        (a.defects && a.defects.length ? ", nedostatky: " + a.defects.length : "")
      );
    if (it.name === "vykonZrus") return "Zmazaný výkon – " + n + (a.date ? ": " + a.date.split("-").reverse().join(".") : "");
    if (it.name === "vykonMark") return "Prenos výkonu – " + n + ": " + (a.field === "ecosun" ? "EcoSun" : "EBOZ");
    if (it.name === "povinnostSave")
      return (a.row != null ? "Úprava povinnosti – " : "Nová povinnosť – ") + n + ": " + (a.text || "");
    if (it.name === "povinnostSet")
      return "Povinnosť – " + n + ": " + (a.text || "") + (a.action === "cancel" ? " (zrušená)" : " (splnená)");
    if (it.name === "vykonPlan")
      return (
        "Plán výkonu – " +
        n +
        ": " +
        (a.start
          ? a.start.slice(0, 10).split("-").reverse().join(".") +
            (a.start.slice(11) !== "00:00" ? " " + a.start.slice(11) : "")
          : "zrušený")
      );
    if (it.name === "skolenieSave")
      return (
        "Školenie – " +
        n +
        ": " +
        (a.types ? a.types.map((t) => t.type).join(" + ") : a.type || "") +
        " (" +
        ((a.employees || []).length + (a.newPeople || []).length) +
        " zam.)"
      );
    if (it.name === "zamestnanecSet")
      return "Zamestnanec – " + n + ": " + (a.person || "") + (a.left ? " (odišiel)" : "");
    if (it.name === "skolenieZrus") return "Zrušené školenie – " + n + ": " + (a.person || "") + ", " + (a.type || "");
    if (it.name === "prevadzkaSave")
      return (
        (a.row == null ? "Nová prevádzka – " : a.cancelled ? "Zrušená prevádzka – " : "Úprava prevádzky – ") +
        n +
        ": " +
        (a.place || "")
      );
    if (it.name === "nedostatokSet") return "Nedostatok – " + n + (a.fixed ? ": odstránený" : ": znova otvorený");
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
        const target = kind(it) === "c" ? deviceByName(it.arg.name) : null;
        if (kind(it) === "v" ? false : kind(it) === "c" ? !target : versionNow(it) === undefined) {
          toast("Záznam „" + it.arg.name + "“ už v tabuľke nie je – zápis sa nedá odoslať, len zahodiť.");
          return;
        }
        if (target) it.arg.row = target.row;
        it.arg.version = versionNow(it);
        it.state = "wait";
        it.msg = "";
        it.tried = false;
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
            const now = kind(it) === "c" ? deviceByName(it.arg.name) : null;
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
        if (kind(it) !== "v" && it.arg.version !== versionNow(it) && !it.tried) {
          it.state = "conflict";
          it.msg =
            ({
              s: "Zásielka sa",
              x: "Výkon sa",
              n: "Nedostatok sa",
              p: "Povinnosť sa",
              e: "Zamestnanec sa",
              t: "Školenie sa",
              k: "Klient sa",
            }[kind(it)] || "Údaje zariadenia sa") +
            " medzičasom zmenili inde (v tabuľke alebo na inom zariadení). Zápis sa neodoslal.";
          continue;
        }
        const others = items.filter((o) => o !== it && o.state === "wait").map((o) => [o, versionNow(o)]);
        try {
          it.tried = true; // od tejto chvíle mohol zápis na serveri prebehnúť, aj keby odpoveď neprišla
          await save();
          const r = await A.send(it.name, [it.arg], it.id);
          if (
            ["saveCall", "completeTask", "setStatus", "saveContact", "vykonPlan"].includes(it.name) &&
            !(r && r.duplicate)
          )
            calendar = true;
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
    let tried = false;
    // rozhodujú len zápisy čakajúce na odoslanie – konflikt alebo chyba čaká na človeka a sám sa neodošle,
    // takže by nemal posielať každý ďalší zápis do fronty (a hlásiť „bez pripojenia“)
    if (!waiting()) {
      try {
        tried = true;
        return await A.send(name, [arg], id);
      } catch (e) {
        if (e.code !== "offline" && e.code !== "server") throw e;
      }
    }
    items.push({ id, name, arg, at: Date.now(), state: "wait", msg: "", tried });
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
