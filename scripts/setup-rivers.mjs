#!/usr/bin/env node
// Provisions the River Intelligence Platform metaobject schema on Shopify.
//
//   pnpm dlx dotenv-cli -e .env -- node scripts/setup-rivers.mjs definitions
//   pnpm dlx dotenv-cli -e .env -- node scripts/setup-rivers.mjs seed yakima
//
// Or source .env and run: node scripts/setup-rivers.mjs <command>

import { readFileSync } from 'node:fs';

// Tiny .env parser so the script runs without extra deps.
function loadDotenv(path = '.env') {
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadDotenv();

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = '2025-01';

if (!DOMAIN || !TOKEN) {
  console.error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) {
    console.error(JSON.stringify(body.errors, null, 2));
    throw new Error('GraphQL error');
  }
  return body.data;
}

async function findDefinition(type) {
  const data = await gql(
    `query($type: String!) { metaobjectDefinitionByType(type: $type) { id type name } }`,
    { type }
  );
  return data.metaobjectDefinitionByType;
}

async function createHatchEntryDefinition() {
  const existing = await findDefinition('hatch_entry');
  if (existing) {
    console.log(`✓ hatch_entry already exists (${existing.id})`);
    return existing.id;
  }
  const data = await gql(`
    mutation {
      metaobjectDefinitionCreate(definition: {
        name: "Hatch Entry",
        type: "hatch_entry",
        access: { storefront: PUBLIC_READ },
        capabilities: { publishable: { enabled: true } },
        fieldDefinitions: [
          { name: "Bug Name", key: "bug_name", type: "single_line_text_field", required: true },
          { name: "Season Start Month", key: "season_start_month", type: "number_integer", required: true, validations: [{ name: "min", value: "1" }, { name: "max", value: "12" }] },
          { name: "Season End Month", key: "season_end_month", type: "number_integer", required: true, validations: [{ name: "min", value: "1" }, { name: "max", value: "12" }] },
          { name: "Min Water Temp (F)", key: "min_water_temp_f", type: "number_integer" },
          { name: "Max Water Temp (F)", key: "max_water_temp_f", type: "number_integer" },
          { name: "Peak Time Start", key: "peak_time_start", type: "single_line_text_field", description: "HH:MM (24h)" },
          { name: "Peak Time End", key: "peak_time_end", type: "single_line_text_field", description: "HH:MM (24h)" },
          { name: "Lifecycle Stage", key: "lifecycle_stage", type: "single_line_text_field" },
          { name: "Recommended Products", key: "recommended_products", type: "list.product_reference" }
        ]
      }) {
        metaobjectDefinition { id type }
        userErrors { field message code }
      }
    }
  `);
  const errs = data.metaobjectDefinitionCreate.userErrors;
  if (errs.length) { console.error(errs); throw new Error('Create failed'); }
  const id = data.metaobjectDefinitionCreate.metaobjectDefinition.id;
  console.log(`✓ Created hatch_entry (${id})`);
  return id;
}

async function fetchRiverDefinitionFields(definitionId) {
  const data = await gql(`
    query($id: ID!) {
      metaobjectDefinition(id: $id) {
        id
        fieldDefinitions { key }
      }
    }
  `, { id: definitionId });
  return (data.metaobjectDefinition?.fieldDefinitions || []).map(f => f.key);
}

