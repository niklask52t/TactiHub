/**
 * Standalone script: Converts source map images (JPG) and gadget icons (PNG) to WebP
 * with deterministic file names. No DB access needed.
 *
 * Usage:
 *   pnpm --filter @tactihub/server tsx src/scripts/process-images.ts "C:\path\to\Sternab"
 *
 * Output goes to packages/server/uploads/maps/ and packages/server/uploads/gadgets/
 */

import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

const UPLOAD_DIR = path.resolve('uploads');

// ── Types ───────────────────────────────────────────────

interface FloorDef {
  name: string;
  num: number;
  blueprint: string;
  dark?: string;
  white?: string;
}

interface MapDef {
  slug: string;
  folder: string;
  floors: FloorDef[];
}

interface GadgetIconDef {
  slug: string;
  file: string;
}

// ── Map definitions (same as import-maps.ts) ────────────

const MAP_DEFS: MapDef[] = [
  {
    slug: 'bank', folder: 'Bank Rework',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'BankReworkBasementBlue.jpg', dark: 'BankReworkBasementBlack.jpg', white: 'BankReworkBasementBW.jpg' },
      { name: 'Ground Floor', num: 2, blueprint: 'BankReworkGroundFloorBlue.jpg', dark: 'BankReworkGroundFloorBlack.jpg', white: 'BankReworkGroundFloorBW.jpg' },
      { name: 'Top Floor', num: 3, blueprint: 'BankReworkTopFloorBlue.jpg', dark: 'BankReworkTopFloorBlack.jpg', white: 'BankReworkTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'border', folder: 'Border',
    floors: [
      { name: 'Ground Floor', num: 1, blueprint: 'BorderGroundFloor.jpg', dark: 'BorderGroundFloorB.jpg', white: 'BorderGroundFloorBW.jpg' },
      { name: 'Top Floor', num: 2, blueprint: 'BorderTopFloor.jpg', dark: 'BorderTopFloorB.jpg', white: 'BorderTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'coastline', folder: 'Coastline',
    floors: [
      { name: 'Ground Floor', num: 1, blueprint: 'CoastlineGroundFloor.jpg', dark: 'CoastlineGroundFloorB.jpg', white: 'CoastlineGroundFloorBW.jpg' },
      { name: 'Top Floor', num: 2, blueprint: 'CoastlineTopFloor.jpg', dark: 'CoastlineTopFloorB.jpg', white: 'CoastlineTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'consulate', folder: 'Consulate Rework',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'ConsulateRWBasement.jpg', dark: 'ConsulateRWBasementBlack.jpg', white: 'ConsulateRWBasementBW.jpg' },
      { name: 'Ground Floor', num: 2, blueprint: 'ConsulateRWGround.jpg', dark: 'ConsulateRWGroundB.jpg', white: 'ConsulateRWGroundBW.jpg' },
      { name: 'Top Floor', num: 3, blueprint: 'ConsulateRWTopFloorB.jpg', dark: 'ConsulateRWTopFloorBlack.jpg', white: 'ConsulateRWTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'chalet', folder: 'Chalet Rework',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'ChaletRWBasement.jpg', dark: 'ChaletRWBasementB.jpg', white: 'ChaletRWBasementBW.jpg' },
      { name: 'Ground Floor', num: 2, blueprint: 'ChaletRWGroundFloor.jpg', dark: 'ChaletRWGroundFloorB.jpg', white: 'ChaletRWGroundFloorBW.jpg' },
      { name: 'Top Floor', num: 3, blueprint: 'ChaletRWTopFloor.jpg', dark: 'ChaletRWTopFloorB.jpg', white: 'ChaletRWTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'clubhouse', folder: 'Clubhouse',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'ClubhouseBasement.jpg', dark: 'ClubhouseBasementB.jpg', white: 'ClubHouseBasementBW.jpg' },
      { name: 'Ground Floor', num: 2, blueprint: 'ClubhouseGroundFloor.jpg', dark: 'ClubhouseGroundFloorB.jpg', white: 'ClubhouseGroundFloorBW.jpg' },
      { name: 'Top Floor', num: 3, blueprint: 'ClubhouseTopFloor.jpg', dark: 'ClubhouseTopFloorB.jpg', white: 'ClubhouseTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'hereford', folder: 'Hereford',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'HerefordBasement.jpg', dark: 'HerefordBasementB.jpg' },
      { name: 'Ground Floor', num: 2, blueprint: 'HerefordGroundFloor.jpg', dark: 'HerefordGroundFloorB.jpg' },
      { name: 'First Floor', num: 3, blueprint: 'HerefordFirstFloor.jpg', dark: 'HerefordFirstFloorB.jpg' },
      { name: 'Top Floor', num: 4, blueprint: 'HerefordTopFloor.jpg', dark: 'HerefordTopFloorB.jpg' },
    ],
  },
  {
    slug: 'kafe', folder: 'Kafe',
    floors: [
      { name: 'Ground Floor', num: 1, blueprint: 'KafeGroundFloor.jpg', dark: 'KafeGroundFloorB.jpg', white: 'KafeGroundBW.jpg' },
      { name: 'Middle Floor', num: 2, blueprint: 'KafeMiddleFloor.jpg', dark: 'KafeMiddleFloorB.jpg', white: 'KafeMiddleFloorBW.jpg' },
      { name: 'Top Floor', num: 3, blueprint: 'KafeTopFloor.jpg', dark: 'KafeTopFloorB.jpg', white: 'KafeTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'oregon', folder: 'Oregon Rework',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'OregonRWbasement.jpg', dark: 'OregonRWbasementB.jpg', white: 'OregonRWbasementBW.jpg' },
      { name: 'Ground Floor', num: 2, blueprint: 'OregonRWgroundfloor.jpg', dark: 'OregonRWgroundfloorB.jpg', white: 'OregonRWgroundfloorBW.jpg' },
      { name: 'Tier 3', num: 3, blueprint: 'OregonRWT3.jpg', dark: 'OregonRWT3B.jpg', white: 'OregonRWT3bw.jpg' },
      { name: 'Top Floor', num: 4, blueprint: 'OregonRWTopFloor.jpg', dark: 'OregonRWTopFloorB.jpg', white: 'OregonRWTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'skyscraper', folder: 'Skyscraper Rework',
    floors: [
      { name: 'Ground Floor', num: 1, blueprint: 'SkyscraperGroundFloor.jpg', dark: 'SkyscraperGroundFloorB.jpg', white: 'SkyscraperGroundFloorBW.jpg' },
      { name: 'Top Floor', num: 2, blueprint: 'SkyscraperTopFloor.jpg', dark: 'SkyscraperTopFloorB.jpg', white: 'SkyscraperTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'theme-park', folder: 'Themepark',
    floors: [
      { name: 'Ground Floor', num: 1, blueprint: 'ThemeparkGroundFloor.jpg', dark: 'ThemeparkGroundFloorBlack.jpg', white: 'ThemeparkGroudFloorBW.jpg' },
      { name: 'Top Floor', num: 2, blueprint: 'ThemeparkTopFloor.jpg', dark: 'ThemeparkTopFloorBlack.jpg', white: 'ThemeparkTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'villa', folder: 'Villa',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'VillaBasement.jpg', dark: 'VillaBasementB.jpg', white: 'VillaBasementBW.jpg' },
      { name: 'Ground Floor', num: 2, blueprint: 'VillaGroundFloor.jpg', dark: 'VillaGroundFloorB.jpg', white: 'VillaGroundFloorBW.jpg' },
      { name: 'Top Floor', num: 3, blueprint: 'VillaTopFloor.jpg', dark: 'VillaTopFloorB.jpg', white: 'VillaTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'favela', folder: 'Favela',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'FavelaBasement.jpg', dark: 'FavelaBasementB.jpg' },
      { name: 'First Floor', num: 2, blueprint: 'FavelaFirstFloor.jpg', dark: 'FavelaFirstFloorB.jpg' },
      { name: 'Second Floor', num: 3, blueprint: 'FavelaSecondFloor.jpg', dark: 'FavelaSecondFloorB.jpg' },
      { name: 'Top Floor', num: 4, blueprint: 'FavelaTopFloor.jpg', dark: 'FavelaTopFloorB.jpg' },
    ],
  },
  {
    slug: 'fortress', folder: 'Fortress',
    floors: [
      { name: 'Ground Floor', num: 1, blueprint: 'FortressGroundFloor.jpg', dark: 'FortressGroundFloorB.jpg' },
      { name: 'Top Floor', num: 2, blueprint: 'FortressTopFloor.jpg', dark: 'FortressTopFloorB.jpg' },
    ],
  },
  {
    slug: 'house', folder: 'House Rework',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'HouseRWBasement.jpg', dark: 'HouseRWBasementB.jpg', white: 'HouseRWBasementBW.jpg' },
      { name: 'Ground Floor', num: 2, blueprint: 'HouseRWGroundFloor.jpg', dark: 'HouseRWGroundFloorB.jpg', white: 'HouseRWGroundFloorBW.jpg' },
      { name: 'Top Floor', num: 3, blueprint: 'HouseRWTopFloor.jpg', dark: 'HouseRWTopFloorB.jpg', white: 'HouseRWTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'kanal', folder: 'Kanal',
    floors: [
      { name: 'Lower Basement', num: 1, blueprint: 'KanalLowerBottomFloor.jpg', dark: 'KanalLowerBottomB.jpg', white: 'KanalLowerBottomBW.jpg' },
      { name: 'Basement', num: 2, blueprint: 'KanalBottomFloor.jpg', dark: 'KanalBottomFloorB.jpg', white: 'KanalBottomFloorBW.jpg' },
      { name: 'Ground Floor', num: 3, blueprint: 'KanalGroundFloor.jpg', dark: 'KanalGroundFloorB.jpg', white: 'KanalGroundFloorBW.jpg' },
      { name: 'Middle Floor', num: 4, blueprint: 'KanalM.jpg' },
      { name: 'Top Floor', num: 5, blueprint: 'KanalTopFloor.jpg', dark: 'KanalTopFloorB.jpg', white: 'KanalTopFloorBW.jpg' },
    ],
  },
  {
    slug: 'nighthaven-labs', folder: 'Nighthaven Labs',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'NighthavenBasement.jpg', dark: 'NighthavenBasementB.jpg', white: 'NighthavenBasementBW.jpg' },
      { name: 'Ground Floor', num: 2, blueprint: 'NighthavenGroundFloor.jpg', dark: 'NighthavenGroundB.jpg', white: 'NighthavenGroundBW.jpg' },
      { name: 'Top Floor', num: 3, blueprint: 'NighthavenTopFloor.jpg', dark: 'NighthavenTopFloorB.jpg', white: 'NighthavenTopBW.jpg' },
    ],
  },
  {
    slug: 'outback', folder: 'Outback Rework',
    floors: [
      { name: 'Ground Floor', num: 1, blueprint: 'OutbackReworkGroundFloor.jpg', dark: 'OutbackReworkGroundFloorBlack.jpg', white: 'OutbackReworkGroundBW.jpg' },
      { name: 'Top Floor', num: 2, blueprint: 'OutbackReworkTopFloor.jpg', dark: 'OutbackReworkTopFloorBlack.jpg', white: 'OutbackReworkTopBW.jpg' },
    ],
  },
  {
    slug: 'plane', folder: 'Plane',
    floors: [
      { name: 'Bottom Floor', num: 1, blueprint: 'PlaneBottomFloor.jpg', dark: 'PlaneBottomFloorB.jpg' },
      { name: 'Middle Floor', num: 2, blueprint: 'PlaneMiddleFloor.jpg', dark: 'PlaneMiddleFloorB.jpg' },
      { name: 'Top Floor', num: 3, blueprint: 'PlaneTopFloor.jpg', dark: 'PlaneTopFloorB.jpg' },
    ],
  },
  {
    slug: 'tower', folder: 'Tower',
    floors: [
      { name: 'Bottom Floor', num: 1, blueprint: 'TowerBottomFloor.jpg', dark: 'TowerBottomFloorB.jpg' },
      { name: 'Top Floor', num: 2, blueprint: 'TowerTopFloor.jpg', dark: 'TowerTopFloorB.jpg' },
    ],
  },
  {
    slug: 'yacht', folder: 'Yacht',
    floors: [
      { name: 'Basement', num: 1, blueprint: 'YachtBasement.jpg', dark: 'YachtBasementB.jpg' },
      { name: 'First Floor', num: 2, blueprint: 'YachtFirstFloor.jpg', dark: 'YachtFirstFloorB.jpg' },
      { name: 'Second Floor', num: 3, blueprint: 'YachtSecondFloor.jpg', dark: 'YachtSecondFloorB.jpg' },
      { name: 'Top Floor', num: 4, blueprint: 'YachtTopFloor.jpg', dark: 'YachtTopFloorB.jpg' },
    ],
  },
];

// ── Gadget icons ────────────────────────────────────────

const GADGET_ICONS: GadgetIconDef[] = [
  { slug: 'prisma', file: 'Alibi.png' },
  { slug: 'shock-wire', file: 'Bandit.png' },
  { slug: 'armor-panel', file: 'Castle.png' },
  { slug: 'yokai', file: 'Echo.png' },
  { slug: 'grzmot-mine', file: 'Ela.png' },
  { slug: 'welcome-mat', file: 'Frost.png' },
  { slug: 'ads', file: 'Jager.png' },
  { slug: 'edd', file: 'Kapkan.png' },
  { slug: 'gu-mine', file: 'Lesion.png' },
  { slug: 'evil-eye', file: 'Maestro.png' },
  { slug: 'black-mirror', file: 'Mira.png' },
  { slug: 'signal-disruptor', file: 'Mute.png' },
  { slug: 'black-eye', file: 'Valkyrie.png' },
  { slug: 'z8-grenades', file: 'ToxicBabe.png' },
  { slug: 'barbed-wire', file: 'Barb.png' },
  { slug: 'bulletproof-cam', file: 'BulletProofCam.png' },
  { slug: 'nitro-cell', file: 'NitroCell.png' },
  { slug: 'claymore', file: 'Claymore.png' },
  { slug: 'deployable-shield', file: 'Shield.png' },
  { slug: 'impact-grenade', file: 'ImpactGrenade.png' },
  { slug: 'smoke-grenade', file: 'Smoke.png' },
  { slug: 'barricade', file: 'Barricade.png' },
  { slug: 'drone', file: 'Drone.png' },
];

// ── Process single image ────────────────────────────────

async function processImage(src: string, dest: string, width?: number): Promise<boolean> {
  try {
    await fs.access(src);
  } catch {
    return false;
  }

  const buffer = await fs.readFile(src);
  let s = sharp(buffer);
  if (width) s = s.resize(width, undefined, { fit: 'inside' });
  await s.webp({ quality: 85 }).toFile(dest);
  return true;
}

// ── Main ────────────────────────────────────────────────

async function main() {
  const srcRoot = process.argv[2];
  if (!srcRoot) {
    console.error('Usage: tsx src/scripts/process-images.ts <source-folder>');
    process.exit(1);
  }

  const mapsDir = path.join(UPLOAD_DIR, 'maps');
  const gadgetsDir = path.join(UPLOAD_DIR, 'gadgets');
  await fs.mkdir(mapsDir, { recursive: true });
  await fs.mkdir(gadgetsDir, { recursive: true });

  console.log(`Source:  ${srcRoot}`);
  console.log(`Output:  ${path.resolve(UPLOAD_DIR)}`);

  // ── Process map floors ──────────────────────────────

  let floorCount = 0;
  let skipCount = 0;

  for (const map of MAP_DEFS) {
    console.log(`\n${map.slug} (${map.folder})`);

    for (const floor of map.floors) {
      // Deterministic names: {slug}-{num}-blueprint.webp
      const bpDest = path.join(mapsDir, `${map.slug}-${floor.num}-blueprint.webp`);
      const bpSrc = path.join(srcRoot, map.folder, floor.blueprint);

      const ok = await processImage(bpSrc, bpDest, 1200);
      if (!ok) {
        console.warn(`  SKIP ${floor.name}: ${floor.blueprint} not found`);
        skipCount++;
        continue;
      }

      let variants = 'blueprint';

      if (floor.dark) {
        const darkDest = path.join(mapsDir, `${map.slug}-${floor.num}-dark.webp`);
        const darkSrc = path.join(srcRoot, map.folder, floor.dark);
        if (await processImage(darkSrc, darkDest, 1200)) {
          variants += ' + dark';
        }
      }

      if (floor.white) {
        const whiteDest = path.join(mapsDir, `${map.slug}-${floor.num}-white.webp`);
        const whiteSrc = path.join(srcRoot, map.folder, floor.white);
        if (await processImage(whiteSrc, whiteDest, 1200)) {
          variants += ' + white';
        }
      }

      console.log(`  ${floor.name}: ${variants}`);
      floorCount++;
    }
  }

  console.log(`\nFloors: ${floorCount} processed, ${skipCount} skipped`);

  // ── Process gadget icons ────────────────────────────

  const gadgetFolder = path.join(srcRoot, 'Gadgets');
  let gadgetCount = 0;

  try {
    await fs.access(gadgetFolder);
  } catch {
    console.log('\nNo Gadgets folder found — skipping');
    process.exit(0);
  }

  console.log('\nGadget icons:');
  for (const g of GADGET_ICONS) {
    const src = path.join(gadgetFolder, g.file);
    const dest = path.join(gadgetsDir, `${g.slug}.webp`);

    if (await processImage(src, dest)) {
      console.log(`  ${g.slug} <- ${g.file}`);
      gadgetCount++;
    } else {
      console.warn(`  SKIP ${g.slug}: ${g.file} not found`);
    }
  }

  console.log(`\nGadgets: ${gadgetCount} processed`);
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
