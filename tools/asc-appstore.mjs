// Prepare TrustChain Keyboard's iOS App Store listing, screenshots and optional review submission.
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8, BUILD, SHOTS_DIR, SUBMIT=true|false.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const BUNDLE_ID = 'com.trustchainmn.keyboard';
const LOCALE = 'en-US';
const URL = 'https://trustchain.mn/keyboard';
const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8, BUILD, SHOTS_DIR, SUBMIT } = process.env;
if (!ASC_KEY_ID || !ASC_ISSUER_ID || !ASC_KEY_P8 || !BUILD || !SHOTS_DIR) {
  console.error('Missing ASC_* key, BUILD, or SHOTS_DIR');
  process.exit(1);
}
if (!['true', 'false', undefined, ''].includes(SUBMIT)) {
  console.error('SUBMIT must be true or false');
  process.exit(1);
}

const description = `TrustChain Keyboard is a Mongolian Cyrillic keyboard for iPhone with fewer, bigger keys.

Mongolian has 35 letters, so the standard keyboard crams 12 small keys into each row. TrustChain Keyboard shows the 27 letters you use most as big keys, in the familiar Mongolian order. The rarely used letters are one long-press away:
• Г → К   • Ш → Щ   • Э → Е   • Б → П
• В → Ф   • Ь → Ъ   • Я → Ё   • У → Ю

Hold a key, slide to the letter, release. That's it.

Works everywhere: messages, mail, notes, X, Facebook and any other app.

Private by design:
• No Full Access requested
• No network access, no analytics, no tracking
• Nothing you type is stored or sent anywhere

Setup: Settings › General › Keyboard › Keyboards › Add New Keyboard › TrustChain Keyboard. Then tap the globe key to switch.

Made in Mongolia by Trustchain Tuul LLC.`;

const versionText = {
  description,
  keywords: 'mongolian,keyboard,cyrillic,монгол,гар,mongol,kirill,khalkha,typing,big keys,монгол гар',
  promotionalText: 'Type Mongolian Cyrillic faster: 27 big keys, rare letters on long-press. No Full Access, nothing you type ever leaves your phone.',
  supportUrl: URL,
  marketingUrl: URL,
};
const infoText = {
  subtitle: 'Mongolian keyboard, big keys',
  privacyPolicyUrl: `${URL}/privacy.html`,
};