async function addRiverDefinitionFields(definitionId, existingKeys) {
  const desired = [
    { key: 'description',      spec: { name: 'Description',     key: 'description',      type: 'multi_line_text_field', description: 'Hero lede text shown under the river name' } },
    { key: 'latitude',         spec: { name: 'Latitude',        key: 'latitude',         type: 'single_line_text_field', description: 'Decimal degrees, e.g. 46.8621' } },
    { key: 'longitude',        spec: { name: 'Longitude',       key: 'longitude',        type: 'single_line_text_field', description: 'Decimal degrees, e.g. -120.4716' } },
    { key: 'access_points',    spec: { name: 'Access Points',   key: 'access_points',    type: 'multi_line_text_field', description: 'One per line, format: Name|MI 3' } },
    { key: 'nearest_towns',    spec: { name: 'Nearest Towns',   key: 'nearest_towns',    type: 'multi_line_text_field', description: 'One per line, format: City, WA|22 mi SE' } },
    { key: 'best_stretch_note',spec: { name: 'Best Stretch',    key: 'best_stretch_note',type: 'multi_line_text_field', description: 'Short narrative: "Canyon between X and Y …"' } },
    { key: 'page_handle',      spec: { name: 'Page Handle',     key: 'page_handle',      type: 'single_line_text_field', description: 'Handle of the detail page (e.g. yakima-river) — used by the picker to link to /pages/<handle>' } },
  ];
  const missing = desired.filter(d => !existingKeys.includes(d.key));
  if (missing.length === 0) {
    console.log(`  = river definition already has all optional fields`);
    return;
  }
  const creates = missing.map(m => ({ create: m.spec }));
  const data = await gql(`
    mutation($id: ID!, $fields: [MetaobjectFieldDefinitionOperationInput!]!) {
      metaobjectDefinitionUpdate(id: $id, definition: { fieldDefinitions: $fields }) {
        metaobjectDefinition { id }
        userErrors { field message code }
      }
    }
  `, { id: definitionId, fields: creates });
  const errs = data.metaobjectDefinitionUpdate.userErrors;
  if (errs.length) { console.error(errs); throw new Error('Definition update failed'); }
  console.log(`  ✓ Added ${missing.length} field(s) to river definition: ${missing.map(m => m.key).join(', ')}`);
}

async function createRiverDefinition(hatchDefinitionId) {
  const existing = await findDefinition('river');
  if (existing) {
    console.log(`✓ river already exists (${existing.id})`);
    const existingKeys = await fetchRiverDefinitionFields(existing.id);
    await addRiverDefinitionFields(existing.id, existingKeys);
    return existing.id;
  }
  const data = await gql(`
    mutation($hatchId: String!) {
      metaobjectDefinitionCreate(definition: {
        name: "River",
        type: "river",
        access: { storefront: PUBLIC_READ },
        capabilities: { publishable: { enabled: true } },
        fieldDefinitions: [
          { name: "Name", key: "name", type: "single_line_text_field", required: true },
          { name: "Slug", key: "slug", type: "single_line_text_field", required: true, description: "Match RIVER_CONFIG key in river-conditions.js (e.g. yakima)" },
          { name: "Region", key: "region", type: "single_line_text_field" },
          { name: "USGS Station ID", key: "usgs_station_id", type: "single_line_text_field", required: true },
          { name: "Hero Image", key: "hero_image", type: "file_reference", validations: [{ name: "file_type_options", value: "[\\"Image\\"]" }] },
          { name: "Current Clarity", key: "current_clarity", type: "single_line_text_field", description: "e.g. Clear, Tinted, Muddy" },
          { name: "Clarity Visibility", key: "clarity_visibility", type: "single_line_text_field", description: "e.g. >6ft, 2-4ft" },
          { name: "Description", key: "description", type: "multi_line_text_field", description: "Hero lede text shown under the river name" },
          { name: "Latitude", key: "latitude", type: "single_line_text_field", description: "Decimal degrees, e.g. 46.8621" },
          { name: "Longitude", key: "longitude", type: "single_line_text_field", description: "Decimal degrees, e.g. -120.4716" },
          { name: "Access Points", key: "access_points", type: "multi_line_text_field", description: "One per line, format: Name|MI 3" },
          { name: "Nearest Towns", key: "nearest_towns", type: "multi_line_text_field", description: "One per line, format: City, WA|22 mi SE" },
          { name: "Best Stretch", key: "best_stretch_note", type: "multi_line_text_field", description: "Short narrative: Canyon between X and Y …" },
          { name: "Page Handle", key: "page_handle", type: "single_line_text_field", description: "Handle of the detail page (e.g. yakima-river) — used by the picker to link" },
          { name: "Guide Notes", key: "guide_notes", type: "multi_line_text_field" },
          { name: "Guide Notes Date", key: "guide_notes_date", type: "date" },
          { name: "Hatches", key: "hatches", type: "list.metaobject_reference", validations: [{ name: "metaobject_definition_id", value: $hatchId }] }
        ]
      }) {
        metaobjectDefinition { id type }
        userErrors { field message code }
      }
    }
  `, { hatchId: hatchDefinitionId });
  const errs = data.metaobjectDefinitionCreate.userErrors;
  if (errs.length) { console.error(errs); throw new Error('Create failed'); }
  const id = data.metaobjectDefinitionCreate.metaobjectDefinition.id;
  console.log(`✓ Created river (${id})`);
  return id;
}

