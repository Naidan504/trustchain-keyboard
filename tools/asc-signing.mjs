// CI signing without devices, via the App Store Connect API.
//   create-cert <csr.pem> <outDir>   ONE-TIME: create the long-lived Apple Distribution certificate from a CSR;
//                                    writes dist.cer and cert-id.txt. Never revoke it: TestFlight builds signed
//                                    with a revoked certificate stop installing and their extensions are rejected.
//   profiles <certId> <outDir>       every build: ensure bundle IDs, reuse (or create) App Store profiles for
//                                    app + extension bound to that certificate; writes *.mobileprovision
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8. Prints no secrets.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TARGETS = [
  { id: 'com.trustchainmn.keyboard', name: 'TrustChain Keyboard', profile: 'TrustChain Keyboard AppStore CI' },
  { id: 'com.trustchainmn.keyboard.ext', name: 'TrustChain Keyboard Extension', profile: 'TrustChain Keyboard Ext AppStore CI' },
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

if (cmd === 'create-cert') {
  const csr = fs.readFileSync(a1, 'utf8').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  fs.mkdirSync(a2, { recursive: true });
  const cert = (await api('POST', '/v1/certificates', { data: { type: 'certificates', attributes: { certificateType: 'DISTRIBUTION', csrContent: csr } } })).data;
  fs.writeFileSync(path.join(a2, 'dist.cer'), Buffer.from(cert.attributes.certificateContent, 'base64'));
  fs.writeFileSync(path.join(a2, 'cert-id.txt'), cert.id);
  console.log(`created distribution certificate, expires ${cert.attributes.expirationDate}`);
} else if (cmd === 'profiles') {
  const certId = a1, out = a2;
  fs.mkdirSync(out, { recursive: true });
  for (const t of TARGETS) {
    const found = (await api('GET', `/v1/bundleIds?filter[identifier]=${t.id}&limit=5`)).data.find(b => b.attributes.identifier === t.id);
    const bundle = found ?? (await api('POST', '/v1/bundleIds', { data: { type: 'bundleIds', attributes: { identifier: t.id, name: t.name, platform: 'IOS' } } })).data;
    // Reuse an active profile with this name that already contains the certificate; otherwise replace it.
    let prof;
    for (const p of (await api('GET', `/v1/profiles?filter[name]=${encodeURIComponent(t.profile)}&limit=10`)).data) {
      const certs = (await api('GET', `/v1/profiles/${p.id}/certificates?limit=20`)).data.map(c => c.id);
      const pBundle = (await api('GET', `/v1/profiles/${p.id}/bundleId`)).data;
      const sameApp = pBundle?.attributes?.identifier === t.id; // bundle IDs changed once (mn.* → com.trustchainmn.*)
      if (!prof && sameApp && p.attributes.profileState === 'ACTIVE' && certs.includes(certId)) prof = p;
      else await api('DELETE', `/v1/profiles/${p.id}`);
    }
    if (!prof) {
      prof = (await api('POST', '/v1/profiles', { data: {
        type: 'profiles',
        attributes: { name: t.profile, profileType: 'IOS_APP_STORE' },
        relationships: {
          bundleId: { data: { type: 'bundleIds', id: bundle.id } },
          certificates: { data: [{ type: 'certificates', id: certId }] },
        },
      } })).data;
      console.log(`profile "${t.profile}": created`);
    } else console.log(`profile "${t.profile}": reused`);
    fs.writeFileSync(path.join(out, `${prof.attributes.uuid}.mobileprovision`), Buffer.from(prof.attributes.profileContent, 'base64'));
  }
} else {
  console.error('usage: asc-signing.mjs create-cert <csr.pem> <outDir> | profiles <certId> <outDir>');
  process.exit(2);
}
