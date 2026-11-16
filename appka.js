/* Beh appky mimo Apps Scriptu: spojenie so serverom (doPost v src/Appka.js), párovanie zariadenia, aktualizácie.
   Načíta sa pred skriptom dashboardu (src/App.html), ktorý cez window.APPKA posiela všetky volania servera.
   Kľúč zariadenia je uložený len v tomto prehliadači. */
(function () {
  "use strict";
  const CFG = window.APPKA_CONFIG || {};
  const KEY = "ensafe.kluc";
  const WRITES = ["saveCall", "saveActivity", "updateCall", "completeTask", "setStatus"];
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
  function fail(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  async function post(body) {
    if (!CFG.apiUrl) throw fail("config", "Appka nemá nastavenú adresu servera.");
    let res, out;
    try {
      res = await fetch(CFG.apiUrl, {
        method: "POST",
        // text/plain = jednoduchá požiadavka bez predbežnej kontroly (Apps Script na OPTIONS neodpovedá)
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(Object.assign({ v: CFG.api }, body)),
        redirect: "follow",
      });
    } catch (e) {
      throw fail("offline", "Bez pripojenia. Skús to znova, keď budeš online.");
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
    const input = el("input", { name: "code", autocomplete: "off", placeholder: "Párovací odkaz alebo kód" });
    const error = el("p", { className: "error", hidden: true });
    const button = el("button", { className: "btn primary", type: "submit", textContent: "Spárovať" });
    const form = el("form", {}, [
      el("label", { className: "field" }, ["Párovací odkaz alebo kód", input]),
      error,
      el("div", { className: "formfoot" }, [button]),
    ]);
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const m = /[a-f0-9]{32}/.exec(input.value);
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
            "Appka ešte nie je prepojená s dashboardom. V dashboarde otvor „Appka a zariadenia“ a zvoľ „Pripojiť toto zariadenie“ – otvorí sa odkaz, ktorý appku spáruje.",
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
    const m = /[#&]pair=([a-f0-9]{32})/.exec(location.hash);
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
      const body = { fn: name, args: args || [], token: store.get(KEY) };
      if (WRITES.includes(name)) body.rid = uuid();
      return post(body);
    },
    async unpair() {
      try {
        await post({ fn: "unpair", token: store.get(KEY) });
      } catch (e) {}
      store.del(KEY);
      location.reload();
    },
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
