// Adds the App Store Connect team's users to an internal TestFlight group once the latest build is processed.
// Runs in GitHub Actions with the ASC_* secrets; prints no secrets.
//   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 (env)   node tools/asc-internal-testers.mjs
import crypto from 'node:crypto';

const BUNDLE_ID = 'mn.trustchain.keyboard';
const GROUP = 'TrustChain team';
const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 } = process.env;
if (!ASC_KEY_ID || !ASC_ISSUER_ID || !ASC_KEY_P8) { console.error('missing ASC_* env'); process.exit(1); }

function token() {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
  const body = b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: ASC_KEY_P8, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${sig.toString('base64url')}`;
}

async function api(method, path, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { authorization: `Bearer ${token()}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${(json.errors || []).map(e => e.detail || e.title).join('; ')}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

const app = (await api('GET', `/v1/apps?filter[bundleId]=${BUNDLE_ID}`)).data[0];
if (!app) throw new Error(`no app with bundle id ${BUNDLE_ID}`);
console.log(`app: ${app.attributes.name} (${app.id})`);

// Wait (up to 45 min) for the newest build to finish processing.
let build;
for (let i = 0; i < 90; i++) {
  // BUILD (env) = the CFBundleVersion to wait for; otherwise the newest upload.
  build = (await api('GET', `/v1/builds?filter[app]=${app.id}${process.env.BUILD ? `&filter[version]=${process.env.BUILD}` : ''}&sort=-uploadedDate&limit=1`)).data[0];
  const state = build?.attributes.processingState;
  console.log(`build ${build?.attributes.version ?? '-'}: ${state ?? 'not uploaded yet'}`);
  if (state === 'VALID') break;
  if (state === 'FAILED' || state === 'INVALID') throw new Error(`build processing ${state}`);
  await new Promise(r => setTimeout(r, 30_000));
}
if (build?.attributes.processingState !== 'VALID') throw new Error('build not processed within 45 minutes');

// Internal group with access to every build.
const groups = (await api('GET', `/v1/apps/${app.id}/betaGroups?limit=50`)).data;
let group = groups.find(g => g.attributes.isInternalGroup && g.attributes.name === GROUP);
if (!group) {
  group = (await api('POST', '/v1/betaGroups', { data: {
    type: 'betaGroups',
    attributes: { name: GROUP, isInternalGroup: true, hasAccessToAllBuilds: true },
    relationships: { app: { data: { type: 'apps', id: app.id } } },
  } })).data;
  console.log(`created internal group "${GROUP}"`);
} else console.log(`internal group "${GROUP}" exists`);

// Every team user becomes an internal tester (an individual account has just the owner).
const users = (await api('GET', '/v1/users?limit=50')).data;
for (let i = 0; i < users.length; i++) {
  const u = users[i];
  const email = u.attributes.username;
  const masked = email.replace(/^(.).*(@.*)$/, '$1***$2');
  try {
    await api('POST', '/v1/betaTesters', { data: {
      type: 'betaTesters',
      attributes: { email, firstName: u.attributes.firstName, lastName: u.attributes.lastName },
      relationships: { betaGroups: { data: [{ type: 'betaGroups', id: group.id }] } },
    } });
    console.log(`added ${masked}`);
  } catch (e) {
    if (e.status === 404 && !u.retried) { // a new group can take a moment to become visible
      u.retried = true; await new Promise(r => setTimeout(r, 20_000)); users.push(u); continue;
    }
    if (e.status !== 409) throw e;
    const t = (await api('GET', `/v1/betaTesters?filter[email]=${encodeURIComponent(email)}&limit=1`)).data[0];
    if (t) await api('POST', `/v1/betaGroups/${group.id}/relationships/betaTesters`, { data: [{ type: 'betaTesters', id: t.id }] })
      .catch(err => console.log(`  group add: ${err.message} (usually: already in the group)`));
    console.log(`${masked} already a tester; ensured in group`);
  }
}
// (Re)send the TestFlight email invitation to every tester in the group, so they can accept it on the phone.
const testers = (await api('GET', `/v1/betaGroups/${group.id}/betaTesters?limit=50`)).data;
for (const t of testers) {
  const masked = String(t.attributes.email).replace(/^(.).*(@.*)$/, '$1***$2');
  console.log(`tester ${masked}: state ${t.attributes.state ?? '-'}, invite ${t.attributes.inviteType ?? '-'}`);
  try {
    await api('POST', '/v1/betaTesterInvitations', { data: {
      type: 'betaTesterInvitations',
      relationships: { app: { data: { type: 'apps', id: app.id } }, betaTester: { data: { type: 'betaTesters', id: t.id } } },
    } });
    console.log(`  invitation email sent to ${masked}`);
  } catch (e) { console.log(`  invitation: ${e.message}`); }
}
for (const g of (await api('GET', `/v1/apps/${app.id}/betaGroups?limit=50`)).data.filter(g => g.attributes.isInternalGroup)) {
  const gb = (await api('GET', `/v1/betaGroups/${g.id}/builds?limit=10`)).data.map(b => b.attributes.version);
  const gt = (await api('GET', `/v1/betaGroups/${g.id}/betaTesters?limit=50`)).data.map(t => `${String(t.attributes.email).replace(/^(.).*(@.*)$/, '$1***$2')} (${t.attributes.state ?? '-'})`);
  console.log(`group "${g.attributes.name}" ${g.id.slice(0, 8)}: allBuilds=${g.attributes.hasAccessToAllBuilds} builds=[${gb.join(', ')}] testers=[${gt.join(', ')}]`);
}
console.log('done: open the TestFlight email on your iPhone and tap "View in TestFlight".');
