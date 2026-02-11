import 'dotenv/config';
import { db } from './connection.js';
import { users, settings, games, maps, mapFloors, operators, gadgets, operatorGadgets } from './schema/index.js';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  // 1. Create admin user
  const passwordHash = await bcrypt.hash('changeme', 10);
  const [admin] = await db.insert(users).values({
    username: 'admin',
    email: 'admin@strathub.local',
    passwordHash,
    role: 'admin',
    emailVerifiedAt: new Date(),
  }).onConflictDoNothing().returning();
  console.log('Admin user created:', admin?.email || 'already exists');

  // 2. Initialize settings
  await db.insert(settings).values({ key: 'registration_enabled', value: 'true' }).onConflictDoNothing();
  console.log('Settings initialized');

  // 3. Seed Rainbow Six Siege
  const [r6Game] = await db.insert(games).values({
    name: 'Rainbow Six Siege',
    slug: 'r6',
    description: 'Tom Clancy\'s Rainbow Six Siege - Tactical FPS',
    isActive: true,
  }).onConflictDoNothing().returning();

  if (r6Game) {
    console.log('Seeding R6 Siege...');

    // R6 Maps
    const r6Maps = [
      { name: 'Bank', slug: 'bank', isCompetitive: true },
      { name: 'Border', slug: 'border', isCompetitive: true },
      { name: 'Coastline', slug: 'coastline', isCompetitive: true },
      { name: 'Consulate', slug: 'consulate', isCompetitive: true },
      { name: 'Chalet', slug: 'chalet', isCompetitive: true },
      { name: 'Clubhouse', slug: 'clubhouse', isCompetitive: true },
      { name: 'Hereford', slug: 'hereford', isCompetitive: true },
      { name: 'Kafe', slug: 'kafe', isCompetitive: true },
      { name: 'Oregon', slug: 'oregon', isCompetitive: true },
      { name: 'Skyscraper', slug: 'skyscraper', isCompetitive: true },
      { name: 'Theme Park', slug: 'theme-park', isCompetitive: true },
      { name: 'Villa', slug: 'villa', isCompetitive: true },
      { name: 'Bartlett', slug: 'bartlett', isCompetitive: false },
      { name: 'Favela', slug: 'favela', isCompetitive: false },
      { name: 'House', slug: 'house', isCompetitive: false },
      { name: 'Kanal', slug: 'kanal', isCompetitive: false },
      { name: 'Plane', slug: 'plane', isCompetitive: false },
      { name: 'Tower', slug: 'tower', isCompetitive: false },
      { name: 'Yacht', slug: 'yacht', isCompetitive: false },
    ];

    for (const map of r6Maps) {
      const [m] = await db.insert(maps).values({
        gameId: r6Game.id,
        name: map.name,
        slug: map.slug,
        isCompetitive: map.isCompetitive,
      }).returning();

      // Create placeholder floors for each map
      const floorNames = ['Basement', 'Ground Floor', 'First Floor', 'Roof'];
      for (let i = 0; i < floorNames.length; i++) {
        await db.insert(mapFloors).values({
          mapId: m.id,
          name: floorNames[i]!,
          floorNumber: i + 1,
          imagePath: `/maps/${map.slug}-floor-${i + 1}.webp`,
        });
      }
    }
    console.log(`Created ${r6Maps.length} R6 maps`);

    // R6 Operators
    const r6Operators = [
      // Defenders
      { name: 'Clash', color: '#718190', isAttacker: false },
      { name: 'Maestro', color: '#666E24', isAttacker: false },
      { name: 'Alibi', color: '#666E24', isAttacker: false },
      { name: 'Vigil', color: '#FFFFFF', isAttacker: false },
      { name: 'Ela', color: '#539D9B', isAttacker: false },
      { name: 'Lesion', color: '#A94825', isAttacker: false },
      { name: 'Mira', color: '#521A7F', isAttacker: false },
      { name: 'Echo', color: '#984153', isAttacker: false },
      { name: 'Caveira', color: '#478B40', isAttacker: false },
      { name: 'Valkyrie', color: '#C39100', isAttacker: false },
      { name: 'Frost', color: '#00789D', isAttacker: false },
      { name: 'Mute', color: '#906E79', isAttacker: false },
      { name: 'Smoke', color: '#906E79', isAttacker: false },
      { name: 'Castle', color: '#D65B2B', isAttacker: false },
      { name: 'Pulse', color: '#D65B2B', isAttacker: false },
      { name: 'Doc', color: '#3A6082', isAttacker: false },
      { name: 'Rook', color: '#3A6082', isAttacker: false },
      { name: 'Jager', color: '#F8C334', isAttacker: false },
      { name: 'Bandit', color: '#F8C334', isAttacker: false },
      { name: 'Tachanka', color: '#AB1513', isAttacker: false },
      { name: 'Kapkan', color: '#AB1513', isAttacker: false },
      // Attackers
      { name: 'Maverick', color: '#718190', isAttacker: true },
      { name: 'Lion', color: '#FCAE1D', isAttacker: true },
      { name: 'Finka', color: '#FCAE1D', isAttacker: true },
      { name: 'Dokkaebi', color: '#FFFFFF', isAttacker: true },
      { name: 'Zofia', color: '#539D9B', isAttacker: true },
      { name: 'Ying', color: '#A94825', isAttacker: true },
      { name: 'Jackal', color: '#521A7F', isAttacker: true },
      { name: 'Hibana', color: '#984153', isAttacker: true },
      { name: 'Capitao', color: '#478B40', isAttacker: true },
      { name: 'Blackbeard', color: '#C39100', isAttacker: true },
      { name: 'Buck', color: '#00789D', isAttacker: true },
      { name: 'Sledge', color: '#906E79', isAttacker: true },
      { name: 'Thatcher', color: '#906E79', isAttacker: true },
      { name: 'Ash', color: '#D65B2B', isAttacker: true },
      { name: 'Thermite', color: '#D65B2B', isAttacker: true },
      { name: 'Montagne', color: '#3A6082', isAttacker: true },
      { name: 'Twitch', color: '#3A6082', isAttacker: true },
      { name: 'Blitz', color: '#F8C334', isAttacker: true },
      { name: 'IQ', color: '#F8C334', isAttacker: true },
      { name: 'Fuze', color: '#AB1513', isAttacker: true },
      { name: 'Glaz', color: '#AB1513', isAttacker: true },
    ];

    for (const op of r6Operators) {
      await db.insert(operators).values({
        gameId: r6Game.id,
        name: op.name,
        color: op.color,
        isAttacker: op.isAttacker,
      });
    }
    console.log(`Created ${r6Operators.length} R6 operators`);

    // R6 Gadgets
    const r6Gadgets = [
      // Unique gadgets
      { name: 'CCE Shield', category: 'unique' as const },
      { name: 'Evil Eye', category: 'unique' as const },
      { name: 'Prisma', category: 'unique' as const },
      { name: 'EE-ONE-D', category: 'unique' as const },
      { name: 'Adrenal Surge', category: 'unique' as const },
      { name: 'ERC-7', category: 'unique' as const },
      { name: 'Logic Bomb', category: 'unique' as const },
      { name: 'KS79 Lifeline', category: 'unique' as const },
      { name: 'Grzmot Mine', category: 'unique' as const },
      { name: 'Candela', category: 'unique' as const },
      { name: 'Gu Mine', category: 'unique' as const },
      { name: 'Black Mirror', category: 'unique' as const },
      { name: 'Eyenox', category: 'unique' as const },
      { name: 'X-Kairos', category: 'unique' as const },
      { name: 'Yokai', category: 'unique' as const },
      { name: 'Silent Step', category: 'unique' as const },
      { name: 'Micro Crossbow', category: 'unique' as const },
      { name: 'TAPS Mk III', category: 'unique' as const },
      { name: 'Skeleton Key', category: 'unique' as const },
      { name: 'Welcome Mat', category: 'unique' as const },
      { name: 'Signal Disruptor', category: 'unique' as const },
      { name: 'The Caber', category: 'unique' as const },
      { name: 'Z8 Grenades', category: 'unique' as const },
      { name: 'EMP Grenade', category: 'unique' as const },
      { name: 'Breaching Round', category: 'unique' as const },
      { name: 'Armor Panel', category: 'unique' as const },
      { name: 'Heartbeat Sensor', category: 'unique' as const },
      { name: 'Exothermic Charge', category: 'unique' as const },
      { name: 'Extendable Shield', category: 'unique' as const },
      { name: 'Shock Drone', category: 'unique' as const },
      { name: 'Stim Pistol', category: 'unique' as const },
      { name: 'Armor Pack', category: 'unique' as const },
      { name: 'ADS', category: 'unique' as const },
      { name: 'Shock Wire', category: 'unique' as const },
      { name: 'Flash Shield', category: 'unique' as const },
      { name: 'Electronics Detector', category: 'unique' as const },
      { name: 'Cluster Charge', category: 'unique' as const },
      { name: 'Flip Sight', category: 'unique' as const },
      { name: 'Mounted LMG', category: 'unique' as const },
      { name: 'EDD', category: 'unique' as const },
      { name: 'Smelting Torch', category: 'unique' as const },
      { name: 'Black Eye', category: 'unique' as const },
      // Secondary gadgets
      { name: 'Barbed Wire', category: 'secondary' as const },
      { name: 'Breaching Charge', category: 'secondary' as const },
      { name: 'Bulletproof Cam', category: 'secondary' as const },
      { name: 'Nitro Cell (C4)', category: 'secondary' as const },
      { name: 'Claymore', category: 'secondary' as const },
      { name: 'Deployable Shield', category: 'secondary' as const },
      { name: 'Frag Grenade', category: 'secondary' as const },
      { name: 'Impact Grenade', category: 'secondary' as const },
      { name: 'Smoke Grenade', category: 'secondary' as const },
      { name: 'Stun Grenade', category: 'secondary' as const },
      // General
      { name: 'Barricade', category: 'general' as const },
      { name: 'Drone', category: 'general' as const },
      { name: 'Objective', category: 'general' as const },
      { name: 'Rappel', category: 'general' as const },
      { name: 'Reinforcement', category: 'general' as const },
    ];

    for (const g of r6Gadgets) {
      await db.insert(gadgets).values({
        gameId: r6Game.id,
        name: g.name,
        category: g.category,
      });
    }
    console.log(`Created ${r6Gadgets.length} R6 gadgets`);
  }

  // 4. Seed Valorant
  const [valGame] = await db.insert(games).values({
    name: 'Valorant',
    slug: 'valorant',
    description: 'Riot Games\' Tactical Shooter',
    isActive: true,
  }).onConflictDoNothing().returning();

  if (valGame) {
    console.log('Seeding Valorant...');

    // Valorant Maps
    const valMaps = [
      { name: 'Ascent', slug: 'ascent' },
      { name: 'Bind', slug: 'bind' },
      { name: 'Haven', slug: 'haven' },
      { name: 'Split', slug: 'split' },
    ];

    for (const map of valMaps) {
      const [m] = await db.insert(maps).values({
        gameId: valGame.id,
        name: map.name,
        slug: map.slug,
        isCompetitive: true,
      }).returning();

      // 2 floors for Valorant maps
      await db.insert(mapFloors).values([
        { mapId: m.id, name: 'Main', floorNumber: 1, imagePath: `/maps/${map.slug}-floor-1.webp` },
        { mapId: m.id, name: 'Upper', floorNumber: 2, imagePath: `/maps/${map.slug}-floor-2.webp` },
      ]);
    }
    console.log(`Created ${valMaps.length} Valorant maps`);

    // Valorant Agents
    const valAgents = [
      { name: 'Brimstone', color: '#FF6B35' },
      { name: 'Phoenix', color: '#FE8644' },
      { name: 'Sage', color: '#5EDFC5' },
      { name: 'Sova', color: '#2C73D2' },
      { name: 'Viper', color: '#32965D' },
      { name: 'Cypher', color: '#A7A9BE' },
      { name: 'Reyna', color: '#B03CFF' },
      { name: 'Jett', color: '#87CEEB' },
      { name: 'Breach', color: '#D97D29' },
      { name: 'Omen', color: '#4454A4' },
      { name: 'Raze', color: '#D97D29' },
    ];

    for (const agent of valAgents) {
      await db.insert(operators).values({
        gameId: valGame.id,
        name: agent.name,
        color: agent.color,
        isAttacker: true,
      });
    }
    console.log(`Created ${valAgents.length} Valorant agents`);

    // Valorant Abilities (as gadgets)
    const valAbilities = [
      // Brimstone
      { name: 'Incendiary', category: 'unique' as const },
      { name: 'Stim Beacon', category: 'unique' as const },
      { name: 'Sky Smoke', category: 'unique' as const },
      { name: 'Orbital Strike', category: 'unique' as const },
      // Phoenix
      { name: 'Hot Hands', category: 'unique' as const },
      { name: 'Blaze', category: 'unique' as const },
      { name: 'Curveball', category: 'unique' as const },
      { name: 'Run it Back', category: 'unique' as const },
      // Sage
      { name: 'Slow Orb', category: 'unique' as const },
      { name: 'Healing Orb', category: 'unique' as const },
      { name: 'Barrier Orb', category: 'unique' as const },
      { name: 'Resurrection', category: 'unique' as const },
      // Sova
      { name: 'Shock Bolt', category: 'unique' as const },
      { name: 'Recon Bolt', category: 'unique' as const },
      { name: 'Owl Drone', category: 'unique' as const },
      { name: 'Hunter\'s Fury', category: 'unique' as const },
      // Viper
      { name: 'Poison Cloud', category: 'unique' as const },
      { name: 'Toxic Screen', category: 'unique' as const },
      { name: 'Snake Bite', category: 'unique' as const },
      { name: 'Viper\'s Pit', category: 'unique' as const },
      // Cypher
      { name: 'Trapwire', category: 'unique' as const },
      { name: 'Cyber Cage', category: 'unique' as const },
      { name: 'Spycam', category: 'unique' as const },
      { name: 'Neural Theft', category: 'unique' as const },
      // Reyna
      { name: 'Leer', category: 'unique' as const },
      { name: 'Devour', category: 'unique' as const },
      { name: 'Dismiss', category: 'unique' as const },
      { name: 'Empress', category: 'unique' as const },
      // Jett
      { name: 'Cloudburst', category: 'unique' as const },
      { name: 'Updraft', category: 'unique' as const },
      { name: 'Tailwind', category: 'unique' as const },
      { name: 'Blade Storm', category: 'unique' as const },
      // Breach
      { name: 'Aftershock', category: 'unique' as const },
      { name: 'Flashpoint', category: 'unique' as const },
      { name: 'Fault Line', category: 'unique' as const },
      { name: 'Rolling Thunder', category: 'unique' as const },
      // Omen
      { name: 'Paranoia', category: 'unique' as const },
      { name: 'Dark Cover', category: 'unique' as const },
      { name: 'Shrouded Step', category: 'unique' as const },
      { name: 'From the Shadows', category: 'unique' as const },
    ];

    for (const ability of valAbilities) {
      await db.insert(gadgets).values({
        gameId: valGame.id,
        name: ability.name,
        category: ability.category,
      });
    }
    console.log(`Created ${valAbilities.length} Valorant abilities`);
  }

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
