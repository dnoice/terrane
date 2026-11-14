/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Scale Scenario (Terrane Edition - v1.0)
 *     - File Name: scale.mjs
 *     - Relative Path: tools/ui-scenarios/scale.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release. In region mode, until the service answers them,
 *       the tour's search and survey steps note that they are not
 *       available at this size; a folder walked counts as reached when you
 *       are in it or below it, its region held; the region requests'
 *       timings, the entries held and whether a worker decodes are
 *       recorded; async trace events (b/e, as measures are traced) pair,
 *       so a long task is named by its terrane:* measure. After the
 *       review: the exit criteria are checked at 400,000 entries or more,
 *       either way the page holds the tree, and in regions the tour lowers
 *       the budget, lets regions go and walks down again over it.
 *
 * ✒ Description:
 *     Measures the page over a synthetic snapshot: how soon the first box
 *     is drawn, how much JavaScript heap the page holds when settled and
 *     through a tour a person drives by keyboard, how long its longest
 *     script task runs, and what the service holds. It prints one line,
 *     SCALE {...}, which tools/scale.mjs collects point by point; it
 *     checks the Stage 4 exit criteria at 400,000 entries or more,
 *     whichever way the page holds the tree.
 *
 * ✒ Key Features:
 *     - Runs only on a synthetic snapshot (data 'synthetic'), in both
 *       passes, with a timeout of 15 minutes
 *     - Settled: garbage collected, then Runtime.getHeapUsage and
 *       Performance.getMetrics (JSHeapUsedSize, JSHeapTotalSize, Nodes,
 *       TaskDuration, ScriptDuration)
 *     - The tour by keyboard: the overview (0), eight levels down through
 *       the ledger (the child folder with the most folders beneath, by
 *       the cursor and Enter), a search and a reveal from Findings, a
 *       second search typed over the first (its text selected in the
 *       page, since a DevTools Ctrl+A selects nothing in a field), the
 *       Survey tab and a reveal from Largest files,
 *       then Backspace eight times and 0
 *     - With WebGL, a trace of the tour on the page's session (toplevel,
 *       devtools.timeline, v8.execute, blink.user_timing and V8's GC),
 *       read for the renderer's main thread: each top-level task's script
 *       time as the union of its script intervals, the longest and what
 *       ran in it, the longest task, the tasks over 16 and 50 ms of
 *       script, the longest GC; long animation frames as a cross-check
 *     - The heap sampled every 500 ms for its peak; after the tour, and
 *       after the tour and a collection
 *     - What the page holds (whole tree or regions), the service's memory
 *       and load time (GET /api/tree?peek=1, which starts nothing), and
 *       the first box again after a reload
 *     - Without WebGL the overview and the trace are left out and the
 *       heap is still measured
 *     - In region mode: held entries and regions, region requests' median
 *       and 95th percentile, bytes read and whether the worker decoded
 *       them; the search and the survey answered by the service, each
 *       answer's time in the page and in the service (T.asked), and the
 *       second search waited for until its own answer has landed
 *     - The five tasks with the most script, each with the time every
 *       terrane:* measure took inside it (frames.longestTasks), and for
 *       evict, relayout and paint the longest and its task's script time
 *       (frames.byMeasure)
 *     - In regions the budget: lowered to half of what the tour holds,
 *       regions let go once the view settles, the heap read after it, then
 *       three levels walked down again over the lower budget
 *       (tour.budget); checked like the exit criteria
 *
 * ✒ Usage Instructions:
 *     node tools/make-synthetic.mjs --entries 100k --out <dir>
 *     node tools/ui-check.mjs scale --snapshot <dir> --no-shots --no-baseline
 *         --pass webgl --service-heap 1024 --ready-ms 600000 --min-free 6
 *     tools/scale.mjs runs it point by point and reads its SCALE line.
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t, t.page, t.meta);
 *       the DevTools Tracing, Performance, HeapProfiler and Runtime domains
 *     - Compatible platforms: Node.js 22.5+; Edge or Chrome
 *     - Tracing adds its own cost, so traced task times can read longer
 *       than untraced ones; the long-animation-frame figure is beside them
 * ----------------------------------------------------------------------------
 */