async function createPageRiverMetafield(riverDefinitionId) {
  const data = await gql(`
    query { metafieldDefinitions(first: 50, ownerType: PAGE, namespace: "custom") { nodes { id key namespace } } }
  `);
  const existing = data.metafieldDefinitions.nodes.find(n => n.key === 'river');
  if (existing) {
    console.log(`✓ page.custom.river already exists (${existing.id})`);
    return existing.id;
  }
  const res = await gql(`
    mutation($riverId: String!) {
      metafieldDefinitionCreate(definition: {
        name: "River",
        namespace: "custom",
        key: "river",
        type: "metaobject_reference",
        ownerType: PAGE,
        validations: [{ name: "metaobject_definition_id", value: $riverId }],
        access: { storefront: PUBLIC_READ }
      }) {
        createdDefinition { id namespace key }
        userErrors { field message code }
      }
    }
  `, { riverId: riverDefinitionId });
  const errs = res.metafieldDefinitionCreate.userErrors;
  if (errs.length) { console.error(errs); throw new Error('Create failed'); }
  const id = res.metafieldDefinitionCreate.createdDefinition.id;
  console.log(`✓ Created page.custom.river metafield (${id})`);
  return id;
}

async function createMetaobject(type, handle, fields) {
  const fieldList = Object.entries(fields).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }));
  const data = await gql(`
    mutation($input: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $input) {
        metaobject { id handle type }
        userErrors { field message code }
      }
    }
  `, { input: { type, handle, fields: fieldList, capabilities: { publishable: { status: 'ACTIVE' } } } });
  const errs = data.metaobjectCreate.userErrors;
  if (errs.length) { console.error(errs); throw new Error(`Seed failed for ${type}/${handle}`); }
  const mo = data.metaobjectCreate.metaobject;
  console.log(`  ✓ ${type}/${handle} → ${mo.id}`);
  return mo.id;
}

async function findMetaobject(type, handle) {
  const data = await gql(
    `query($handle: MetaobjectHandleInput!) { metaobjectByHandle(handle: $handle) { id handle } }`,
    { handle: { type, handle } }
  );
  return data.metaobjectByHandle;
}

async function seedYakima() {
  console.log('Seeding Yakima...');

  // Hatches
  const hatches = [
    {
      handle: 'yakima-skwala',
      bug_name: 'Skwala Stonefly',
      season_start_month: 2,
      season_end_month: 4,
      min_water_temp_f: 38,
      max_water_temp_f: 48,
      peak_time_start: '11:00',
      peak_time_end: '15:00',
      lifecycle_stage: 'Adult',
    },
    {
      handle: 'yakima-bwo',
      bug_name: 'Blue-Winged Olive',
      season_start_month: 3,
      season_end_month: 6,
      min_water_temp_f: 44,
      max_water_temp_f: 58,
      peak_time_start: '10:00',
      peak_time_end: '14:00',
      lifecycle_stage: 'Dun',
    },
    {
      handle: 'yakima-pmd',
      bug_name: 'Pale Morning Dun',
      season_start_month: 5,
      season_end_month: 8,
      min_water_temp_f: 48,
      max_water_temp_f: 62,
      peak_time_start: '13:00',
      peak_time_end: '16:00',
      lifecycle_stage: 'Emerging',
    },
  ];

  const hatchIds = [];
  for (const h of hatches) {
    const existing = await findMetaobject('hatch_entry', h.handle);
    if (existing) {
      console.log(`  = hatch_entry/${h.handle} already exists`);
      hatchIds.push(existing.id);
      continue;
    }
    const { handle, ...fields } = h;
    const id = await createMetaobject('hatch_entry', handle, fields);
    hatchIds.push(id);
  }

  const existingRiver = await findMetaobject('river', 'yakima');
  if (existingRiver) {
    console.log(`  = river/yakima already exists (${existingRiver.id})`);
    return existingRiver.id;
  }

  const riverId = await createMetaobject('river', 'yakima', {
    name: 'Yakima River',
    slug: 'yakima',
    region: 'Central Washington',
    usgs_station_id: '12484500',
    current_clarity: 'Clear',
    clarity_visibility: '>6ft',
    guide_notes: 'Yakima fishing well below Roza Dam. Skwalas coming off mid-day, BWOs late morning on cloudy afternoons.\n\nSwing streamers in the lower river. Dry-dropper rigs through the canyon have been producing.',
    hatches: hatchIds,
  });
  return riverId;
}

