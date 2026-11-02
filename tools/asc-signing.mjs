// CI signing without devices or a Mac keychain from before: uses the App Store Connect API to
//   setup <csr.pem> <outDir>  ensure bundle IDs, create a temporary Apple Distribution certificate from the CSR,
//                             create App Store profiles for app + extension; writes dist.cer, *.mobileprovision, signing.env
//   cleanup <outDir>          revoke the temporary certificate and delete the profiles
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8. Prints no secrets.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TARGETS = [
  { id: 'mn.trustchain.keyboard', name: 'TrustChain Keyboard', profile: 'TrustChain Keyboard AppStore CI' },
  { id: 'mn.trustchain.keyboard.ext', name: 'TrustChain Keyboard Extension', profile: 'TrustChain Keyboard Ext AppStore CI' },
];
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

async function api(method, p, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${p}`, {
    method, headers: { authorization: `Bearer ${token()}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${p.split('?')[0]} → ${res.status}: ${(json.errors || []).map(e => e.detail || e.title).join('; ')}`);
  return json;
}

const [cmd, a1, a2] = process.argv.slice(2);

if (cmd === 'setup') {
  const csr = fs.readFileSync(a1, 'utf8').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const out = a2;
  fs.mkdirSync(out, { recursive: true });

  // 1. Bundle IDs (the extension's is created on first run).
  for (const t of TARGETS) {
    const found = (await api('GET', `/v1/bundleIds?filter[identifier]=${t.id}&limit=5`)).data.find(b => b.attributes.identifier === t.id);
    t.bundle = found ?? (await api('POST', '/v1/bundleIds', { data: { type: 'bundleIds', attributes: { identifier: t.id, name: t.name, platform: 'IOS' } } })).data;
    console.log(`bundle id ${t.id}: ${found ? 'exists' : 'created'}`);
  }

  // 2. Temporary distribution certificate.
  const cert = (await api('POST', '/v1/certificates', { data: { type: 'certificates', attributes: { certificateType: 'DISTRIBUTION', csrContent: csr } } })).data;
  fs.writeFileSync(path.join(out, 'dist.cer'), Buffer.from(cert.attributes.certificateContent, 'base64'));
  console.log(`created temporary distribution certificate (expires ${cert.attributes.expirationDate})`);

  // 3. Fresh App Store profiles bound to that certificate (old CI profiles with the same name are removed).
  const env = [`ASC_CERT_ID=${cert.id}`];
  for (const t of TARGETS) {
    const old = (await api('GET', `/v1/profiles?filter[name]=${encodeURIComponent(t.profile)}&limit=10`)).data;
    for (const p of old) await api('DELETE', `/v1/profiles/${p.id}`);
    const prof = (await api('POST', '/v1/profiles', { data: {
      type: 'profiles',
      attributes: { name: t.profile, profileType: 'IOS_APP_STORE' },
      relationships: {
        bundleId: { data: { type: 'bundleIds', id: t.bundle.id } },
        certificates: { data: [{ type: 'certificates', id: cert.id }] },
      },
    } })).data;
    fs.writeFileSync(path.join(out, `${prof.attributes.uuid}.mobileprovision`), Buffer.from(prof.attributes.profileContent, 'base64'));
    env.push(`ASC_PROFILE_${t.id === TARGETS[0].id ? 'APP' : 'EXT'}=${prof.id}`);
    console.log(`profile "${t.profile}" ready`);
  }
  fs.writeFileSync(path.join(out, 'signing.env'), env.join('\n') + '\n');
} else if (cmd === 'cleanup') {
  const env = Object.fromEntries(fs.readFileSync(path.join(a1, 'signing.env'), 'utf8').trim().split('\n').map(l => l.split('=')));
  for (const k of ['ASC_PROFILE_APP', 'ASC_PROFILE_EXT']) if (env[k]) await api('DELETE', `/v1/profiles/${env[k]}`).catch(e => console.log(e.message));
  if (env.ASC_CERT_ID) await api('DELETE', `/v1/certificates/${env.ASC_CERT_ID}`).then(() => console.log('revoked temporary certificate'), e => console.log(e.message));
} else {
  console.error('usage: asc-signing.mjs setup <csr.pem> <outDir> | cleanup <outDir>');
  process.exit(2);
}