const MB = 1024 * 1024;
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
const TASKS = new Set(['RunTask', 'ThreadControllerImpl::RunTask']);
const SCRIPT = new Set(['FunctionCall', 'EvaluateScript', 'TimerFire', 'FireAnimationFrame', 'EventDispatch', 'RunMicrotasks', 'V8.Execute']);
const isScript = (name) => SCRIPT.has(name) || name.startsWith('v8.compile');
const isGC = (name) => /GC/.test(name) && !/GCEvent|Idle/.test(name);
const CATEGORIES = 'toplevel,devtools.timeline,v8.execute,blink.user_timing,disabled-by-default-v8.gc';

/** Performance.getMetrics as an object. */
async function metrics(t) {
  const { metrics: list } = await t.page.send('Performance.getMetrics');
  return Object.fromEntries(list.map((m) => [m.name, m.value]));
}

/** Collects garbage, then reads the heap: MB figures and the DOM node count. */
async function heap(t, { gc = true } = {}) {
  if (gc) await t.page.send('HeapProfiler.collectGarbage');
  const u = await t.page.send('Runtime.getHeapUsage');
  const m = await metrics(t);
  return {
    usedMB: r1(u.usedSize / MB), totalMB: r1(u.totalSize / MB), jsHeapUsedMB: r1(m.JSHeapUsedSize / MB), jsHeapTotalMB: r1(m.JSHeapTotalSize / MB),
    nodes: m.Nodes, taskDuration: r1(m.TaskDuration), scriptDuration: r1(m.ScriptDuration),
  };
}

/**
 * Intervals [start, end] (µs) of the events that pass keep on one thread:
 * X events, B/E pairs, and b/e pairs (async events, as user timing's
 * measures are traced), matched by name and id.
 */