async function createPage(handle, title, riverMetaobjectId) {
  // Find existing page
  const existing = await gql(
    `query($q: String) { pages(first: 5, query: $q) { nodes { id handle title templateSuffix } } }`,
    { q: `handle:${handle}` }
  );
  const found = existing.pages.nodes.find(n => n.handle === handle);
  if (found) {
    console.log(`✓ Page ${handle} already exists (${found.id})`);
    await setPageMetafield(found.id, riverMetaobjectId);
    return found.id;
  }

  const data = await gql(`
    mutation($page: PageCreateInput!) {
      pageCreate(page: $page) {
        page { id handle title }
        userErrors { field message code }
      }
    }
  `, {
    page: {
      title,
      handle,
      templateSuffix: 'river',
      isPublished: true,
      body: '',
    },
  });
  const errs = data.pageCreate.userErrors;
  if (errs.length) { console.error(errs); throw new Error('Page create failed'); }
  const id = data.pageCreate.page.id;
  console.log(`✓ Created page /${handle} (${id})`);
  await setPageMetafield(id, riverMetaobjectId);
  return id;
}

async function setPageMetafield(pageId, riverMetaobjectId) {
  const data = await gql(`
    mutation($mfs: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $mfs) {
        metafields { id namespace key value }
        userErrors { field message code }
      }
    }
  `, {
    mfs: [{
      ownerId: pageId,
      namespace: 'custom',
      key: 'river',
      type: 'metaobject_reference',
      value: riverMetaobjectId,
    }],
  });
  const errs = data.metafieldsSet.userErrors;
  if (errs.length) { console.error(errs); throw new Error('Metafield set failed'); }
  console.log(`  ✓ Page metafield custom.river → ${riverMetaobjectId}`);
}

async function updateMetaobject(id, fields) {
  const fieldList = Object.entries(fields).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }));
  const data = await gql(`
    mutation($id: ID!, $fields: [MetaobjectFieldInput!]!) {
      metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
        metaobject { id handle }
        userErrors { field message code }
      }
    }
  `, { id, fields: fieldList });
  const errs = data.metaobjectUpdate.userErrors;
  if (errs.length) { console.error(errs); throw new Error('Update failed'); }
  return data.metaobjectUpdate.metaobject;
}

async function productIdByHandle(handle) {
  const data = await gql(
    `query($h: String!) { productByHandle(handle: $h) { id title } }`,
    { h: handle }
  );
  if (!data.productByHandle) throw new Error(`Product not found: ${handle}`);
  return data.productByHandle.id;
}

async function enhanceYakima() {
  const hero = 'gid://shopify/MediaImage/20253937762367';

  const yakima = await findMetaobject('river', 'yakima');
  if (!yakima) throw new Error('river/yakima not seeded — run `seed yakima` first');
  await updateMetaobject(yakima.id, { hero_image: hero });
  console.log(`  ✓ river/yakima hero_image → ${hero}`);

  const hatchProducts = {
    'yakima-skwala': ['chubby-chernobyl-pteronarcys', 'fulling-mill-stimulator'],
    'yakima-bwo':    ['fulling-mill-adams-parachute'],
    'yakima-pmd':    ['fulling-mill-adams-parachute'],
  };

  for (const [hatchHandle, productHandles] of Object.entries(hatchProducts)) {
    const hatch = await findMetaobject('hatch_entry', hatchHandle);
    if (!hatch) { console.warn(`  ! ${hatchHandle} not found, skipping`); continue; }
    const productIds = [];
    for (const ph of productHandles) productIds.push(await productIdByHandle(ph));
    await updateMetaobject(hatch.id, { recommended_products: productIds });
    console.log(`  ✓ ${hatchHandle} recommended_products → ${productIds.length} product(s)`);
  }
}

