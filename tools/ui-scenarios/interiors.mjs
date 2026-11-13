/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Archive Interiors Scenario (Terrane Edition - v1.0)
 *     - File Name: interiors.mjs
 *     - Relative Path: tools/ui-scenarios/interiors.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Checks the service half of archive interiors from inside the real
 *     page: with the page's own session token, GET /api/inside lists the
 *     fixture's archives exactly as its manifest describes them, and the
 *     page itself does not call it or change in any way while it does.
 *
 * ✒ Key Features:
 *     - Any data, both passes: listing needs no 3D view
 *     - The stored zip and its copy 13 levels down list the manifest's
 *       names and sizes, the UTF-8 name included, with no partial sentence
 *     - The hazards archive counts one locked entry and one escape
 *     - 7z is refused with 415 naming the format, the truncated zip with
 *       422 and the damaged sentence
 *     - The page's thumbnail cookie does not stand in for the token: a
 *       listing without the header is refused with 401
 *     - Snapshot data: the endpoint answers ESNAPSHOT with a sentence
 *     - The page made no listing request of its own, and its model,
 *       layout and notices are the same afterwards
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs interiors
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t)
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

/** In the page: lists each path with the page's own token, or without it. */
async function listInPage(paths, withToken) {
  const token = document.querySelector('meta[name="terrane-token"]').content;
  const out = [];
  for (const p of paths) {
    const r = await fetch(`/api/inside?path=${encodeURIComponent(p)}`, { headers: withToken ? { 'X-Terrane-Token': token } : {} });
    out.push({ status: r.status, body: await r.json() });
  }
  return out;
}

/** Folder and file paths with sizes from scanner records: 'a/' and 'a/b.txt:5'. */
function recordPaths(records) {
  const where = new Map();
  const out = [];
  for (const [id, pid, name, , , files] of records || []) {
    const at = pid === -1 ? '' : where.get(pid) ? `${where.get(pid)}/${name}` : name;
    where.set(id, at);
    if (pid !== -1) out.push(`${at}/`);
    for (let i = 0; i < files.length; i += 4) out.push(`${at ? `${at}/` : ''}${files[i]}:${files[i + 1]}`);
  }
  return out.sort();
}

const pageState = (T) => ({
  files: T.S.model.root.fc,
  bytes: T.S.model.root.s,
  boxes: T.S.layout?.n ?? null,
  notices: [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent),
});

export default {
  name: 'interiors',
  title: 'Archive interiors: the listing service, from the page',
  data: 'any',
  async run(t) {
    await t.settle();
    const own = t.requests().filter((r) => r.path === '/api/inside').length;
    t.check('the page asks for no archive listing on its own', own === 0, `${own} requests`);
    const before = await t.app(pageState);
    const mark = t.mark();

    if (t.data !== 'fixture') {
      const [snap] = await t.eval(listInPage, ['any.zip'], true);
      t.check('snapshot data: the listing is refused with ESNAPSHOT and a sentence',
        snap.status === 403 && snap.body.code === 'ESNAPSHOT' && /snapshot mode/i.test(snap.body.message), JSON.stringify(snap.body));
    } else {
      const A = t.manifest.archives;
      const paths = [A.site.path, t.manifest.chain.host, A.hazards.path, A.sevenZip.path, A.truncated.path];
      const [site, deep, hazards, seven, truncated] = await t.eval(listInPage, paths, true);
      const want = A.site.entries.map((e) => (e.folder ? e.name : `${e.name}:${e.size}`)).sort();
      const got = recordPaths(site.body.records);
      t.check(`site.zip lists the manifest's ${A.site.entries.length} entries exactly, café.md included`,
        site.status === 200 && JSON.stringify(got) === JSON.stringify(want) && site.body.partial === null && got.some((p) => p.startsWith('site/notes/café.md:')),
        `${site.status} ${got.join(' ')}`);
      t.check('the copy 13 levels down lists the same entries',
        deep.status === 200 && JSON.stringify(recordPaths(deep.body.records)) === JSON.stringify(want));
      t.check('hazards.zip counts one locked entry and one escape',
        hazards.status === 200 && hazards.body.locked === A.hazards.locked && hazards.body.escapes === A.hazards.escapes
        && hazards.body.escaped?.[0]?.name === '../escape.txt', JSON.stringify(hazards.body));
      t.check('packed.7z is refused with 415 naming 7z', seven.status === 415 && seven.body.format === '7z' && /7z archive/.test(seven.body.message), JSON.stringify(seven.body));
      t.check('truncated.zip is refused with 422 and the damaged sentence',
        truncated.status === 422 && truncated.body.code === 'EDAMAGED' && /^truncated\.zip looks damaged: /.test(truncated.body.message), JSON.stringify(truncated.body));
      const [bare] = await t.eval(listInPage, [A.site.path], false);
      t.check('without the token header the listing is refused (401): the thumbnail cookie does not stand in', bare.status === 401, JSON.stringify(bare.body));
      // A response's status can reach the log just after the page has read it.
      const listings = () => t.requests(mark).filter((r) => r.path === '/api/inside');
      await t.poll(() => listings().length === paths.length + 1 && listings().every((r) => r.status), { timeout: 3000 });
      const logged = listings();
      t.check('the network log shows exactly the listings asked for, each with its status',
        logged.length === paths.length + 1 && logged.every((r) => r.method === 'GET')
        && JSON.stringify(logged.map((r) => r.status)) === JSON.stringify([200, 200, 200, 415, 422, 401]), JSON.stringify(logged.map((r) => r.status)));
    }
    const after = await t.app(pageState);
    t.check('the page\'s model, layout and notices are unchanged', JSON.stringify(after) === JSON.stringify(before),
      `${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  },
};
