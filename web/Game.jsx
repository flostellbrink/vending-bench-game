"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { locales } from "../src/dictionary/runtime.ts";
import { stationMessages as msg } from "./station-messages.ts";
import {
  commandGroups,
  completions,
  local,
  operatorText,
  parse,
  priceOrder,
  syntax,
  timing,
  toolFor,
} from "./commands.js";
import { knownOrders, observation } from "./reports.js";
import { BalanceScope } from "./BalanceScope.jsx";
import ObservationView, { timeLabel } from "./ObservationView.jsx";
import SiteDesk from "./SiteDesk.jsx";
import { readRun, saveRun, withRunLock } from "./runs.js";
import { World, clock, useClock } from "./World.jsx";
import releases from "../src/generated/releases.json";

const formatCash = (lang, currency) =>
  new Intl.NumberFormat(lang, { style: "currency", currency }).format;
const translate = (fn, lang, values = {}) => fn(values, { locale: lang });

function Scorecard({ state, rivals, best, archives, lang, t, screen, reports, openReport, money }) {
  const score = state?.final?.reward ?? null;
  return (
    <section className="sheet scorecard">
      <h2>{state?.over ? (state.failed ? t("bankrupt") : screen("complete")) : t("standings")}</h2>
      {score === null ? (
        <p>{t("unfinished")}</p>
      ) : (
        <strong className="final-score">{money(score, lang)}</strong>
      )}
      {!rivals.some((r) => r.kind === "model") && <p>{t("noRivals")}</p>}
      {state?.final && (
        <dl className="end-totals">
          <div>
            <dt>{t("revenue")}</dt>
            <dd>{money(state.final.gross_revenue, lang)}</dd>
          </div>
          <div>
            <dt>{t("siteFees")}</dt>
            <dd>{money(state.final.fees_paid, lang)}</dd>
          </div>
          <div>
            <dt>{t("units")}</dt>
            <dd>{state.final.units_sold}</dd>
          </div>
        </dl>
      )}
      <table>
        <thead>
          <tr>
            <th>{t("standings")}</th>
            <th>{t("score")}</th>
            <th>{t("difference")}</th>
          </tr>
        </thead>
        <tbody>
          {[
            ...(best ? [{ name: t("previousBest"), score: best.score }] : []),
            ...rivals.map((r) => ({
              name: r.kind === "script" ? translate(msg.fields.bot, lang) : r.name,
              score: r.score ?? r.values?.at(-1),
            })),
          ].map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{money(row.score, lang)}</td>
              <td>{score === null ? "—" : money(score - row.score, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {reports.some((r) => r.openingCash !== r.closingCash) && (
        <details open={state?.over}>
          <summary>{t("cashEvents")}</summary>
          <table>
            <thead>
              <tr>
                <th>{t("day")}</th>
                <th>{t("results")}</th>
                <th>{t("cashChange")}</th>
                <th>{t("bank")}</th>
              </tr>
            </thead>
            <tbody>
              {reports
                .filter((r) => r.openingCash !== r.closingCash)
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.day} · {clock(r.minute)}
                    </td>
                    <td>
                      <button className="receipt-link" onClick={() => openReport(r.id)}>
                        #{r.id} {r.line}
                      </button>
                    </td>
                    <td>{money(r.closingCash - r.openingCash, lang)}</td>
                    <td>{money(r.closingCash, lang)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
      {archives.map((archive) => (
        <details key={archive.source + archive.days + archive.seed}>
          <summary>
            {t("archive")} · v{archive.version} · {archive.days}d / {archive.seed}
          </summary>
          {archive.scores.map(([name, value]) => (
            <div className="manual" key={name}>
              {name}
              <b>{money(value, lang)}</b>
            </div>
          ))}
          <a href={archive.source}>Prosus Vending Bench v{archive.version}</a>
        </details>
      ))}
    </section>
  );
}

function CommandIndex({ actions, state, lang, t, openBrief }) {
  return (
    <section className="sheet">
      <h2>{t("help")}</h2>
      <p>
        {t("notation")} ·{" "}
        <button className="receipt-link" onClick={openBrief}>
          {t("rules")}
        </button>
      </p>
      {Object.entries(commandGroups).map(([group, names]) => (
        <section key={group}>
          <h3>{t(group)}</h3>
          {names
            .filter((v) => toolFor(v) in actions)
            .map((v) => (
              <div className="manual" key={v}>
                <code>{syntax(v)}</code>
                <span>{translate(msg.commands[toolFor(v)], lang)}</span>
                <small>{timeLabel(v, state, t)}</small>
              </div>
            ))}
        </section>
      ))}
      <h3>{t("local")}</h3>
      <p>{local.map(syntax).join(" · ")}</p>
    </section>
  );
}

const OfficeDisplay = memo(function OfficeDisplay({
  state,
  release,
  lang,
  line,
  reports,
  t,
  selectedSite,
  onSiteSelect,
  previewVerb,
}) {
  const time = useClock(state);
  const day = Math.floor(time / 1440);
  const date =
    state?.startDate &&
    new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" }).format(
      Date.parse(state.startDate + "T00:00Z") + day * 86400000,
    );
  const estimate = timing(previewVerb, state);
  const shift = state ? state.closes - state.opens : 1;
  const spent = state ? Math.max(0, Math.min(1, ((time % 1440) - state.opens) / shift)) : 0;
  const preview = estimate ? Math.min(1 - spent, estimate.minutes / shift) : 0;
  return (
    <>
      <div className="surface">
        <World
          value={time}
          state={state}
          line={line}
          t={t}
          reports={reports}
          selectedSite={selectedSite}
          onSiteSelect={onSiteSelect}
        />
      </div>
      <div className="transport">
        <b>
          {t("day")} {Math.min(release.days, day + 1)} / {release.days}
        </b>
        <span>{date}</span>
        {state && (
          <div className="shift">
            <small>{clock(state.opens)}</small>
            <div className="shift-track" aria-hidden="true">
              <i style={{ width: spent * 100 + "%" }} />
              <i className="shift-preview" style={{ width: preview * 100 + "%" }} />
            </div>
            <small>{clock(state.closes)}</small>
          </div>
        )}
        {estimate && <small className="clock-estimate">+{estimate.minutes} min</small>}
        <strong>{clock(time)}</strong>
      </div>
    </>
  );
});

const Receipts = memo(function Receipts({ lines, lang, openReport }) {
  const day = translate(msg.operator.day, lang),
    result = translate(msg.operator.results, lang);
  return lines.map((r) => (
    <div className="receipt" key={r.id}>
      <small>
        {day} {r.day} · {clock(r.minute)}
      </small>
      <div>
        <b className="prompt-char">$</b> {r.line}
      </div>
      {r.localText ? (
        <pre className="shell-reply">{r.localText}</pre>
      ) : (
        <button onClick={() => openReport(r.id)}>
          #{r.id}{" "}
          {r.mail?.subject ??
            r.terms?.order ??
            (r.directory.length
              ? r.directory.map((entry) => entry.name).join(" · ")
              : r.rows.length
                ? r.rows.length + " " + result
                : r.tool === "wait_for_next_day"
                  ? translate(msg.operator.statement, lang) + " · " + day + " " + r.day
                  : r.display.split("\n")[0].slice(0, 110))}
        </button>
      )}
    </div>
  ));
});

function Station({ release, lang, changeLang, changeRelease }) {
  const money = useMemo(() => formatCash(lang, release.currency), [lang, release.currency]);
  const t = useCallback(
    (k, values) => (msg.operator[k] ? translate(msg.operator[k], lang, values) : k),
    [lang],
  );
  const screen = (k) => translate(msg.screen[k], lang);
  const [state, setState] = useState(null),
    [actions, setActions] = useState({});
  const [reports, setReports] = useState([]),
    [lines, setLines] = useState([]),
    [tab, setTab] = useState("world");
  const [line, setLine] = useState(""),
    [pick, setPick] = useState(0),
    [recall, setRecall] = useState(-1);
  const [drafts, setDrafts] = useState({});
  const [site, setSite] = useState(null);
  const [controlVerb, setControlVerb] = useState("");
  const openSite = useCallback((id) => {
    setSite(id);
    setTab("site:" + id);
  }, []);
  const [history, setHistory] = useState([]),
    [rivals, setRivals] = useState([]);
  const [best, setBest] = useState(null);
  const [saveIssue, setSaveIssue] = useState("");
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [epoch, reset] = useState(0);
  const [boot, setBoot] = useState(null);
  const [browse, setBrowse] = useState(false),
    [caret, setCaret] = useState(0);
  const worker = useRef(null),
    pending = useRef(null),
    journal = useRef([]),
    prompt = useRef(null),
    log = useRef(null),
    follow = useRef(true);
  const latestSave = useRef(null);
  const key = "vending:" + release.revision + ":" + release.seed;
  const recordKey = key + ":" + release.days + ":record";
  useEffect(() => {
    const w = new Worker("/worker.js");
    worker.current = w;
    return () => w.terminate();
  }, [release]);
  useEffect(() => {
    let live = true;
    let balances = [];
    setDrafts({});
    setControlVerb("");
    let serialized = null,
      opponent = null;
    const first = !localStorage.getItem("vendix.booted");
    setBoot(first ? [] : null);
    const w = worker.current;
    pending.current = null;
    setBusy(true);
    setState(null);
    setReports([]);
    setLines([]);
    setTab("world");
    setLine("");
    setError("");
    setHistory([]);
    setRivals([]);
    const fail = (err) => {
      if (live) {
        setError(String(err));
        setBusy(false);
      }
    };
    w.onerror = (e) => fail(e.message);
    async function receive({ data }) {
      if (!live) return;
      if (data.boot) {
        if (first) setBoot((old) => [...(old || []), data.boot]);
        return;
      }
      if (data.error) {
        pending.current = null;
        fail(data.error);
        return;
      }
      const run = pending.current;
      const entries = run ? [run] : journal.current;
      const offset = run ? journal.current.length : 0;
      const results = data.receipts.map((r, i) => ({
        ...observation(r, entries[i].move, offset + i + 1),
        line: entries[i].line,
      }));
      balances = run ? [...balances, ...data.history.slice(1)] : data.history;
      setHistory(balances);
      if (run) {
        const nextMoves = [...journal.current, run];
        try {
          serialized = await withRunLock(key, () =>
            saveRun(localStorage, key, serialized, nextMoves, opponent),
          );
          latestSave.current = serialized;
          if (!live) return;
        } catch (e) {
          pending.current = null;
          setSaveIssue(e.message === "changed" ? "saveConflict" : "saveFailed");
          reset((n) => n + 1);
          return;
        }
        journal.current = nextMoves;
        setReports((old) => [...old, ...results]);
        setLines((old) => [...old, ...results]);
        const r = results[0];
        setTab(r.id);
      } else {
        setReports(results);
        setLines(results);
        if (first) {
          setBoot((old) => [...(old || []), "ready"]);
          localStorage.setItem("vendix.booted", "1");
        }
      }
      if (data.state.over) {
        setTab("scores");
        if (!data.state.failed && balances.length === release.days + 1) {
          const score = data.state.final.reward;
          try {
            await withRunLock(recordKey, () => {
              const previous = JSON.parse(localStorage.getItem(recordKey) || "null");
              if (!previous || score > previous.score)
                localStorage.setItem(recordKey, JSON.stringify({ score, values: balances }));
            });
          } catch {
            setSaveIssue("saveFailed");
          }
        }
      }
      pending.current = null;
      setState(data.state);
      setActions(data.actions);
      setBusy(false);
    }
    w.onmessage = receive;
    try {
      serialized = localStorage.getItem(key);
      latestSave.current = serialized;
      const saved = readRun(serialized, JSON.parse(localStorage.getItem(recordKey) || "null"));
      opponent = saved.opponent;
      setBest(opponent);
      journal.current = saved.moves;
      w.postMessage({ release, moves: journal.current.map((e) => e.move) });
    } catch (e) {
      fail(e.message);
    }
    Promise.all(
      release.rivals.map(async (r) => {
        if (!r.balances) return r;
        const response = await fetch("/" + r.balances);
        if (!response.ok) throw Error("Reference data unavailable");
        return { ...r, values: await response.json() };
      }),
    )
      .then((rs) => {
        if (live) setRivals(rs);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
      w.onmessage = null;
      w.onerror = null;
    };
  }, [release, key, recordKey, epoch]);
  useEffect(() => {
    if (follow.current && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [lines]);
  useLayoutEffect(() => {
    const input = prompt.current;
    if (!input) return;
    const fit = () => {
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
    };
    fit();
    if (document.activeElement === input && (line || browse)) {
      const surface = log.current;
      if (surface && input.getBoundingClientRect().bottom > surface.getBoundingClientRect().bottom)
        surface.scrollTop = surface.scrollHeight;
    }
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [line, browse]);
  const verb = line.trim().split(/\s+/)[0],
    tool = toolFor(verb);
  const estimate = tool ? timeLabel(verb, state, t) : "";
  const prefix = line.slice(0, caret);
  const choices = state ? completions(prefix, state, actions, reports) : [];
  const orderEstimate = priceOrder(line, state, actions, reports);
  const observations = useMemo(
    () =>
      Object.assign(
        {},
        ...reports.map((r) =>
          Object.fromEntries(
            Object.entries(r.slots).map(([k, v]) => [
              k.toLowerCase().replace(/^ai-/, "").replaceAll(":", "."),
              { ...v, day: r.day, minute: r.minute },
            ]),
          ),
        ),
      ),
    [reports],
  );
  const selected = reports.find((r) => r.id === tab);
  const recent = reports.slice(-3);
  const orders = useMemo(() => knownOrders(reports), [reports]);
  function edit(s, pos = s.length) {
    if (s) setSite(null);
    setLine(s);
    setCaret(pos);
    setBrowse(Boolean(s));
    setPick(0);
    setRecall(-1);
    setError("");
  }
  function complete(value) {
    if (!value) return;
    const left = prefix.replace(/\S*$/, value + " ");
    edit(left + line.slice(caret).replace(/^\S*\s*/, ""), left.length);
    prompt.current?.focus();
    requestAnimationFrame(() => prompt.current?.setSelectionRange(left.length, left.length));
  }
  function runCommand(command, fromPrompt = false) {
    const raw = command.trim();
    const verb = raw.split(/\s+/)[0].toLowerCase();
    if (!raw || !state || busy || pending.current) return;
    setControlVerb("");
    setSaveIssue("");
    if (local.includes(verb)) {
      if (verb === "help") {
        const topic = raw.split(/\s+/)[1];
        if (topic && !toolFor(topic) && !local.includes(topic)) {
          setError("help [command]");
          return;
        }
        const description = topic && release.tools?.[toolFor(topic)];
        const text = topic
          ? syntax(topic) +
            (msg.commands[toolFor(topic)]
              ? " — " + translate(msg.commands[toolFor(topic)], lang)
              : "") +
            " · " +
            timeLabel(topic, state, t) +
            (description ? "\n" + operatorText(description) : "")
          : [
              ...Object.entries(commandGroups).map(
                ([group, vs]) =>
                  t(group) + ": " + vs.filter((v) => toolFor(v) in actions).join("  "),
              ),
              t("local") + ": " + local.join("  "),
              "help [command]",
            ].join("\n");
        setLines((old) => [
          ...old,
          {
            id: "help-" + old.length,
            line: raw,
            day: state.day,
            minute: state.minute,
            localText: text,
          },
        ]);
        edit("");
        return;
      }
      const id = Number(raw.split(/\s+/)[1]);
      if (verb === "view" && !reports.some((r) => r.id === id)) {
        setError("view <1…" + reports.length + ">");
        return;
      }
      setTab(verb === "view" ? id : verb === "balance" ? "world" : verb);
      edit("");
      return;
    }
    if (state.over) {
      setError(screen("complete"));
      return;
    }
    try {
      const move = parse(raw, state, actions);
      pending.current = { move, line: raw };
      setBusy(true);
      setSite(null);
      worker.current.postMessage({ moves: [move] });
      if (fromPrompt) edit("");
    } catch (err) {
      setError(err.message);
    }
  }
  function keys(e) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runCommand(line, true);
      return;
    }
    if (e.key === "Tab" && choices.length && !e.shiftKey) {
      e.preventDefault();
      if (browse) complete(choices[pick]);
      else setBrowse(true);
    }
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      if (!browse && line.includes("\n")) {
        const before = line.slice(0, e.currentTarget.selectionStart),
          after = line.slice(e.currentTarget.selectionEnd);
        if (
          (e.key === "ArrowUp" && before.includes("\n")) ||
          (e.key === "ArrowDown" && after.includes("\n"))
        )
          return;
      }
      const delta = e.key === "ArrowUp" ? -1 : 1;
      e.preventDefault();
      if (browse && choices.length && recall < 0) {
        setPick((pick + delta + choices.length) % choices.length);
        return;
      }
      const i = Math.max(-1, Math.min(journal.current.length - 1, recall - delta));
      setRecall(i);
      setLine(i < 0 ? "" : journal.current.at(-i - 1).line);
      setPick(0);
    }
    if (e.key === "Escape") {
      setBrowse(false);
      setPick(0);
    }
  }
  async function newRun() {
    if (busy || !confirm(screen("discard"))) return;
    setBusy(true);
    try {
      await withRunLock(key, () => {
        if (localStorage.getItem(key) !== latestSave.current) throw Error("changed");
        localStorage.removeItem(key);
      });
      setSaveIssue("");
    } catch {
      setSaveIssue("saveConflict");
    }
    reset((n) => n + 1);
  }
  const resultButton = (id, label) => (
    <button
      key={id}
      className={tab === id ? "selected" : ""}
      onClick={() => {
        setTab(id);
        prompt.current?.focus();
      }}
    >
      {label}
    </button>
  );
  return (
    <main className="station">
      <header className="mast">
        <h1>
          <i className="brand-mark" aria-hidden="true" />
          Vending Bench
        </h1>
        <span className="operator">{t("operator")}</span>
        <i className="vent" aria-hidden="true" />
        <select
          aria-label="Benchmark"
          value={release.id}
          disabled={busy}
          onChange={(e) => changeRelease(e.target.value)}
        >
          {releases.map((r) => (
            <option key={r.id}>{r.id}</option>
          ))}
        </select>
        <select
          aria-label="Language / Idioma / Sprache"
          value={lang}
          disabled={busy}
          onChange={(e) => changeLang(e.target.value)}
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
        <strong>{state ? money(state.cash, lang) : "—"}</strong>
      </header>
      <div className="desk">
        <aside className="shell">
          <header>
            <b>{t("terminal")}</b>
            <span className={"lamp" + (busy ? " working" : "")}>TTY / 01</span>
          </header>
          <div
            className="scrollback"
            ref={log}
            onClick={(e) => {
              if (
                !e.target.closest("button,textarea,select,a") &&
                !window.getSelection()?.toString()
              )
                prompt.current?.focus();
            }}
            onScroll={(e) => {
              const n = e.currentTarget;
              follow.current = n.scrollHeight - n.clientHeight - n.scrollTop < 24;
            }}
          >
            {boot && (
              <div className="boot">
                <pre aria-label="VENDIX/OS">{` .-------.    VENDIX/OS
 | o o o |    Unattended Retail Systems
 | o o o |
 | [___] |
 '-------'`}</pre>
                <div role="status">
                  {boot.map((stage) => (
                    <div key={stage}>{t(stage)}</div>
                  ))}
                </div>
              </div>
            )}
            {!lines.length && (
              <>
                <p>{t("objective", { days: release.days })}</p>
                {!release.rivals.some(r=>r.kind==="model")&&<p>{t("noRivals")}</p>}
                <p>{t("hint")}</p>
              </>
            )}
            <Receipts lines={lines} lang={lang} openReport={setTab} />
          </div>
          <div className="input-zone">
            {browse && choices.length > 0 && (
              <div className="completion">
                {choices.slice(Math.floor(pick / 5) * 5, Math.floor(pick / 5) * 5 + 5).map((s) => (
                  <button
                    key={s}
                    className={choices[pick] === s ? "active" : ""}
                    onClick={() => complete(s)}
                  >
                    {s}
                    <small>
                      {observations[s]
                        ? observations[s].qty +
                          "/" +
                          observations[s].capacity +
                          " · " +
                          t("day") +
                          " " +
                          observations[s].day +
                          " " +
                          clock(observations[s].minute)
                        : msg.commands[toolFor(s)]
                          ? translate(msg.commands[toolFor(s)], lang)
                          : ""}
                    </small>
                  </button>
                ))}
              </div>
            )}
            {tool && (
              <small>
                {syntax(verb)} · {estimate}
              </small>
            )}
            {orderEstimate && (
              <div className="order-estimate">
                <b>{t(orderEstimate.status)}</b>
                {orderEstimate.cost != null && (
                  <>
                    {" "}
                    · {money(orderEstimate.cost, lang)} · {t("afterOrder")}:{" "}
                    {money(orderEstimate.remaining, lang)}
                  </>
                )}
                {orderEstimate.status === "belowMinimum" && (
                  <>
                    {" "}
                    · {t("minimum")}: {money(orderEstimate.minimum, lang)}
                  </>
                )}
              </div>
            )}
            {error && <p role="alert">{error}</p>}
            {saveIssue && <p role="alert">{t(saveIssue)}</p>}
            <div className="command-line">
              <span aria-hidden="true">›</span>
              <textarea
                autoFocus
                rows={1}
                id="prompt"
                ref={prompt}
                value={line}
                aria-label={t("query")}
                enterKeyHint="send"
                autoComplete="off"
                spellCheck="false"
                autoCapitalize="none"
                onChange={(e) => edit(e.target.value, e.target.selectionStart)}
                onSelect={(e) => setCaret(e.target.selectionStart)}
                onKeyDown={keys}
              />
            </div>
          </div>
          <div className="terminal-keys">
            <small>
              {busy
                ? screen("loading")
                : "Tab " + t("completeKey") + " · Enter " + t("execute") + " · ↑ " + t("history")}
            </small>
          </div>
        </aside>
        <section
          className="workspace"
          onPointerOver={(e) =>
            setControlVerb(e.target.closest("[data-clock-verb]")?.dataset.clockVerb || "")
          }
          onPointerLeave={() => setControlVerb("")}
          onFocusCapture={(e) =>
            setControlVerb(e.target.closest("[data-clock-verb]")?.dataset.clockVerb || "")
          }
          onBlurCapture={() => setControlVerb("")}
        >
          <OfficeDisplay
            {...{ state, release, lang, line, reports, t }}
            previewVerb={controlVerb || verb}
            selectedSite={site}
            onSiteSelect={openSite}
          />
          <nav className="tabs">
            {resultButton("world", t("bank"))}
            {resultButton("tabs", t("results") + " " + reports.length)}
            {orders.length > 0 && resultButton("orders", t("orders"))}
            {resultButton("help", t("help"))}
            {resultButton("scores", t("standings"))}
            {recent.map((r) => resultButton(r.id, "#" + r.id + " " + r.line.split(" ")[0]))}
          </nav>
          <div className="readout" key={tab}>
            {tab === "world" ? (
              <BalanceScope
                key={epoch}
                history={history}
                rivals={rivals}
                best={best}
                release={release}
                t={t}
                lang={lang}
                playerName={translate(msg.fields.player, lang)}
                scriptName={translate(msg.fields.bot, lang)}
              />
            ) : selected ? (
              <ObservationView
                key={selected.id}
                report={selected}
                state={state}
                t={t}
                lang={lang}
                money={money}
                runCommand={runCommand}
                disabled={busy || state.over}
                draft={drafts[selected.id]}
                updateDraft={(id, draft) => setDrafts((current) => ({ ...current, [id]: draft }))}
              />
            ) : typeof tab === "string" && tab.startsWith("site:") && state ? (
              <SiteDesk
                key={tab}
                site={tab.slice(5)}
                {...{ state, t, reports, runCommand }}
                openReport={setTab}
                disabled={busy || state.over}
              />
            ) : tab === "orders" ? (
              <section className="sheet">
                <h2>{t("orders")}</h2>
                {!orders.length && <p>{t("empty")}</p>}
                {orders.map((o) => (
                  <div key={o.order} className="order-entry">
                    <b>{o.order}</b> · {o.supplier} · {money(o.paid, lang)}
                    <div>
                      {o.arrival
                        ? t(o.arrival.short ? "incompleteOrder" : "arrived") +
                          " · " +
                          t("day") +
                          " " +
                          o.arrival.day
                        : t("expectedClose") + " " + o.eta}
                    </div>
                    <button className="receipt-link" onClick={() => setTab(o.id)}>
                      {t("source")} #{o.id}
                    </button>
                    {o.arrival && (
                      <>
                        {" "}
                        ·{" "}
                        <button className="receipt-link" onClick={() => setTab(o.arrival.id)}>
                          {t("arrived")} #{o.arrival.id}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </section>
            ) : tab === "help" ? (
              <CommandIndex
                actions={actions}
                state={state}
                lang={lang}
                t={t}
                openBrief={() => setTab("brief")}
              />
            ) : tab === "brief" ? (
              <section className="sheet brief">
                <h2>
                  {t("rules")} · {release.id}
                </h2>
                <p>
                  {t("day")} {state?.days} · {clock(state?.opens ?? 0)}–{clock(state?.closes ?? 0)}{" "}
                  · {t("fee")} {money(state?.fee ?? 0, lang)}
                </p>
                {operatorText(release.brief ?? "")
                  .split(/\n\s*\n/)
                  .map((s, i) => {
                    const clean = s.trim().replaceAll("**", "");
                    return /^\*\*[^*]+\*\*$/.test(s.trim()) ? (
                      <h3 key={i}>{clean}</h3>
                    ) : (
                      <p key={i} lang="en">
                        {clean.replace(/\n(?!-)/g, " ")}
                      </p>
                    );
                  })}
              </section>
            ) : tab === "scores" ? (
              <Scorecard
                state={state}
                rivals={rivals}
                best={best}
                archives={release.archives}
                lang={lang}
                t={t}
                screen={screen}
                reports={reports}
                openReport={setTab}
                money={money}
              />
            ) : (
              <section className="sheet">
                <h2>{t("results")}</h2>
                {!reports.length && t("empty")}
                {reports
                  .slice()
                  .reverse()
                  .map((r) => (
                    <button className="catalog" key={r.id} onClick={() => setTab(r.id)}>
                      #{r.id} · {clock(r.minute)} · {r.line}
                    </button>
                  ))}
              </section>
            )}
          </div>
        </section>
      </div>
      <footer>
        <span>
          {state?.over
            ? t("score") + " · " + money(state.failed ? 0 : Math.max(0, state.cash), lang)
            : "Vending Bench / " + release.id + " · Seed " + release.seed}
        </span>
        <button disabled={busy} onClick={newRun}>
          {screen("reset")}
        </button>
      </footer>
    </main>
  );
}

export default function Game({ lang }) {
  const [id, setId] = useState(releases[0].id);
  useEffect(() => {
    const update = () => {
      const revision = new URL(location.href).searchParams.get("bench");
      setId((releases.find((r) => r.revision === revision) ?? releases[0]).id);
    };
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  function selectRelease(id) {
    const url = new URL(location.href);
    url.searchParams.set("bench", releases.find((r) => r.id === id).revision);
    window.history.pushState(null, "", url);
    setId(id);
  }
  return (
    <Station
      key={id}
      release={releases.find((r) => r.id === id)}
      lang={lang}
      changeRelease={selectRelease}
      changeLang={(l) => {
        localStorage.language = l;
        window.location.assign("/" + l + "/" + location.search + location.hash);
      }}
    />
  );
}
