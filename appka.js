/* Beh appky mimo Apps Scriptu: spojenie so serverom (doPost v src/Appka.js), párovanie zariadenia, aktualizácie.
   Načíta sa pred skriptom dashboardu (src/App.html), ktorý cez window.APPKA posiela všetky volania servera.
   Kľúč zariadenia je uložený len v tomto prehliadači. Posledný načítaný dashboard sa ukladá v zariadení (IndexedDB),
   aby sa appka otvorila hneď a aj bez signálu; pri odhlásení alebo zrušení kľúča sa uložené údaje zmažú. */
(function () {
  "use strict";
  const CFG = window.APPKA_CONFIG || {};
  const KEY = "ensafe.kluc";
  const WRITES = ["saveCall", "saveActivity", "updateCall", "completeTask", "setStatus", "shipSetStatus"];
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k) || "";
      } catch (e) {
        return "";
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {}
    },
    del(k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    },
  };
  const uuid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  /* ---------- údaje uložené v zariadení ---------- */
  const DB = "ensafe-appka";
  function db() {
    return new Promise((resolve, reject) => {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    });
  }
  async function kv(mode, run) {
    const d = await db();
    try {
      return await new Promise((resolve, reject) => {
        const tx = d.transaction("kv", mode),
          rq = run(tx.objectStore("kv"));
        tx.oncomplete = () => resolve(rq && rq.result);
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } finally {
      d.close();
    }
  }
  const saved = {
    get: (k) => kv("readonly", (s) => s.get(k)).catch(() => undefined),
    set: (k, v) => kv("readwrite", (s) => s.put(v, k)).catch(() => {}),
    del: (k) => kv("readwrite", (s) => s.delete(k)).catch(() => {}),
    clear: () => kv("readwrite", (s) => s.clear()).catch(() => {}),
  };
  function fail(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  async function post(body) {
    if (!CFG.apiUrl) throw fail("config", "Appka nemá nastavenú adresu servera.");
    let res, out;
    // server, ktorý do 45 s neodpovie, sa berie ako výpadok spojenia (uložené údaje ostanú zobrazené)
    const abort = new AbortController(),
      timer = setTimeout(() => abort.abort(), 45000);
    try {
      res = await fetch(CFG.apiUrl, {
        signal: abort.signal,
        method: "POST",
        // text/plain = jednoduchá požiadavka bez predbežnej kontroly (Apps Script na OPTIONS neodpovedá)
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(Object.assign({ v: CFG.api }, body)),
        redirect: "follow",
      });
    } catch (e) {
      throw fail("offline", "Bez pripojenia. Skús to znova, keď budeš online.");
    } finally {
      clearTimeout(timer);
    }
    try {
      out = await res.json();
    } catch (e) {
      throw fail("server", "Server neodpovedal správne (" + res.status + "). Skús to o chvíľu.");
    }
    if (!out || out.ok !== true) {
      const err = fail((out && out.code) || "error", (out && out.error) || "Chyba servera.");
      if (err.code === "auth" && body.fn !== "pair") forget();
      if (err.code === "version") updateBar("Appka je zastaraná.");
      throw err;
    }
    return out.result;
  }

  /* ---------- párovanie ---------- */
  let unlock;
  const ready = new Promise((resolve) => (unlock = resolve));
  function forget() {
    store.del(KEY);
    saved.del("dashboard"); // bez platného kľúča v zariadení neostanú údaje; neodoslané zápisy (fronta) ostávajú
    showLock("Kľúč tohto zariadenia bol zrušený. Spáruj ho znova z dashboardu.");
  }
  function el(tag, props, children) {
    const n = Object.assign(document.createElement(tag), props || {});
    (children || []).forEach((c) => n.append(c));
    return n;
  }
  function showLock(message) {
    let box = document.getElementById("appkalock");
    if (box) box.remove();
    const input = el("input", {
      name: "code",
      autocomplete: "off",
      autocapitalize: "characters",
      placeholder: "napr. ABCD-EFGH",
    });
    const error = el("p", { className: "error", hidden: true });
    const button = el("button", { className: "btn primary", type: "submit", textContent: "Spárovať" });
    const form = el("form", {}, [
      el("label", { className: "field" }, ["Párovací kód z dashboardu", input]),
      error,
      el("div", { className: "formfoot" }, [button]),
    ]);
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      // celý odkaz (…#pair=KÓD) alebo samotný kód, s pomlčkou aj bez, malými aj veľkými písmenami
      const typed = input.value.includes("pair=") ? input.value.split("pair=").pop() : input.value;
      const m = /^[A-HJ-NP-Z2-9]{8}$/.exec(typed.toUpperCase().replace(/[^A-Z0-9]/g, ""));
      if (!m) {
        error.textContent = "Toto nevyzerá ako párovací kód.";
        error.hidden = false;
        return;
      }
      button.disabled = true;
      error.hidden = true;
      try {
        await pair(m[0]);
        location.reload();
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
        button.disabled = false;
      }
    });
    box = el("div", { id: "appkalock" }, [
      el("div", { className: "panel" }, [
        el("h2", { textContent: "Spárovanie zariadenia" }),
        el("p", {
          className: "muted",
          textContent:
            message ||
            "Appka ešte nie je prepojená s dashboardom. V dashboarde (napr. na počítači) otvor „Appka a zariadenia“, vytvor párovací kód a opíš ho sem. Kód platí 10 minút.",
        }),
        form,
      ]),
    ]);
    document.body.append(box);
  }
  async function pair(code) {
    const r = await post({ fn: "pair", args: [code] });
    store.set(KEY, r.token);
    return r;
  }
  async function start() {
    const m = /[#&]pair=([A-HJ-NP-Z2-9]{8})$/.exec(location.hash);
    if (m) {
      history.replaceState(null, "", location.pathname + location.search); // kód nenechávať v adrese ani v histórii
      try {
        await pair(m[1]);
      } catch (err) {
        if (!store.get(KEY)) return showLock(err.message);
      }
    }
    if (!store.get(KEY)) return showLock();
    unlock();
  }

  /* ---------- aktualizácia appky ---------- */
  function updateBar(text) {
    if (document.getElementById("appkaupdate")) return;
    const button = el("button", { className: "btn", textContent: "Aktualizovať" });
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
        if (reg && reg.waiting) reg.waiting.postMessage("skipWaiting");
        else location.reload();
      } catch (e) {
        location.reload();
      }
    });
    document.body.append(el("div", { id: "appkaupdate", role: "status" }, [el("span", { textContent: text }), button]));
  }
  if ("serviceWorker" in navigator) {
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) location.reload(); // nová verzia prevzala stránku
      hadController = true;
    });
    window.addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register("sw.js");
        const watch = (w) =>
          w &&
          w.addEventListener("statechange", () => {
            if (w.state === "installed" && navigator.serviceWorker.controller)
              updateBar("Je pripravená nová verzia appky.");
          });
        if (reg.waiting && navigator.serviceWorker.controller) updateBar("Je pripravená nová verzia appky.");
        watch(reg.installing);
        reg.addEventListener("updatefound", () => watch(reg.installing));
      } catch (e) {}
    });
  }

  window.APPKA = {
    build: CFG.build || "",
    // volanie servera; zápis dostane jedinečné číslo, podľa ktorého ho server nevykoná dvakrát
    async call(name, args) {
      await ready;
      // zápisy idú cez frontu (pwa/fronta.js): bez signálu počkajú v zariadení
      if (WRITES.includes(name) && this.write) return this.write(name, args[0]);
      return this.send(name, args, WRITES.includes(name) ? uuid() : "");
    },
    // jedno volanie servera; rid = číslo zápisu, podľa ktorého ho server nevykoná dvakrát
    async send(name, args, rid) {
      await ready;
      const body = { fn: name, args: args || [], token: store.get(KEY) };
      if (rid) body.rid = rid;
      const result = await post(body);
      // posledný dashboard si zariadenie uloží (tak, ako prišiel – skomprimovaný)
      if (name === "getDashboard") saved.set("dashboard", { at: Date.now(), result });
      return result;
    },
    // naposledy uložený dashboard: { at, result } alebo undefined (nespárované zariadenie nemá nič)
    savedDashboard() {
      return store.get(KEY) ? saved.get("dashboard") : Promise.resolve(undefined);
    },
    newId: uuid,
    // neodoslané zápisy; prežijú zatvorenie appky aj zrušenie kľúča, zmažú sa len pri odhlásení zariadenia
    queueStore: { get: () => saved.get("queue"), set: (list) => saved.set("queue", list) },
    async unpair() {
      try {
        await post({ fn: "unpair", token: store.get(KEY) });
      } catch (e) {}
      store.del(KEY);
      await saved.clear();
      location.reload();
    },
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