// ------------------------------------------------------------------
// WA Rivers catalog — source of truth for seeding metaobjects + pages.
// Keep slugs in sync with RIVER_CONFIG keys in assets/river-conditions.js.
// ------------------------------------------------------------------
const WA_RIVERS = [
  {
    slug: 'yakima', page_handle: 'yakima-river', page_title: 'Yakima River',
    name: 'Yakima River', region: 'Central Washington', usgs_station_id: '12484500',
    latitude: '46.8621', longitude: '-120.4716',
    description: 'Tailwater trout fishery through the Yakima Canyon — wild rainbows and cutthroat below Roza Dam, year-round.'
  },
  {
    slug: 'skagit', page_handle: 'skagit-river', page_title: 'Skagit River',
    name: 'Skagit River', region: 'North Cascades', usgs_station_id: '12200500',
    latitude: '48.5358', longitude: '-121.7466',
    description: 'Big coastal river draining the North Cascades — wild winter steelhead, summer bull trout, and resident cutthroat through the upper reaches.'
  },
  {
    slug: 'sauk', page_handle: 'sauk-river', page_title: 'Sauk River',
    name: 'Sauk River', region: 'North Cascades', usgs_station_id: '12189500',
    latitude: '48.4237', longitude: '-121.5679',
    description: 'Glacier-fed Skagit tributary — one of the last wild steelhead fisheries in the Lower 48. Catch-and-release only.'
  },
  {
    slug: 'skykomish', page_handle: 'skykomish-river', page_title: 'Skykomish River',
    name: 'Skykomish River', region: 'Central Cascades', usgs_station_id: '12134500',
    latitude: '47.8537', longitude: '-121.6957',
    description: 'Classic Cascade freestone — summer steelhead on swung flies, wild cutthroat in the upper forks.'
  },
  {
    slug: 'snoqualmie', page_handle: 'snoqualmie-river', page_title: 'Snoqualmie River',
    name: 'Snoqualmie River', region: 'Central Cascades', usgs_station_id: '12149000',
    latitude: '47.6650', longitude: '-121.9124',
    description: 'Urban-accessible trout water below the Falls, with wild cutthroat and winter steelhead through the three forks.'
  },
  {
    slug: 'stillaguamish', page_handle: 'stillaguamish-river', page_title: 'Stillaguamish River',
    name: 'Stillaguamish River', region: 'Central Cascades', usgs_station_id: '12167000',
    latitude: '48.1879', longitude: '-121.9965',
    description: 'Birthplace of NW fly fishing — North Fork is a traditional fly-only summer steelhead stretch.'
  },
  {
    slug: 'klickitat', page_handle: 'klickitat-river', page_title: 'Klickitat River',
    name: 'Klickitat River', region: 'South Central Washington', usgs_station_id: '14113000',
    latitude: '45.8051', longitude: '-121.1528',
    description: 'Glacial Columbia tributary — native summer steelhead through volcanic canyons below Lyle.'
  },
  {
    slug: 'cowlitz', page_handle: 'cowlitz-river', page_title: 'Cowlitz River',
    name: 'Cowlitz River', region: 'Southwest Washington', usgs_station_id: '14243000',
    latitude: '46.2727', longitude: '-122.9079',
    description: 'Year-round hatchery run below Blue Creek — winter steelhead, spring chinook, summer coho.'
  },
  {
    slug: 'lewis', page_handle: 'lewis-river', page_title: 'Lewis River',
    name: 'Lewis River', region: 'Southwest Washington', usgs_station_id: '14220500',
    latitude: '45.9551', longitude: '-122.5667',
    description: 'Tailwater below Merwin Dam — summer steelhead, winter steelhead, and a strong resident rainbow population.'
  },
  {
    slug: 'toutle', page_handle: 'toutle-river', page_title: 'Toutle River',
    name: 'Toutle River', region: 'Southwest Washington', usgs_station_id: '14242580',
    latitude: '46.2785', longitude: '-122.8135',
    description: 'Recovering post–Mt. St. Helens — winter steelhead and summer runs once flows settle.'
  },
  {
    slug: 'solduc', page_handle: 'sol-duc-river', page_title: 'Sol Duc River',
    name: 'Sol Duc River', region: 'Olympic Peninsula', usgs_station_id: '12041200',
    latitude: '47.9490', longitude: '-124.3688',
    description: 'Olympic Peninsula wild steelhead — catch-and-release, fly-only water for native winter fish.'
  },
  {
    slug: 'methow', page_handle: 'methow-river', page_title: 'Methow River',
    name: 'Methow River', region: 'North Cascades', usgs_station_id: '12449950',
    latitude: '48.4931', longitude: '-120.1687',
    description: 'East-slope Cascades — wild summer steelhead, dry-fly trout above Winthrop.'
  },
  {
    slug: 'wenatchee', page_handle: 'wenatchee-river', page_title: 'Wenatchee River',
    name: 'Wenatchee River', region: 'East Cascades', usgs_station_id: '12459000',
    latitude: '47.4432', longitude: '-120.3307',
    description: 'High-volume summer steelhead fishery — big water below Tumwater, technical pockets above.'
  },
  {
    slug: 'spokane', page_handle: 'spokane-river', page_title: 'Spokane River',
    name: 'Spokane River', region: 'Eastern Washington', usgs_station_id: '12422500',
    latitude: '47.6587', longitude: '-117.4199',
    description: 'Urban redband trout fishery — wild rainbows through Riverfront Park and downstream to Nine Mile.'
  },
  {
    slug: 'grande_ronde', page_handle: 'grande-ronde-river', page_title: 'Grande Ronde River',
    name: 'Grande Ronde River', region: 'Southeast Washington', usgs_station_id: '13333000',
    latitude: '46.0831', longitude: '-116.9762',
    description: 'Snake tributary in the Blue Mountains — fall steelhead, dry-fly fishing on the lower river.'
  },
];