function token() {
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
  const body = b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  const signature = crypto.sign('sha256', Buffer.from(`${head}.${body}`),
    { key: ASC_KEY_P8, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${signature.toString('base64url')}`;
}

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const ref = (type, id) => ({ type, id });
const request = (type, attributes, relationships, id) => ({ data: { type, ...(id && { id }), ...(attributes && { attributes }), ...(relationships && { relationships }) } });

async function api(method, endpoint, body, attempt = 1) {
  const response = await fetch(`https://api.appstoreconnect.apple.com${endpoint}`, {
    method,
    headers: { authorization: `Bearer ${token()}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let json;
  try { json = raw ? JSON.parse(raw) : {}; } catch { json = {}; }
  if (response.status >= 500 && attempt < 5) {
    console.log(`${method} ${endpoint.split('?')[0]}: HTTP ${response.status}; retry ${attempt}/4`);
    await pause(15_000 * attempt);
    return api(method, endpoint, body, attempt + 1);
  }
  if (!response.ok) {
    const errors = (json.errors || []).map(error =>
      [error.code, error.title, error.detail, error.source?.pointer].filter(Boolean).join(' — '));
    const message = errors.length ? errors.join('; ') : raw.slice(0, 500);
    const exception = new Error(`${method} ${endpoint.split('?')[0]}: HTTP ${response.status}: ${message}`);
    exception.status = response.status;
    throw exception;
  }
  return json;
}

async function all(endpoint) {
  const items = [];
  let next = endpoint;
  while (next) {
    const page = await api('GET', next);
    items.push(...page.data);
    next = page.links?.next ? new URL(page.links.next).pathname + new URL(page.links.next).search : null;
  }
  return items;
}

async function upsertLocalization(collection, type, parentType, parentId, attributes) {
  const existing = (await all(`${collection}?limit=200`)).find(item => item.attributes.locale === LOCALE);
  if (existing) {
    await api('PATCH', `/v1/${type}/${existing.id}`, request(type, attributes, undefined, existing.id));
    console.log(`${type} ${LOCALE}: updated`);
    return existing;
  }
  const parent = parentType === 'appStoreVersions' ? 'appStoreVersion' : 'appInfo';
  const created = (await api('POST', `/v1/${type}`, request(type,
    { locale: LOCALE, ...attributes }, { [parent]: { data: ref(parentType, parentId) } }))).data;
  console.log(`${type} ${LOCALE}: created`);
  return created;
}

async function uploadScreenshot(setId, file) {
  const bytes = await fs.readFile(file);
  const name = path.basename(file);
  const checksum = crypto.createHash('md5').update(bytes).digest('hex');
  const created = (await api('POST', '/v1/appScreenshots', request('appScreenshots',
    { fileName: name, fileSize: bytes.length },
    { appScreenshotSet: { data: ref('appScreenshotSets', setId) } }))).data;
  for (const operation of created.attributes.uploadOperations || []) {
    const headers = new Headers();
    for (const header of operation.requestHeaders || []) headers.set(header.name, header.value);
    const part = bytes.subarray(operation.offset, operation.offset + operation.length);
    let response;
    for (let attempt = 1; attempt <= 5; attempt++) {
      response = await fetch(operation.url, { method: operation.method || 'PUT', headers, body: part });
      if (response.ok || response.status < 500 || attempt === 5) break;
      await pause(15_000 * attempt);
    }
    if (!response.ok) throw new Error(`Screenshot upload ${name}: HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  await api('PATCH', `/v1/appScreenshots/${created.id}`, request('appScreenshots',
    { uploaded: true, sourceFileChecksum: checksum }, undefined, created.id));
  console.log(`Screenshot ${name}: uploaded`);
  return { id: created.id, name };
}

// Apple processes screenshots after the upload; wait for all of them and log each state change.
async function waitForScreenshots(uploaded) {
  const last = {};
  for (let attempt = 0; attempt < 80; attempt++) {
    let pending = 0;
    for (const { id, name } of uploaded) {
      const delivery = (await api('GET', `/v1/appScreenshots/${id}`)).data.attributes.assetDeliveryState;
      if (delivery?.state !== last[id]) { console.log(`Screenshot ${name}: ${delivery?.state}`); last[id] = delivery?.state; }
      if (['FAILED', 'ERROR'].includes(delivery?.state)) {
        throw new Error(`Screenshot ${name}: asset delivery ${delivery.state}: ${JSON.stringify(delivery.errors || [])}`);
      }
      if (delivery?.state !== 'COMPLETE') pending++;
    }
    if (!pending) { console.log('Screenshots: all COMPLETE'); return true; }
    await pause(15_000);
  }
  console.log(`Screenshots: still processing after 20 minutes: ${JSON.stringify(last)}`);
  return false;
}

async function main() {
  const shots = (await fs.readdir(SHOTS_DIR)).filter(name => /^appstore-[123]-(typing|setup|keyboard)\.png$/.test(name)).sort();
  if (shots.length !== 3 || new Set(shots.map(name => name.slice(0, 10))).size !== 3) {
    throw new Error(`Expected three appstore-* PNGs in ${SHOTS_DIR}; found ${shots.join(', ')}`);
  }
  const app = (await all(`/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=50`))
    .find(item => item.attributes.bundleId === BUNDLE_ID);
  if (!app) throw new Error(`App ${BUNDLE_ID} not found`);
  console.log(`App: ${app.attributes.name} (${app.id})`);

  const build = (await all(`/v1/builds?filter[app]=${app.id}&filter[version]=${encodeURIComponent(BUILD)}&limit=50`))
    .find(item => item.attributes.version === BUILD);
  if (!build) throw new Error(`Build ${BUILD} not found for this app`);
  if (build.attributes.processingState !== 'VALID') throw new Error(`Build ${BUILD} processing state: ${build.attributes.processingState}`);
  const release = (await api('GET', `/v1/builds/${build.id}/preReleaseVersion`)).data;
  const versionString = release?.attributes?.version;
  if (!versionString) throw new Error(`Build ${BUILD} has no CFBundleShortVersionString`);
  console.log(`Build ${BUILD}: VALID, app version ${versionString}`);

  const editable = new Set(['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'METADATA_REJECTED', 'REJECTED']);
  const versions = await all(`/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=200`);
  const matching = versions.find(item => item.attributes.versionString === versionString);
  if (matching && !editable.has(matching.attributes.appStoreState)) {
    console.log(`App Store version ${versionString}: already ${matching.attributes.appStoreState}; no editable listing remains`);
    return;
  }
  let version = matching;
  if (!version) version = versions.find(item => editable.has(item.attributes.appStoreState));
  if (!version) {
    version = (await api('POST', '/v1/appStoreVersions', request('appStoreVersions',
      { platform: 'IOS', versionString }, { app: { data: ref('apps', app.id) } }))).data;
    console.log(`App Store version ${versionString}: created`);
  }
  await api('PATCH', `/v1/appStoreVersions/${version.id}`, request('appStoreVersions',
    { versionString, copyright: '2026 Trustchain Tuul LLC' }, undefined, version.id));
  console.log(`App Store version ${versionString}: updated`);

  const versionLocalization = await upsertLocalization(
    `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`,
    'appStoreVersionLocalizations', 'appStoreVersions', version.id, versionText);

  const infos = await all(`/v1/apps/${app.id}/appInfos?limit=200`);
  const info = infos.find(item => item.attributes.state === 'PREPARE_FOR_SUBMISSION')
    || infos.find(item => item.attributes.state !== 'ACCEPTED' && item.attributes.state !== 'READY_FOR_DISTRIBUTION')
    || infos[0];
  if (!info) throw new Error('No editable appInfo found');
  await upsertLocalization(`/v1/appInfos/${info.id}/appInfoLocalizations`,
    'appInfoLocalizations', 'appInfos', info.id, infoText);
  const categories = await all('/v1/appCategories?limit=200');
  const category = id => {
    const found = categories.find(item => item.id === id || item.attributes?.name === id);
    if (!found) throw new Error(`App category ${id} not found`);
    return { data: ref('appCategories', found.id) };
  };
  await api('PATCH', `/v1/appInfos/${info.id}`, request('appInfos', undefined,
    { primaryCategory: category('UTILITIES'), secondaryCategory: category('PRODUCTIVITY') }, info.id));
  console.log('App info: subtitle, privacy URL and categories updated');

  const rating = (await api('GET', `/v1/appInfos/${info.id}/ageRatingDeclaration`)).data;
  const none = ['alcoholTobaccoOrDrugUseOrReferences', 'contests', 'gamblingSimulated', 'gunsOrOtherWeapons',
    'horrorOrFearThemes', 'matureOrSuggestiveThemes', 'medicalOrTreatmentInformation',
    'profanityOrCrudeHumor', 'sexualContentGraphicAndNudity', 'sexualContentOrNudity',
    'violenceCartoonOrFantasy', 'violenceRealistic', 'violenceRealisticProlongedGraphicOrSadistic'];
  const falseFields = ['gambling', 'healthOrWellnessTopics', 'unrestrictedWebAccess', 'messagingAndChat', 'userGeneratedContent',
    'advertising', 'lootBox', 'parentalControls', 'ageAssurance'];
  const values = {};
  for (const key of none) if (key in rating.attributes) values[key] = typeof rating.attributes[key] === 'boolean' ? false : 'NONE';
  for (const key of falseFields) if (key in rating.attributes) values[key] = typeof rating.attributes[key] === 'string' ? 'NONE' : false;
  if (!Object.keys(values).length) throw new Error('No editable age rating descriptors returned by Apple');
  values.socialMedia = false;
  // Apple adds new required questions over time; this keyboard has none of that content, so answer "no" and log it.
  for (let attempt = 0; ; attempt++) {
    try {
      await api('PATCH', `/v1/ageRatingDeclarations/${rating.id}`, request('ageRatingDeclarations', values, undefined, rating.id));
      break;
    } catch (error) {
      const field = String(error.message).match(/value for the attribute '(\w+)'/)?.[1];
      if (!field || field in values || attempt >= 8) throw error;
      console.log(`Age rating: Apple also requires '${field}'; answering false`);
      values[field] = false;
    }
  }
  console.log(`Age rating: ${Object.keys(values).length} content descriptors cleared`);

  let review;
  try {
    review = (await api('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)).data;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const reviewText = {
    contactFirstName: 'Bilguun', contactLastName: 'Batbayar', contactPhone: '+976 96060544',
    contactEmail: 'bilguun.info@gmail.com', demoAccountRequired: false,
    notes: 'TrustChain Keyboard is a Mongolian Cyrillic custom keyboard. To use: Settings > General > Keyboard > Keyboards > Add New Keyboard > TrustChain Keyboard, then switch with the globe key. It does not request Full Access and makes no network requests. Rare letters appear on long-press (e.g. hold Г for К).',
  };
  if (review) {
    await api('PATCH', `/v1/appStoreReviewDetails/${review.id}`, request('appStoreReviewDetails', reviewText, undefined, review.id));
  } else {
    await api('POST', '/v1/appStoreReviewDetails', request('appStoreReviewDetails', reviewText,
      { appStoreVersion: { data: ref('appStoreVersions', version.id) } }));
  }
  console.log('App Review contact and notes: updated');

  await api('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, { data: ref('builds', build.id) });
  console.log(`Build ${BUILD}: attached to App Store version`);

  const sets = await all(`/v1/appStoreVersionLocalizations/${versionLocalization.id}/appScreenshotSets?limit=200`);
  let set = sets.find(item => item.attributes.screenshotDisplayType === 'APP_IPHONE_67');
  if (!set) {
    set = (await api('POST', '/v1/appScreenshotSets', request('appScreenshotSets',
      { screenshotDisplayType: 'APP_IPHONE_67' },
      { appStoreVersionLocalization: { data: ref('appStoreVersionLocalizations', versionLocalization.id) } }))).data;
  }
  const existing = await all(`/v1/appScreenshotSets/${set.id}/appScreenshots?limit=200`);
  for (const screenshot of existing) await api('DELETE', `/v1/appScreenshots/${screenshot.id}`);
  console.log(`iPhone 6.7-inch screenshot set: removed ${existing.length} old screenshot(s)`);
  const uploaded = [];
  for (const name of shots) uploaded.push(await uploadScreenshot(set.id, path.join(SHOTS_DIR, name)));
  const shotsReady = await waitForScreenshots(uploaded);
  if (SUBMIT === 'true' && !shotsReady) throw new Error('Not submitting: screenshots are still processing');

  if (SUBMIT === 'true') {
    const submissions = await all(`/v1/reviewSubmissions?filter[app]=${app.id}&limit=200`);
    let submission = submissions.find(item => item.attributes.platform === 'IOS'
      && !['CANCELED', 'COMPLETE'].includes(item.attributes.state));
    if (!submission) {
      submission = (await api('POST', '/v1/reviewSubmissions', request('reviewSubmissions',
        { platform: 'IOS' }, { app: { data: ref('apps', app.id) } }))).data;
      console.log(`Review submission: created ${submission.id}`);
    }
    const items = await all(`/v1/reviewSubmissions/${submission.id}/reviewSubmissionItems?limit=200`);
    if (!items.some(item => item.relationships?.appStoreVersion?.data?.id === version.id)) {
      await api('POST', '/v1/reviewSubmissionItems', request('reviewSubmissionItems', { type: 'APP_STORE_VERSION' },
        { reviewSubmission: { data: ref('reviewSubmissions', submission.id) },
          appStoreVersion: { data: ref('appStoreVersions', version.id) } }));
      console.log('App Store version: added to review submission');
    }
    if (!submission.attributes.submitted) {
      submission = (await api('PATCH', `/v1/reviewSubmissions/${submission.id}`,
        request('reviewSubmissions', { submitted: true }, undefined, submission.id))).data;
    }
    console.log(`Review submission ${submission.id}: ${submission.attributes.state || 'submitted'}`);
  } else {
    console.log('Listing prepared; SUBMIT=false, so App Review was not requested');
  }
}

try { await main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
