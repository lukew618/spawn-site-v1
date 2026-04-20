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

async function createRiverDefinition(hatchDefinitionId) {
  const existing = await findDefinition('river');
  if (existing) {
    console.log(`✓ river already exists (${existing.id})`);
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

async function main() {
  const cmd = process.argv[2] || 'definitions';

  if (cmd === 'definitions') {
    const hatchId = await createHatchEntryDefinition();
    const riverId = await createRiverDefinition(hatchId);
    await createPageRiverMetafield(riverId);
    console.log('\nDone. Next: `node scripts/setup-rivers.mjs seed yakima` to seed a test river.');
    return;
  }

  if (cmd === 'seed' && process.argv[3] === 'yakima') {
    const riverMoId = await seedYakima();
    console.log('\nCreating Yakima page...');
    await createPage('yakima-river', 'Yakima River', riverMoId);
    console.log('\nDone. Push theme, then preview at /pages/yakima-river');
    return;
  }

  if (cmd === 'enhance' && process.argv[3] === 'yakima') {
    console.log('Enhancing Yakima with hero image + product recommendations...');
    await enhanceYakima();
    console.log('\nDone.');
    return;
  }

  console.error(`Unknown command: ${cmd}\nUsage:\n  node scripts/setup-rivers.mjs definitions\n  node scripts/setup-rivers.mjs seed yakima\n  node scripts/setup-rivers.mjs enhance yakima`);
  process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