async function seedWashingtonRivers() {
  console.log(`Seeding ${WA_RIVERS.length} Washington rivers...\n`);
  const results = [];
  for (const r of WA_RIVERS) {
    console.log(`→ ${r.name}`);
    const existing = await findMetaobject('river', r.slug);
    let riverId;
    const fields = {
      name: r.name,
      slug: r.slug,
      region: r.region,
      usgs_station_id: r.usgs_station_id,
      latitude: r.latitude,
      longitude: r.longitude,
      description: r.description,
      page_handle: r.page_handle,
    };
    if (existing) {
      console.log(`  = river/${r.slug} already exists (${existing.id}) — updating fields`);
      await updateMetaobject(existing.id, fields);
      riverId = existing.id;
    } else {
      riverId = await createMetaobject('river', r.slug, fields);
    }
    await createPage(r.page_handle, r.page_title, riverId);
    results.push({ slug: r.slug, id: riverId, page: `/pages/${r.page_handle}` });
  }
  console.log('\n' + '='.repeat(60));
  console.log(`Seeded ${results.length} river metaobjects + pages:`);
  for (const r of results) console.log(`  ${r.slug.padEnd(18)} → ${r.page}`);
}

async function main() {
  const cmd = process.argv[2] || 'definitions';

  if (cmd === 'definitions') {
    const hatchId = await createHatchEntryDefinition();
    const riverId = await createRiverDefinition(hatchId);
    await createPageRiverMetafield(riverId);
    console.log('\nDone. Next: `node scripts/setup-rivers.mjs seed yakima` or `seed-wa` to seed rivers.');
    return;
  }

  if (cmd === 'seed' && process.argv[3] === 'yakima') {
    const riverMoId = await seedYakima();
    console.log('\nCreating Yakima page...');
    await createPage('yakima-river', 'Yakima River', riverMoId);
    console.log('\nDone. Push theme, then preview at /pages/yakima-river');
    return;
  }

  if (cmd === 'seed-wa') {
    // Ensure definition has the expanded field set before seeding values for new fields.
    const def = await findDefinition('river');
    if (!def) throw new Error('river definition missing — run `definitions` first');
    const existingKeys = await fetchRiverDefinitionFields(def.id);
    await addRiverDefinitionFields(def.id, existingKeys);
    await seedWashingtonRivers();
    console.log('\nDone. Push theme, then preview at /pages/rivers');
    return;
  }

  if (cmd === 'enhance' && process.argv[3] === 'yakima') {
    console.log('Enhancing Yakima with hero image + product recommendations...');
    await enhanceYakima();
    console.log('\nDone.');
    return;
  }

  console.error(`Unknown command: ${cmd}\nUsage:\n  node scripts/setup-rivers.mjs definitions\n  node scripts/setup-rivers.mjs seed yakima\n  node scripts/setup-rivers.mjs seed-wa       # seed all 14 WA rivers\n  node scripts/setup-rivers.mjs enhance yakima`);
  process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
