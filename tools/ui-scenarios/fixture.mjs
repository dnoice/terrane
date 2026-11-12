/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Fixture Contract Scenario (Terrane Edition - v1.0)
 *     - File Name: fixture.mjs
 *     - Relative Path: tools/ui-scenarios/fixture.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Proves that the shared fixture sets from tools/make-fixture.mjs reach
 *     the page through the real service exactly as the manifest describes
 *     them, so feature scenarios can rely on the manifest's paths and
 *     times. It reads the model only and runs in the WebGL pass.
 *
 * ✒ Key Features:
 *     - The 13-level chain: depth-13 is thirteen folders below the root
 *     - The working session: every file present, inside its window, in
 *       three places, plus the file under a hidden folder
 *     - The bulk write: 60 files within one second
 *     - Strata pair: equal newest change, very different bytes by age
 *     - Empty folders dated recent and old; files spread over ten years
 *     - Archives: present with the sizes the manifest records
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs fixture
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs, a fixture with a manifest
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

export default {
  name: 'fixture',
  title: 'The fixture sets reach the page as the manifest says',
  data: 'fixture',
  passes: ['webgl'],
  async run(t) {
    const m = t.manifest;
    const got = await t.app((T, m) => {
      const S = T.S;
      const node = (rel) => S.model.find(rel);
      const depth = (n) => {
        let d = 0;
        for (let a = n; a.p; a = a.p) d++;
        return d;
      };
      const deepest = node(m.chain.deepest);
      const sessionNodes = m.session.files.map(node);
      const bulk = m.bulk.files.map(node);
      const old = node(m.strata.old);
      const live = node(m.strata.live);
      const ages = [0, 0, 0, 0, 0, 0];
      const stack = [S.model.root];
      while (stack.length) {
        for (const c of stack.pop().c) {
          if (c.d) stack.push(c);
          else if (c.m) {
            const days = (m.anchor - c.m) / 86400000;
            ages[[1, 7, 30, 365, 1095, Infinity].findIndex((b) => days < b)]++;
          }
        }
      }
      return {
        files: S.model.root.fc,
        deepest: deepest && depth(deepest),
        host: node(m.chain.host)?.s ?? null,
        chainSession: m.chain.session.files.every((f) => node(f)),
        session: sessionNodes.every(Boolean) && sessionNodes.map((n) => n.m),
        hidden: !!node(m.session.hidden),
        places: new Set(m.session.files.map((f) => f.slice(0, f.lastIndexOf('/')))).size,
        bulk: bulk.every(Boolean) && bulk.map((n) => n.m),
        strata: old && live && { oldMm: old.mm, liveMm: live.mm, oldBytes: old.s, liveBytes: live.s },
        empty: [node(m.emptyFolders.recent)?.m, node(m.emptyFolders.old)?.m],
        archives: [m.archives.site, m.archives.hazards, m.archives.zip64].map((a) => node(a.path)?.s ?? null),
        others: [m.archives.truncated.path, m.archives.sevenZip.path, m.archives.mirror].map((p) => !!node(p)),
        ages,
      };
    }, m);
    const near = (a, b) => Math.abs(a - b) <= 2;
    const expected = m.files + (m.links ? 2 : 0);
    t.check(`every file was surveyed (${got.files}, two of them links when links could be made)`, got.files === expected, `${got.files} vs ${expected}`);
    t.check('depth-13 is thirteen levels below the root', got.deepest === 13, String(got.deepest));
    t.check('the copy of site.zip sits in depth-12', got.host === m.archives.site.size, String(got.host));
    t.check('the deepest folder holds its own small session', got.chainSession);
    t.check('the working session is present, inside its window', got.session && got.session.every((x) => x >= m.session.start - 2 && x <= m.session.end + 2), JSON.stringify(got.session));
    t.check('the session spans three places, with one file under a hidden folder', got.places === 3 && got.hidden);
    t.check('the bulk write is 60 files within one second', got.bulk && got.bulk.length === 60 && Math.max(...got.bulk) - Math.min(...got.bulk) < 1000);
    t.check('strata-old and strata-live share their newest change', got.strata && near(got.strata.oldMm, got.strata.liveMm) && near(got.strata.oldMm, m.strata.newest), JSON.stringify(got.strata));
    t.check('one empty folder is recent and one is old', got.empty[0] > m.anchor - 4 * 86400000 && got.empty[1] < m.anchor - 5 * 365 * 86400000, JSON.stringify(got.empty));
    t.check('files fall in every age band up to ten years', got.ages.every((n) => n > 0), JSON.stringify(got.ages));
    t.check('the archives have the sizes the manifest records', got.archives[0] === m.archives.site.size && got.archives.every((s) => s > 0) && got.others.every(Boolean), JSON.stringify(got.archives));
  },
};