function intervals(events, keep) {
  const out = [];
  const open = new Map();
  const key = (e) => (e.ph === 'b' || e.ph === 'e' ? `${e.name}|${e.id ?? e.id2?.local ?? e.id2?.global ?? ''}` : e.name);
  for (const e of events) {
    if (!keep(e.name)) continue;
    if (e.ph === 'X') out.push([e.ts, e.ts + (e.dur || 0), e]);
    else if (e.ph === 'B' || e.ph === 'b') {
      const k = key(e);
      if (!open.has(k)) open.set(k, []);
      open.get(k).push(e);
    } else if (e.ph === 'E' || e.ph === 'e') {
      const b = open.get(key(e))?.pop();
      if (b) out.push([b.ts, e.ts, b]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/**
 * Reads a trace: the renderer's main thread, its top-level tasks, and
 * each task's script time as the union of its script intervals.
 */
function analyse(events) {
  const names = new Map();
  for (const e of events) if (e.ph === 'M' && e.name === 'thread_name') names.set(`${e.pid}:${e.tid}`, e.args?.name);
  const calls = new Map();
  for (const e of events) {
    if (e.name !== 'FunctionCall') continue;
    const k = `${e.pid}:${e.tid}`;
    if (names.get(k) === 'CrRendererMain') calls.set(k, (calls.get(k) || 0) + 1);
  }
  const main = [...calls].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!main) return { thread: null, tasks: 0 };
  const mine = events.filter((e) => `${e.pid}:${e.tid}` === main);
  // Top-level tasks: a task inside another is part of it.
  const tasks = [];
  for (const iv of intervals(mine, (n) => TASKS.has(n))) {
    const last = tasks.at(-1);
    if (last && iv[0] >= last[0] && iv[1] <= last[1]) continue;
    tasks.push(iv);
  }
  const scripts = intervals(mine, isScript);
  const calls2 = intervals(mine, (n) => n === 'FunctionCall');
  const gcs = intervals(mine, isGC);
  const marks = intervals(events.filter((e) => String(e.name).startsWith('terrane:')), () => true);
  let j = 0;
  let longest = null;
  let longestTask = 0;
  let over16 = 0;
  let over50 = 0;
  // The five tasks with the most script, for what each terrane:* measure took inside them.
  const top = [];
  for (const [a, b] of tasks) {
    while (j < scripts.length && scripts[j][1] <= a) j++;
    let sum = 0;
    let cur = -Infinity;
    for (let k = j; k < scripts.length && scripts[k][0] < b; k++) {
      const s = Math.max(scripts[k][0], a, cur);
      const e = Math.min(scripts[k][1], b);
      if (e > s) {
        sum += e - s;
        cur = e;
      }
    }
    const ms = sum / 1000;
    if (ms > 16) over16++;
    if (ms > 50) over50++;
    if ((b - a) / 1000 > longestTask) longestTask = (b - a) / 1000;
    if (!longest || ms > longest.ms) longest = { ms, a, b };
    if (top.length < 5 || ms > top.at(-1).ms) {
      top.push({ ms, a, b });
      top.sort((x, y) => y.ms - x.ms);
      if (top.length > 5) top.pop();
    }
  }
  const measuresIn = ({ a, b }) => marks.filter(([s, e]) => s < b && e > a).map(([s, e, ev]) => `${ev.name.slice(8)} ${r1((Math.min(e, b) - Math.max(s, a)) / 1000)}`);
  // For evict, relayout and paint: the longest of each, how many there were,
  // and the script time of the task the longest ran in.
  const byMeasure = {};
  for (const name of ['evict', 'relayout', 'paint']) {
    const list = marks.filter(([, , ev]) => ev.name === `terrane:${name}`);
    if (!list.length) continue;
    const top2 = list.reduce((m, iv) => (iv[1] - iv[0] > m[1] - m[0] ? iv : m));
    const task = tasks.find(([a, b]) => top2[0] >= a && top2[1] <= b);
    let scriptMs = null;
    if (task) {
      let sum = 0;
      let cur = -Infinity;
      for (const [s0, e0] of scripts) {
        if (e0 <= task[0] || s0 >= task[1]) continue;
        const s = Math.max(s0, task[0], cur);
        const e = Math.min(e0, task[1]);
        if (e > s) {
          sum += e - s;
          cur = e;
        }
      }
      scriptMs = r1(sum / 1000);
    }
    byMeasure[name] = { count: list.length, longestMs: r1((top2[1] - top2[0]) / 1000), taskScriptMs: scriptMs };
  }
  const longestTasks = top.map((x) => ({ scriptMs: r1(x.ms), taskMs: r1((x.b - x.a) / 1000), measures: measuresIn(x) }));
  let attribution = null;
  if (longest) {
    // The deepest function call inside it, and the outermost.
    const inside = calls2.filter(([s, e]) => s >= longest.a && e <= longest.b);
    let deepest = null;
    let depth = -1;
    const stack = [];
    for (const iv of inside) {
      while (stack.length && stack.at(-1)[1] <= iv[0]) stack.pop();
      stack.push(iv);
      if (stack.length > depth || (stack.length === depth && iv[1] - iv[0] > deepest[1] - deepest[0])) {
        depth = stack.length;
        deepest = iv;
      }
    }
    const where = (iv) => {
      const d = iv?.[2]?.args?.data || {};
      return iv ? { fn: d.functionName || '(anonymous)', at: `${d.url || ''}:${d.lineNumber ?? ''}`, ms: r1((iv[1] - iv[0]) / 1000) } : null;
    };
    const outer = inside.reduce((m, iv) => (!m || iv[1] - iv[0] > m[1] - m[0] ? iv : m), null);
    attribution = {
      deepest: where(deepest), outer: where(outer),
      measures: [...new Set(marks.filter(([s, e]) => s < longest.b && e > longest.a).map((iv) => iv[2].name))],
    };
  }
  return {
    thread: main, tasks: tasks.length, longestScriptMs: r1(longest?.ms ?? 0), attribution, longestTaskMs: r1(longestTask),
    over16, over50, longestGcMs: r1(gcs.reduce((m, [s, e]) => Math.max(m, (e - s) / 1000), 0)), longestTasks, byMeasure,
  };
}

export default {
  name: 'scale',
  title: 'Scale: the page over a synthetic tree, measured',
  data: 'synthetic',
  passes: ['webgl', 'nogl'],
  timeout: 900000,
  async run(t) {
    const entries = Number(t.meta?.synthetic?.entries ?? (t.meta ? t.meta.folders + t.meta.files : 0));
    const result = { pass: t.pass, entries, folders: t.meta?.folders ?? null, files: t.meta?.files ?? null, seed: t.meta?.synthetic?.seed ?? null };
    await t.settle({ timeout: 120000 });
    const first = await t.app((T) => ({ firstDrawMs: T.firstDrawMs, scanMs: T.scanMs, mode: T.S.regions ? 'regions' : 'whole' }));
    Object.assign(result, { mode: first.mode, firstBoxColdMs: first.firstDrawMs, scanMs: first.scanMs });
    await t.page.send('Performance.enable', { timeDomain: 'timeTicks' });
    await t.page.send('HeapProfiler.enable');
    result.settled = await heap(t);

    // The trace, the heap's peak and long animation frames, through the tour.
    const traced = [];
    let complete = null;
    const done = new Promise((resolve) => { complete = resolve; });
    const off = t.page.cdp.on((msg) => {
      if (msg.sessionId !== t.page.sessionId) return;
      if (msg.method === 'Tracing.dataCollected') {
        for (const e of msg.params.value) {
          const n = String(e.name || '');
          if (e.ph === 'M' || TASKS.has(n) || isScript(n) || isGC(n) || n.startsWith('terrane:')) traced.push(e);
        }
      } else if (msg.method === 'Tracing.tracingComplete') complete();
    });
    if (t.gl) await t.page.send('Tracing.start', { categories: CATEGORIES, transferMode: 'ReportEvents' });
    await t.eval(() => {
      window.__scaleLoaf = 0;
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (e.duration > window.__scaleLoaf) window.__scaleLoaf = e.duration;
        }).observe({ type: 'long-animation-frame', buffered: false });
        return true;
      } catch {
        return false;
      }
    });
    let peak = { used: 0, total: 0 };
    let sampling = true;
    const sampler = (async () => {
      while (sampling) {
        try {
          const m = await metrics(t);
          if (m.JSHeapUsedSize > peak.used) peak = { used: m.JSHeapUsedSize, total: m.JSHeapTotalSize };
        } catch { /* a reload in between */ }
        await t.sleep(500);
      }
    })();
    const tour = {};
    const t0 = Date.now();
    try {
      // d. The overview.
      if (t.gl) {
        await t.key('0');
        await t.settle({ timeout: 60000 });
      }

      // e. Eight levels down, by the ledger.
      await t.eval(() => document.getElementById('ledger-list').focus());
      let depth = 0;
      for (; depth < 8; depth++) {
        const rel = await t.app((T) => {
          const kids = T.S.focus.c.filter((c) => c.d && !c.e);
          if (!kids.length) return null;
          kids.sort((a, b) => b.dc - a.dc || b.s - a.s);
          return T.api.cursorTo(kids[0]) ? T.api.relPath(kids[0]) : null;
        });
        if (!rel) break;
        await t.key('Enter');
        // With WebGL the location follows the eye and may settle inside
        // the folder; in region mode its children must be held and listed.
        await t.waitFor((T, r) => {
          const f = T.api.relPath(T.S.focus);
          return (f === r || f.startsWith(`${r}/`)) && !T.S.focus.u && (!T.S.regions || T.S.regions.stats?.idle !== false);
        }, { args: [rel], timeout: 120000, what: `the folder ${rel}` });
        await t.settle({ timeout: 60000 });
        await t.eval(() => document.getElementById('ledger-list').focus());
      }
      tour.depth = depth;

      // f. A search, a reveal from Findings, a second search, cleared. In
      // regions the service answers it, and the page shows the first
      // 5,000 of its matches as refs, each made a node when acted on.
      await t.eval(() => document.getElementById('q').focus());
      await t.type('report');
      {
        await t.waitFor((T) => T.S.query === 'report' && T.S.search?.list?.length > 0, { timeout: 120000, what: 'the matches for report' });
        tour.reportMatches = await t.app((T) => T.S.search.total ?? T.S.search.list.length);
        await t.eval(() => document.getElementById('ledger-list').focus());
        await t.key('ArrowDown');
        await t.key('Enter');
        await t.settle({ timeout: 60000 });
        tour.revealed = await t.app((T) => !!T.S.primary);
        // Ctrl+A as a DevTools key event selects nothing in a field (the
        // editor's command is not run), so the text is selected as it would.
        await t.eval(() => {
          const q = document.getElementById('q');
          q.focus();
          q.select();
        });
        await t.type('ext:psd >50mb');
        // In regions the answer lands after the query is set: wait for it.
        await t.waitFor((T) => T.S.query === 'ext:psd >50mb' && (!T.S.search?.regions || T.S.search.text === T.S.query), { timeout: 120000, what: 'the second search' });
        tour.psdMatches = await t.app((T) => (T.S.search ? T.S.search.total ?? T.S.search.list.length : 0));
        await t.key('Escape');
        await t.waitFor((T) => !T.S.query, { timeout: 30000, what: 'the search cleared' });
        await t.settle({ timeout: 60000 });
      }

      // g. The Survey tab (the service's survey, in regions), and a reveal
      // from Largest files.
      await t.tabTo('.tabs [data-tab=survey]');
      await t.key('Enter');
      await t.waitFor((T) => T.S.tab === 'survey' && !!T.S.survey && !T.S.survey.pending, { timeout: 120000, what: 'the Survey tab' });
      if (await t.eval(() => !!document.querySelector('#ledger-rich .item'))) {
        await t.tabTo('#ledger-rich .item');
        await t.key('Enter');
        await t.settle({ timeout: 60000 });
        tour.surveyRevealed = await t.app((T) => T.S.primary?.n ?? null);
      } else {
        tour.survey = (await t.text('#ledger-rich')).trim();
        t.note(`the survey in regions: "${tour.survey}"`);
      }

      // h. Back up, then the overview.
      await t.eval(() => document.getElementById('view').focus());
      for (let i = 0; i < 8; i++) {
        await t.key('Backspace');
        await t.settle({ timeout: 60000 });
      }
      if (t.gl) {
        await t.key('0');
        await t.settle({ timeout: 60000 });
      }

      // i. In regions, the budget: lowered to half of what the tour holds,
      // regions are let go once the view is settled, then three levels
      // down again load regions over the lower budget and let more go.
      // The evict, relayout and paint tasks are in the trace; the heap
      // after the regions are let go is read after a collection.
      if (await t.app((T) => !!T.S.regions)) {
        const before = await t.app((T) => ({ held: T.S.regions.held, regions: T.S.regions.stats.regions, dropped: T.S.regions.stats.dropped }));
        const budget = Math.floor(before.held / 2);
        await t.app((T, b) => {
          T.S.regions.budget = b;
          T.S.regions.floor = Math.floor(b * 0.75);
          T.evictSoon();
          return true;
        }, budget);
        await t.waitFor((T, d) => T.S.regions.stats.dropped > d, { args: [before.dropped], timeout: 60000, what: 'regions let go under the lowered budget' });
        await t.settle({ timeout: 60000 });
        // What may not be let go: folders standing open in the layout, and the
        // folder you are in, the trail and the forced chain with every ancestor.
        const evicted = await t.app((T) => {
          const keep = new Set();
          const L = T.S.layout;
          for (let i = 0; i < (L?.n || 0); i++) if (L.type[i] === 0) keep.add(L.node[i]);
          for (const n of [T.S.focus, ...T.S.trail, ...(T.S.force || [])]) for (let a = n; a; a = a.p) keep.add(a);
          let loose = 0;
          const walk = [T.S.model.root];
          while (walk.length) {
            const d = walk.pop();
            if (d.u) continue;
            if (!keep.has(d)) loose++;
            for (const c of d.c) if (c.d) walk.push(c);
          }
          return { held: T.S.regions.held, regions: T.S.regions.stats.regions, dropped: T.S.regions.stats.dropped, loose };
        });
        const heapAfter = await heap(t);
        // Back to Contents, which the Survey tab replaced, to walk by the ledger.
        await t.app((T) => {
          T.S.tab = 'contents';
          T.api.drawLedger();
          return true;
        });
        await t.eval(() => document.getElementById('ledger-list').focus());
        let down = 0;
        for (; down < 3; down++) {
          const rel = await t.app((T) => {
            const kids = T.S.focus.c.filter((c) => c.d && !c.e);
            if (!kids.length) return null;
            kids.sort((a, b) => b.dc - a.dc || b.s - a.s);
            return T.api.cursorTo(kids[0]) ? T.api.relPath(kids[0]) : null;
          });
          if (!rel) break;
          await t.key('Enter');
          await t.waitFor((T, r) => {
            const f = T.api.relPath(T.S.focus);
            return (f === r || f.startsWith(`${r}/`)) && !T.S.focus.u && T.S.regions.stats.idle;
          }, { args: [rel], timeout: 120000, what: `the folder ${rel}` });
          await t.settle({ timeout: 60000 });
          await t.eval(() => document.getElementById('ledger-list').focus());
        }
        await t.sleep(600);
        await t.settle({ timeout: 60000 });
        const walked = await t.app((T) => ({ held: T.S.regions.held, regions: T.S.regions.stats.regions, dropped: T.S.regions.stats.dropped, focusHeld: T.S.focus.u === false }));
        await t.app((T) => {
          T.S.regions.budget = 200000;
          T.S.regions.floor = 150000;
          return true;
        });
        tour.budget = { before, budget, evicted, heapAfterMB: heapAfter.jsHeapUsedMB, down, walked };
      }
    } finally {
      tour.ms = Date.now() - t0;
      sampling = false;
      await sampler;
      if (t.gl) {
        await t.page.send('Tracing.end');
        await Promise.race([done, t.sleep(60000)]);
      }
      off();
    }
    result.tour = tour;

    // i. What the trace says.
    if (t.gl) {
      result.frames = analyse(traced);
      result.frames.events = traced.length;
    }
    result.longestAnimationFrameMs = r1(await t.eval(() => window.__scaleLoaf ?? null));

    // j. The heap after the tour, then after a collection.
    result.peak = { jsHeapUsedMB: r1(peak.used / MB), jsHeapTotalMB: r1(peak.total / MB) };
    result.afterTour = await heap(t, { gc: false });
    result.afterGC = await heap(t);

    // k. What the page holds.
    result.held = await t.app((T) => {
      if (!T.S.regions) return { entries: T.S.model.root.fc + T.S.model.root.dc + 1, regions: null };
      const st = T.S.regions.stats;
      const ms = st.ms.slice().sort((a, b) => a - b);
      const at = (q) => (ms.length ? Math.round(ms[Math.min(ms.length - 1, Math.floor(q * ms.length))] * 10) / 10 : null);
      // The whole-tree questions: each answer's time in the page and in the service.
      const of = (route) => T.asked.ms.filter((x) => x[0] === route).map((x) => ({ pageMs: x[1], serviceMs: x[2] }));
      return {
        entries: st.held, regions: st.regions, requests: st.requests, dropped: st.dropped, bytesMB: Math.round(st.bytes / 1048576 * 10) / 10, regionMs: { median: at(0.5), p95: at(0.95) }, worker: T.regionWorker,
        asked: { find: of('find'), survey: of('survey'), marks: T.asked.marks, sessions: T.asked.sessions },
      };
    });

    // l. The service: its memory and load time, starting nothing.
    result.service = await t.eval(async () => {
      const token = document.querySelector('meta[name="terrane-token"]').content;
      const r = await (await fetch('/api/tree?peek=1', { headers: { 'X-Terrane-Token': token } })).json();
      return { state: r.state, loadMs: r.loadMs, prepMs: r.prepMs, mem: r.mem, v: r.v };
    });

    // m. The first box again, the service already loaded.
    await t.reload();
    result.firstBoxReadyMs = await t.app((T) => T.firstDrawMs);

    // n. One line for the driver.
    t.note(`SCALE ${JSON.stringify(result)}`);

    // o. The exit criteria, at 400,000 entries or more, whichever way the
    // page holds the tree: a threshold that leaves such a tree whole fails.
    t.check('the tour went down at least one level', tour.depth >= 1, JSON.stringify(tour));
    if (entries >= 400_000) {
      t.check(`the peak heap during the tour is under 300 MB (${result.peak.jsHeapUsedMB} MB)`, result.peak.jsHeapUsedMB < 300);
      t.check(`the heap after the tour is under 300 MB (${result.afterTour.jsHeapUsedMB} MB)`, result.afterTour.jsHeapUsedMB < 300);
      if (t.gl) t.check(`no task in the tour ran more than 16.0 ms of script (${result.frames.longestScriptMs} ms)`, result.frames.longestScriptMs <= 16.0, JSON.stringify(result.frames.attribution));
      const B = tour.budget;
      if (B) {
        t.check(`under a budget of half what the tour held (${B.budget.toLocaleString('en-US')} of ${B.before.held.toLocaleString('en-US')}), regions are let go (${B.evicted.dropped - B.before.dropped}) until the entries held are within it, or all still held stand open or are pinned (${B.evicted.held.toLocaleString('en-US')})`,
          B.evicted.dropped > B.before.dropped && (B.evicted.held <= B.budget || B.evicted.loose === 0), JSON.stringify(B));
        t.check(`walking ${B.down} levels down again over the lower budget keeps the folder you are in held and the entries near the budget (${B.walked.held.toLocaleString('en-US')})`,
          B.down > 0 && B.walked.focusHeld && B.walked.held <= B.budget + 40000, JSON.stringify(B.walked));
        if (t.gl) t.check(`letting regions go stays within a frame: the longest evict task ran ${result.frames.byMeasure?.evict?.taskScriptMs} ms of script`, (result.frames.byMeasure?.evict?.taskScriptMs ?? 0) <= 16.0, JSON.stringify(result.frames.byMeasure));
      }
    } else {
      t.note(`the exit criteria are checked at 400,000 entries or more; here the page is ${result.mode} at ${entries.toLocaleString('en-US')} entries, so they are noted`);
    }
  },
};
