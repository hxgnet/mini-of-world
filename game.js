/* =========================================================
   微尘世界 · 像素神明沙盒
   画面元素全部来自 Kenney.nl 的 CC0 像素素材
   ========================================================= */

const TILE = 16;
const W = 180;
const H = 110;
const T_WATER = 0, T_SAND = 1, T_GRASS = 2, T_ROCK = 3;

const FACTIONS = [
  { key: 'blue',  name: '蓝曦', color: '#7aa2ff', villageNames: ['蓝泉村', '洱海湾', '青帆港', '霜溪寨', '潮声堡'] },
  { key: 'red',   name: '赤炎', color: '#f07866', villageNames: ['赤岩村', '火石岗', '丹霞寨', '熔沙堡', '红枫岭'] },
  { key: 'green', name: '青苔', color: '#7bcb84', villageNames: ['青苔村', '雾林寨', '苔石岗', '绿荫坞', '藤桥村'] },
  { key: 'gold',  name: '金穗', color: '#e9b95f', villageNames: ['金穗村', '麦浪坡', '黄沙驿', '铜铃寨', '日升堡'] }
];

const CIV_SPRITES = ['villager_m', 'villager_f', 'villager_y', 'woman_b', 'woman_o'];
const SOLDIER_SPRITES = ['knight1', 'knight2'];
const JOB_NAMES = { farmer: '农夫', builder: '工匠', soldier: '战士', king: '国王', idle: '平民' };

const MONSTER_DEFS = [
  { sprite: 'skeleton', hp: 34, dmg: 4.0, speed: 15, maxAge: 620 },
  { sprite: 'goblin',   hp: 28, dmg: 3.2, speed: 19, maxAge: 560 },
  { sprite: 'mummy',    hp: 46, dmg: 4.6, speed: 11, maxAge: 700 },
  { sprite: 'demon',    hp: 52, dmg: 6.0, speed: 16, maxAge: 640 },
  { sprite: 'slime',    hp: 22, dmg: 2.2, speed: 10, maxAge: 480 }
];

const BEAST_DEFS = [
  { sprite: 'bat',    hp: 16, dmg: 2.2, speed: 26, maxAge: 300 },
  { sprite: 'spider', hp: 20, dmg: 2.8, speed: 22, maxAge: 340 },
  { sprite: 'ghost',  hp: 24, dmg: 3.0, speed: 17, maxAge: 400 }
];

const SPRITE_NAMES = {
  villager_m: '村民', villager_f: '村民', villager_y: '少年', woman_b: '村民', woman_o: '村民',
  knight1: '战士', knight2: '战士',
  skeleton: '骷髅', goblin: '哥布林', mummy: '木乃伊', demon: '恶魔', slime: '史莱姆',
  bat: '蝙蝠', spider: '蜘蛛', ghost: '幽灵', zombie: '僵尸'
};

/* ---------------- assets ---------------- */

const ASSETS = new Set();
function addAsset(p) { ASSETS.add(p); }

[
  'terrain/water.png', 'terrain/sand.png', 'terrain/grass.png', 'terrain/grass2.png',
  'terrain/stone.png', 'terrain/stone2.png',
  'terrain/edge_n.png', 'terrain/edge_s.png', 'terrain/edge_w.png', 'terrain/edge_e.png',
  'terrain/edge_nw.png', 'terrain/edge_ne.png', 'terrain/edge_sw.png', 'terrain/edge_se.png',
  'nature/tree.png', 'nature/tree2.png', 'nature/tree3.png', 'nature/tree4.png',
  'nature/bush.png', 'nature/bush2.png', 'nature/deadtree.png', 'nature/cactus.png',
  'units/skull.png', 'units/sword.png', 'units/zombie.png',
  'buildings/house_a.png', 'buildings/house_b.png',
  'effects/fx/flame_01.png', 'effects/fx/flame_02.png', 'effects/fx/flame_03.png',
  'effects/fx/flame_04.png', 'effects/fx/flame_05.png', 'effects/fx/flame_06.png',
  'effects/fx/fire_01.png', 'effects/fx/smoke_01.png', 'effects/fx/smoke_05.png',
  'effects/fx/magic_01.png', 'effects/fx/magic_03.png', 'effects/fx/magic_05.png',
  'effects/fx/light_01.png', 'effects/fx/dirt_01.png', 'effects/fx/scorch_01.png',
  'effects/fx/scorch_dark.png', 'effects/fx/slash_01.png', 'effects/fx/circle_02.png',
  'effects/icons/ring.png', 'effects/icons/fire_aura.png', 'effects/icons/poison_aura.png',
  'effects/icons/spark.png', 'effects/icons/heal.png', 'effects/icons/meteor.png',
  'effects/icons/bolt.png', 'effects/icons/fire.png',
  'icons/target.png', 'icons/star.png', 'icons/warning.png', 'icons/trashcan.png',
  'icons/checkmark.png', 'icons/power.png'
].forEach(addAsset);

for (const f of FACTIONS) {
  addAsset(`buildings/faction_${f.key}_a.png`);
  addAsset(`buildings/faction_${f.key}_b.png`);
  for (const s of [...CIV_SPRITES, ...SOLDIER_SPRITES]) addAsset(`units/faction/${f.key}/${s}.png`);
}
for (const d of [...MONSTER_DEFS, ...BEAST_DEFS]) addAsset(`units/${d.sprite}.png`);

const IMG = {};
const FALLBACK = document.createElement('canvas');
FALLBACK.width = 1;
FALLBACK.height = 1;

function loadAssets() {
  const list = [...ASSETS];
  return Promise.all(list.map(p => new Promise(resolve => {
    const im = new Image();
    im.onload = () => { IMG[p] = im; resolve(); };
    im.onerror = () => { console.warn('素材缺失:', p); resolve(); };
    im.src = 'assets/' + p;
  })));
}

const img = p => IMG[p] || FALLBACK;

/* ---------------- world state ---------------- */

let world = null;
let terrainCanvas = null;
let terrainCtx = null;

const cam = { x: 0, y: 0, zoom: 1.35 };
const state = {
  cat: 'terrain',
  tool: 'land',
  brush: 2,
  speed: 1,
  lastSpeed: 1,
  mouse: { sx: 0, sy: 0, wx: 0, wy: 0, inside: false },
  painting: false,
  panning: false,
  pan: null,
  lastPaint: null,
  hoverUnit: null,
  hoverVillage: null,
  selectedUnit: null,
  selectedVillage: null,
  lastSpawnAt: 0,
  lastFxAt: 0,
  shake: 0,
  flash: 0,
  lastMinimap: 0
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const pairKey = (a, b) => a < b ? a + '-' + b : b + '-' + a;

/* ---------------- terrain helpers ---------------- */

function tileIdx(tx, ty) { return ty * W + tx; }

function getTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return T_WATER;
  return world.terrain[tileIdx(tx, ty)];
}

function isLand(tx, ty) {
  const t = getTile(tx, ty);
  return t === T_SAND || t === T_GRASS;
}

function isWalkable(tx, ty) { return isLand(tx, ty); }

function walkablePx(px, py) {
  return isWalkable(Math.floor(px / TILE), Math.floor(py / TILE));
}

/* ---------------- generation ---------------- */

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1013904223);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function noise2(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x, y, seed, octaves) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * freq, y * freq, seed + i * 131) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function generateTerrain(seed) {
  const cx = W / 2, cy = H / 2;
  const elev = new Float32Array(W * H);
  const mtn = new Float32Array(W * H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / (W * 0.5);
      const ny = (y - cy) / (H * 0.5);
      const d = Math.sqrt(nx * nx * 0.82 + ny * ny * 1.02);
      const fall = 1 - Math.pow(Math.min(1, d), 2.35);
      const base = fbm(x * 0.035, y * 0.035, seed, 5);
      const i = tileIdx(x, y);
      elev[i] = base * 0.55 + fall * 0.55 - 0.12;
      mtn[i] = fbm(x * 0.07 + 91, y * 0.07 + 37, seed + 41, 4);
    }
  }

  const sorted = Array.from(elev).sort((a, b) => a - b);
  const q = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const seaLevel = q(0.46);
  const beachLine = q(0.498);
  const midLine = q(0.62);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = tileIdx(x, y);
      const e = elev[i];
      let t;
      if (e < seaLevel) t = T_WATER;
      else if (e < beachLine) t = T_SAND;
      else if (e > midLine && mtn[i] > 0.66) t = T_ROCK;
      else t = T_GRASS;

      world.terrain[i] = t;
      const moist = fbm(x * 0.055 + 31, y * 0.055 + 17, seed + 9, 4);
      if (t === T_GRASS && moist < 0.31) {
        world.terrain[i] = T_SAND;
        world.variant[i] = 0;
      } else {
        world.variant[i] = (t === T_GRASS && moist > 0.53) ? 1 : 0;
      }
    }
  }
}

function addTree(tx, ty, type) {
  const key = tx + ',' + ty;
  if (world.trees.has(key)) return;
  const paths = {
    tree: 'nature/tree.png',
    tree2: 'nature/tree2.png',
    tree3: 'nature/tree3.png',
    tree4: 'nature/tree4.png',
    bush: 'nature/bush.png',
    bush2: 'nature/bush2.png',
    dead: 'nature/deadtree.png',
    cactus: 'nature/cactus.png'
  };
  world.trees.set(key, { x: tx, y: ty, img: paths[type], burning: false, burnT: 0, hp: 18 });
}

function scatterNature() {
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = tileIdx(x, y);
      const t = world.terrain[i];
      if (t === T_GRASS) {
        const pickTree = () => {
          const v = Math.random();
          return v < 0.52 ? 'tree' : v < 0.72 ? 'tree2' : v < 0.9 ? 'tree3' : 'tree4';
        };
        if (world.variant[i] === 1) {
          if (Math.random() < 0.27) addTree(x, y, Math.random() < 0.86 ? pickTree() : (Math.random() < 0.5 ? 'bush' : 'bush2'));
        } else if (Math.random() < 0.017) {
          addTree(x, y, pickTree());
        } else if (Math.random() < 0.018) {
          addTree(x, y, Math.random() < 0.5 ? 'bush' : 'bush2');
        }
      } else if (t === T_SAND && Math.random() < 0.02) {
        addTree(x, y, 'cactus');
      }
    }
  }
}

/* ---------------- drawing terrain ---------------- */

function drawGroundTile(tx, ty) {
  const t = getTile(tx, ty);
  let imgPath;
  if (t === T_WATER) imgPath = 'terrain/water.png';
  else if (t === T_SAND) imgPath = 'terrain/sand.png';
  else if (t === T_ROCK) {
    const h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
    imgPath = (h % 100 < 45) ? 'terrain/stone2.png' : 'terrain/stone.png';
  }
  else imgPath = world.variant[tileIdx(tx, ty)] ? 'terrain/grass2.png' : 'terrain/grass.png';

  terrainCtx.drawImage(img(imgPath), tx * TILE, ty * TILE);

  if (t === T_WATER) {
    const N = getTile(tx, ty - 1) !== T_WATER;
    const S = getTile(tx, ty + 1) !== T_WATER;
    const Wl = getTile(tx - 1, ty) !== T_WATER;
    const E = getTile(tx + 1, ty) !== T_WATER;
    let edge = null;
    if (N && Wl) edge = 'edge_nw';
    else if (N && E) edge = 'edge_ne';
    else if (S && Wl) edge = 'edge_sw';
    else if (S && E) edge = 'edge_se';
    else if (N) edge = 'edge_n';
    else if (S) edge = 'edge_s';
    else if (Wl) edge = 'edge_w';
    else if (E) edge = 'edge_e';
    if (edge) terrainCtx.drawImage(img('terrain/' + edge + '.png'), tx * TILE, ty * TILE);
  }
}

function renderTerrainAll() {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) drawGroundTile(x, y);
  }
}

function redrawRegion(x0, y0, x1, y1) {
  const ax = clamp(x0 - 1, 0, W - 1), ay = clamp(y0 - 1, 0, H - 1);
  const bx = clamp(x1 + 1, 0, W - 1), by = clamp(y1 + 1, 0, H - 1);
  for (let y = ay; y <= by; y++) {
    for (let x = ax; x <= bx; x++) drawGroundTile(x, y);
  }
}

/* ---------------- units ---------------- */

function factionSpritePath(faction, sprite) {
  return `units/faction/${FACTIONS[faction].key}/${sprite}.png`;
}

function makeUnit(opts) {
  const u = {
    id: world.nextId++,
    kind: 'villager',
    faction: null,
    sprite: 'villager_m',
    imgPath: '',
    img: null,
    job: 'idle',
    x: 0, y: 0,
    hp: 24,
    maxHp: 24,
    speed: 16,
    dmg: 3,
    atkCd: 0,
    thinkCd: Math.random() * 0.4,
    age: 0,
    maxAge: 600,
    target: null,
    txPx: 0, tyPx: 0,
    hasTarget: false,
    face: 1,
    homeVillage: null,
    burning: false,
    infected: false,
    infectedT: 0,
    phase: Math.random() * Math.PI * 2,
    dead: false,
    moving: false,
    king: false,
    workCd: 0
  };
  Object.assign(u, opts);
  if (opts.maxHp !== undefined) u.maxHp = opts.maxHp;
  else u.maxHp = opts.hp !== undefined ? opts.hp : u.hp;

  if (!u.imgPath) {
    if (u.faction !== null && (u.kind === 'villager' || u.kind === 'soldier' || u.kind === 'king')) {
      u.imgPath = factionSpritePath(u.faction, u.sprite);
    } else {
      u.imgPath = `units/${u.sprite}.png`;
    }
  }
  u.img = img(u.imgPath);
  world.units.push(u);
  return u;
}

function spawnVillager(village, opts = {}) {
  const pos = findOpenSpot(village.tx, village.ty, 1, 4) || { tx: village.tx, ty: village.ty };
  const r = Math.random();
  const job = opts.job || (r < 0.5 ? 'farmer' : r < 0.72 ? 'builder' : 'idle');
  return makeUnit({
    kind: 'villager',
    faction: village.faction,
    sprite: pick(CIV_SPRITES),
    job,
    x: pos.tx * TILE + 8 + rand(-2, 2),
    y: pos.ty * TILE + 12 + rand(-2, 2),
    hp: 26,
    speed: rand(14, 19),
    dmg: 2.4,
    maxAge: rand(420, 700),
    age: opts.age !== undefined ? opts.age : rand(0, 150),
    homeVillage: village.id
  });
}

function spawnSoldier(village) {
  const pos = findOpenSpot(village.tx, village.ty, 1, 4) || { tx: village.tx, ty: village.ty };
  return makeUnit({
    kind: 'soldier',
    faction: village.faction,
    sprite: pick(SOLDIER_SPRITES),
    job: 'soldier',
    x: pos.tx * TILE + 8,
    y: pos.ty * TILE + 12,
    hp: 58,
    speed: rand(17, 21),
    dmg: 7,
    maxAge: rand(500, 750),
    age: rand(60, 200),
    homeVillage: village.id
  });
}

function spawnKing(village) {
  const k = world.kingdoms[village.faction];
  const u = makeUnit({
    kind: 'king',
    faction: village.faction,
    sprite: 'knight1',
    job: 'king',
    king: true,
    x: village.tx * TILE + 8,
    y: village.ty * TILE + 12,
    hp: 190,
    speed: 15,
    dmg: 11,
    maxAge: 99999,
    age: 30,
    homeVillage: village.id
  });
  u.img = img(factionSpritePath(village.faction, 'knight1'));
  k.king = u.id;
  return u;
}

function spawnHuman(tx, ty) {
  return makeUnit({
    kind: 'villager',
    faction: null,
    sprite: pick(CIV_SPRITES),
    job: 'idle',
    x: tx * TILE + 8 + rand(-6, 6),
    y: ty * TILE + 12 + rand(-6, 6),
    hp: 26,
    speed: rand(14, 19),
    dmg: 2.4,
    maxAge: rand(420, 700),
    age: rand(0, 120)
  });
}

function spawnMonster(tx, ty) {
  const def = pick(MONSTER_DEFS);
  return makeUnit({
    kind: 'monster',
    faction: null,
    sprite: def.sprite,
    x: tx * TILE + 8 + rand(-8, 8),
    y: ty * TILE + 12 + rand(-8, 8),
    hp: def.hp,
    speed: def.speed,
    dmg: def.dmg,
    maxAge: def.maxAge,
    age: rand(0, 200)
  });
}

function spawnBeast(tx, ty) {
  const def = pick(BEAST_DEFS);
  return makeUnit({
    kind: 'beast',
    faction: null,
    sprite: def.sprite,
    x: tx * TILE + 8 + rand(-8, 8),
    y: ty * TILE + 12 + rand(-8, 8),
    hp: def.hp,
    speed: def.speed,
    dmg: def.dmg,
    maxAge: def.maxAge,
    age: rand(0, 200)
  });
}

function spawnZombie(tx, ty) {
  return makeUnit({
    kind: 'monster',
    faction: null,
    sprite: 'zombie',
    x: tx * TILE + 8 + rand(-6, 6),
    y: ty * TILE + 12 + rand(-6, 6),
    hp: 40,
    speed: rand(10, 14),
    dmg: 5,
    maxAge: rand(400, 600),
    age: 40
  });
}

/* ---------------- villages & houses ---------------- */

function findOpenSpot(cx, cy, minR, maxR) {
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = rand(minR, maxR);
    const tx = Math.round(cx + Math.cos(a) * r);
    const ty = Math.round(cy + Math.sin(a) * r);
    if (isLand(tx, ty) && isLand(tx + 1, ty) && isLand(tx, ty + 1) && isLand(tx + 1, ty + 1) && !houseNear(tx, ty, 2.2)) {
      return { tx, ty };
    }
  }
  return null;
}

function houseNear(tx, ty, radius) {
  for (const h of world.houses) {
    if (Math.hypot(h.tx - tx, h.ty - ty) < radius) return true;
  }
  return false;
}

function addHouse(village, tx, ty) {
  const f = FACTIONS[village.faction];
  const type = Math.random() < 0.5 ? 'a' : 'b';
  const h = {
    tx, ty,
    imgPath: `buildings/faction_${f.key}_${type}.png`,
    img: img(`buildings/faction_${f.key}_${type}.png`),
    villageId: village.id,
    hp: 130,
    burning: false,
    burnT: 0
  };
  world.houses.push(h);
  village.houses.push(h);
  return h;
}

function removeHouse(h) {
  world.houses = world.houses.filter(x => x !== h);
  const v = world.villages.find(vv => vv.id === h.villageId);
  if (v) v.houses = v.houses.filter(x => x !== h);
}

function houseAt(tx, ty) {
  for (const h of world.houses) {
    if (tx >= h.tx && tx <= h.tx + 1 && ty >= h.ty && ty <= h.ty + 1) return h;
  }
  return null;
}

function nearestVillage(px, py, maxDist) {
  let best = null, bd = maxDist * maxDist;
  for (const v of world.villages) {
    const d = dist2(px, py, v.tx * TILE + 8, v.ty * TILE + 8);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

function canPlaceVillage(tx, ty) {
  if (!isLand(tx, ty)) return false;
  let land = 0, total = 0;
  for (let y = ty - 3; y <= ty + 3; y++) {
    for (let x = tx - 3; x <= tx + 3; x++) {
      total++;
      if (isLand(x, y)) land++;
    }
  }
  if (land / total < 0.62) return false;
  for (const v of world.villages) {
    if (dist2(tx, ty, v.tx, v.ty) < 9 * 9) return false;
  }
  return true;
}

function placeVillage(tx, ty, factionId, silent = false) {
  if (factionId === undefined || factionId === null) {
    const counts = FACTIONS.map((_, i) => world.villages.filter(v => v.faction === i).length);
    let best = 0;
    for (let i = 1; i < counts.length; i++) if (counts[i] < counts[best]) best = i;
    factionId = best;
  }
  const f = FACTIONS[factionId];
  const nameIndex = world.nameCount[f.key] || 0;
  world.nameCount[f.key] = nameIndex + 1;
  const name = f.villageNames[nameIndex % f.villageNames.length];

  const v = {
    id: world.nextId++,
    faction: factionId,
    name,
    tx, ty,
    radius: 7,
    houses: [],
    food: 32,
    wood: 16,
    stone: 4,
    pop: 0,
    happiness: 70,
    capital: false,
    spawnCd: rand(4, 9),
    buildCd: rand(5, 10),
    soldierCd: rand(6, 12),
    kingCd: 0,
    bornYear: world.year
  };
  world.villages.push(v);

  const k = world.kingdoms[factionId];
  if (!k.capital) {
    k.capital = v.id;
    v.capital = true;
  }
  k.villages.push(v.id);

  for (let i = 0; i < 4; i++) spawnVillager(v);
  const spot = findOpenSpot(tx, ty, 0, 2) || { tx, ty };
  addHouse(v, spot.tx, spot.ty);
  if (v.capital) spawnKing(v);

  if (!silent) {
    log(`${f.name}建立了${name}。`, 'build');
    toast(`${name} 建立了`);
  }
  return v;
}

function removeVillage(v) {
  world.villages = world.villages.filter(x => x !== v);
  const k = world.kingdoms[v.faction];
  k.villages = k.villages.filter(id => id !== v.id);
  if (k.capital === v.id) k.capital = k.villages[0] !== undefined ? k.villages[0] : null;
  if (state.selectedVillage === v) state.selectedVillage = null;
}

/* ---------------- kingdoms & diplomacy ---------------- */

function kingdomOf(faction) { return world.kingdoms[faction]; }

function activeKingdomIds() {
  return world.kingdoms.filter(k => k.villages.length > 0).map(k => k.id);
}

function atWar(a, b) {
  return world.wars.has(pairKey(a, b));
}

function allied(a, b) {
  return world.allies.has(pairKey(a, b));
}

function relation(a, b) {
  return world.rels[a][b];
}

function setRelation(a, b, v) {
  const nv = clamp(Math.round(v), -100, 100);
  world.rels[a][b] = nv;
  world.rels[b][a] = nv;
}

function declareWar(a, b, quiet = false) {
  if (a === b || a === null || b === null) return false;
  if (atWar(a, b)) return false;
  if (allied(a, b)) {
    world.allies.delete(pairKey(a, b));
  }
  world.wars.add(pairKey(a, b));
  world.warTimers[pairKey(a, b)] = rand(80, 150);
  setRelation(a, b, -85);
  log(`${FACTIONS[a].name}向${FACTIONS[b].name}宣战。`, 'war');
  if (!quiet) { toast(`${FACTIONS[a].name} 对 ${FACTIONS[b].name} 宣战`); shake(7); }
  for (const v of world.villages) {
    if (v.faction === a || v.faction === b) {
      spawnSoldier(v);
      if (Math.random() < 0.4) spawnSoldier(v);
    }
  }
  return true;
}

function makePeace(a, b, quiet = false) {
  const key = pairKey(a, b);
  if (!world.wars.has(key)) return false;
  world.wars.delete(key);
  delete world.warTimers[key];
  setRelation(a, b, -30);
  log(`${FACTIONS[a].name}与${FACTIONS[b].name}停战。`, 'diplo');
  if (!quiet) toast('双方停战');
  return true;
}

function formAlliance(a, b, quiet = false) {
  if (a === b || atWar(a, b) || allied(a, b)) return false;
  if (relation(a, b) < 35) {
    if (!quiet) toast('关系太冷淡，无法结盟');
    return false;
  }
  world.allies.add(pairKey(a, b));
  setRelation(a, b, 80);
  log(`${FACTIONS[a].name}与${FACTIONS[b].name}缔结同盟。`, 'diplo');
  if (!quiet) toast('同盟达成');
  return true;
}

function giftRelation(a, b, amount) {
  setRelation(a, b, relation(a, b) + amount);
}

/* ---------------- effects ---------------- */

function addEffect(path, x, y, size, life, opts = {}) {
  if (world.effects.length > 320) world.effects.shift();
  world.effects.push({
    img: img(path), x, y, size,
    life, maxLife: life,
    rot: opts.rot || 0,
    vr: opts.vr || 0,
    vy: opts.vy || 0,
    vx: opts.vx || 0
  });
}

function addDecal(path, px, py, size, life) {
  if (world.decals.length > 240) world.decals.shift();
  world.decals.push({ img: img(path), x: px, y: py, size, life, maxLife: life });
}

function addCorpse(u) {
  addDecal('units/skull.png', u.x, u.y - 4, 14, 26);
  if (Math.random() < 0.5) addEffect('effects/fx/dirt_01.png', u.x, u.y - 4, 26, 0.5, { vy: -6 });
}

function flash(strength = 0.6) {
  const el = document.getElementById('flash');
  el.style.transition = 'none';
  el.style.opacity = String(strength);
  requestAnimationFrame(() => {
    el.style.transition = 'opacity .45s ease-out';
    el.style.opacity = '0';
  });
}

function shake(amount) { state.shake = Math.max(state.shake, amount); }

/* ---------------- fire ---------------- */

function igniteTile(tx, ty) {
  const key = tx + ',' + ty;
  const tree = world.trees.get(key);
  if (tree && !tree.burning) { tree.burning = true; tree.burnT = rand(5, 9); }

  const h = houseAt(tx, ty);
  if (h && !h.burning) { h.burning = true; h.burnT = rand(6, 11); }

  let exists = false;
  for (const f of world.fires) {
    if (f.tx === tx && f.ty === ty) { exists = true; break; }
  }
  if (!exists && world.fires.length < 150) {
    world.fires.push({ tx, ty, life: rand(6, 12), spreadCd: rand(0.5, 1.2) });
  }

  for (const u of world.units) {
    if (!u.dead && dist2(u.x, u.y, tx * TILE + 8, ty * TILE + 8) < 15 * 15) u.burning = true;
  }
}

function fireSpreadTick(dt) {
  for (let i = world.fires.length - 1; i >= 0; i--) {
    const f = world.fires[i];
    f.life -= dt;
    f.spreadCd -= dt;

    if (Math.random() < dt * 1.6) {
      addEffect(pick(['effects/fx/flame_01.png', 'effects/fx/flame_02.png', 'effects/fx/flame_03.png']),
        f.tx * TILE + 8 + rand(-5, 5), f.ty * TILE + 10 + rand(-4, 2), rand(18, 30), rand(0.35, 0.75), { vy: -14 });
    }

    for (const u of world.units) {
      if (!u.dead && u.burning && dist2(u.x, u.y, f.tx * TILE + 8, f.ty * TILE + 8) < 12 * 12) u.hp -= dt * 1.4;
    }

    if (f.spreadCd <= 0 && world.fires.length < 150) {
      f.spreadCd = rand(1.2, 2.6);
      const nx = f.tx + ((Math.random() * 3) | 0) - 1;
      const ny = f.ty + ((Math.random() * 3) | 0) - 1;
      const tree = world.trees.get(nx + ',' + ny);
      const house = houseAt(nx, ny);
      if ((tree || house) && Math.random() < 0.55) igniteTile(nx, ny);
    }

    if (f.life <= 0) {
      addDecal('effects/fx/scorch_dark.png', f.tx * TILE + 8, f.ty * TILE + 8, 20, 55);
      world.fires.splice(i, 1);
    }
  }

  for (const tree of world.trees.values()) {
    if (!tree.burning) continue;
    tree.burnT -= dt;
    if (Math.random() < dt * 4) {
      addEffect(pick(['effects/fx/flame_02.png', 'effects/fx/flame_04.png', 'effects/fx/flame_05.png']),
        tree.x * TILE + 8 + rand(-4, 4), tree.y * TILE + 8, rand(18, 28), rand(0.4, 0.8), { vy: -16 });
    }
    if (tree.burnT <= 0) {
      world.trees.delete(tree.x + ',' + tree.y);
      addDecal('effects/fx/scorch_dark.png', tree.x * TILE + 8, tree.y * TILE + 8, 18, 50);
    }
  }

  for (const h of [...world.houses]) {
    if (!h.burning) continue;
    h.burnT -= dt;
    h.hp -= dt * 6;
    if (Math.random() < dt * 5) {
      addEffect(pick(['effects/fx/flame_03.png', 'effects/fx/flame_06.png']),
        h.tx * TILE + 8 + rand(-8, 8), h.ty * TILE + rand(-4, 8), rand(20, 34), rand(0.4, 0.9), { vy: -18 });
    }
    if (h.burnT <= 0 || h.hp <= 0) {
      addDecal('effects/fx/scorch_dark.png', h.tx * TILE + 8, h.ty * TILE + 8, 34, 60);
      const v = world.villages.find(vv => vv.id === h.villageId);
      removeHouse(h);
      if (v) log(`${v.name}的一间房屋被大火烧毁。`, 'war');
    }
  }
}

/* ---------------- simulation ---------------- */

function simTick(dt) {
  if (!world) return;
  world.time += dt;

  const year = Math.floor(world.time / 20) + 1;
  if (year !== world.year) {
    world.year = year;
    yearlyEvent();
  }

  updateUnits(dt);
  updateVillages(dt);
  diplomacyTick(dt);
  updateTornado(dt);
  updateVolcanoes(dt);
  fireSpreadTick(dt);
  updateEffects(dt);
  updateDecals(dt);
}

function updateUnits(dt) {
  const units = world.units;

  for (const u of units) {
    if (u.dead) continue;
    u.age += dt;
    if (u.workCd > 0) u.workCd -= dt;

    if (u.burning) {
      u.hp -= dt * 3.4;
      if (Math.random() < dt * 6) {
        addEffect('effects/fx/flame_02.png', u.x + rand(-5, 5), u.y - rand(2, 10), rand(14, 22), rand(0.3, 0.6), { vy: -18 });
      }
      if (Math.random() < dt * 0.9) {
        const tx = Math.floor(u.x / TILE), ty = Math.floor(u.y / TILE);
        if (Math.random() < 0.4) igniteTile(tx, ty);
      }
    }

    if (u.infected) {
      u.hp -= dt * 1.15;
      u.infectedT -= dt;
      if (Math.random() < dt * 0.45) {
        addEffect('effects/fx/magic_03.png', u.x + rand(-6, 6), u.y - rand(0, 12), rand(10, 18), 0.6, { vy: -12 });
      }
      if (Math.random() < dt * 0.5) {
        for (const o of units) {
          if (o === u || o.dead || o.kind === 'monster' || o.kind === 'beast') continue;
          if (!o.infected && dist2(u.x, u.y, o.x, o.y) < 18 * 18) { o.infected = true; o.infectedT = rand(14, 26); break; }
        }
      }
      if (u.infectedT <= 0) u.infected = false;
    }

    if (u.hp <= 0 || u.age > u.maxAge) {
      u.dead = true;
      addCorpse(u);
      if (u.king) {
        const k = world.kingdoms[u.faction];
        k.king = null;
        const cap = world.villages.find(v => v.faction === u.faction && v.capital);
        if (cap) cap.kingCd = rand(10, 18);
        log(`${FACTIONS[u.faction].name}的国王战死，王位空悬。`, 'war');
      }
      if (u.infected && u.faction !== null && Math.random() < 0.6) {
        spawnZombie(Math.floor(u.x / TILE), Math.floor(u.y / TILE));
      }
      continue;
    }

    if (u.atkCd > 0) u.atkCd -= dt;

    u.thinkCd -= dt;
    if (u.thinkCd <= 0) {
      u.thinkCd = rand(0.35, 0.65);
      think(u);
    }

    moveUnit(u, dt);
  }

  if (units.some(u => u.dead)) {
    world.units = units.filter(u => !u.dead);
    if (state.selectedUnit && state.selectedUnit.dead) state.selectedUnit = null;
  }
}

function isEnemy(a, b) {
  if (a.dead || b.dead) return false;
  const aMon = a.kind === 'monster', bMon = b.kind === 'monster';
  const aBeast = a.kind === 'beast', bBeast = b.kind === 'beast';
  if (aMon && !bMon) return true;
  if (bMon && !aMon) return true;
  if (aBeast && !bBeast && !bMon) return true;
  if (bBeast && !aBeast && !aMon) return true;
  if (a.faction !== null && b.faction !== null && a.faction !== b.faction && atWar(a.faction, b.faction)) return true;
  return false;
}

function findEnemy(u, range) {
  let best = null, bd = range * range;
  for (const o of world.units) {
    if (o === u || o.dead) continue;
    if (!isEnemy(u, o)) continue;
    const d = dist2(u.x, u.y, o.x, o.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

function wander(u, centerX, centerY, radius) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = rand(16, radius);
    const tx = centerX + Math.cos(a) * rr;
    const ty = centerY + Math.sin(a) * rr;
    if (walkablePx(tx, ty)) {
      u.txPx = tx;
      u.tyPx = ty;
      u.hasTarget = true;
      return;
    }
  }
}

function think(u) {
  if (u.faction === null && u.kind === 'villager') {
    const v = nearestVillage(u.x, u.y, 90);
    if (v) {
      u.faction = v.faction;
      u.homeVillage = v.id;
      u.job = Math.random() < 0.6 ? 'farmer' : 'idle';
      u.imgPath = factionSpritePath(u.faction, u.sprite);
      u.img = img(u.imgPath);
      if (Math.random() < 0.25) log(`${v.name}收留了一名流浪者。`, 'build');
      return;
    }
  }

  const home = u.homeVillage ? world.villages.find(v => v.id === u.homeVillage) : null;

  if (u.kind === 'monster' || u.kind === 'beast') {
    const enemy = findEnemy(u, 170);
    if (enemy) {
      u.target = enemy;
      u.hasTarget = true;
      u.txPx = enemy.x;
      u.tyPx = enemy.y;
      if (dist2(u.x, u.y, enemy.x, enemy.y) < 12 * 12 && u.atkCd <= 0) attack(u, enemy);
      return;
    }
    u.target = null;
    if (!u.hasTarget || dist2(u.x, u.y, u.txPx, u.tyPx) < 6 * 6) wander(u, u.x, u.y, 70);
    return;
  }

  const wars = [...world.wars].filter(k => k.split('-').map(Number).includes(u.faction));
  const atWarNow = wars.length > 0;

  if (u.job === 'king') {
    const enemy = findEnemy(u, 140);
    if (enemy && atWarNow) {
      u.target = enemy;
      u.hasTarget = true;
      u.txPx = enemy.x;
      u.tyPx = enemy.y;
      if (dist2(u.x, u.y, enemy.x, enemy.y) < 12 * 12 && u.atkCd <= 0) attack(u, enemy);
      return;
    }
    u.target = null;
    if (!u.hasTarget || dist2(u.x, u.y, u.txPx, u.tyPx) < 8 * 8) {
      if (home) wander(u, home.tx * TILE + 8, home.ty * TILE + 12, 4 * TILE);
    }
    return;
  }

  if (u.kind === 'soldier') {
    const enemy = findEnemy(u, atWarNow ? 260 : 90);
    if (enemy) {
      u.target = enemy;
      u.hasTarget = true;
      u.txPx = enemy.x;
      u.tyPx = enemy.y;
      if (dist2(u.x, u.y, enemy.x, enemy.y) < 12 * 12 && u.atkCd <= 0) attack(u, enemy);
      return;
    }
    u.target = null;
    if (atWarNow) {
      const enemyV = world.villages
        .filter(v => v.faction !== u.faction && atWar(u.faction, v.faction))
        .sort((a, b) => dist2(u.x, u.y, a.tx * TILE, a.ty * TILE) - dist2(u.x, u.y, b.tx * TILE, b.ty * TILE))[0];
      if (enemyV) {
        const h = world.houses.find(hh => hh.villageId === enemyV.id);
        if (h && dist2(u.x, u.y, h.tx * TILE + 8, h.ty * TILE + 8) < 20 * 20) {
          if (u.atkCd <= 0) attackHouse(u, h);
          u.hasTarget = false;
          return;
        }
        u.hasTarget = true;
        u.txPx = h ? h.tx * TILE + 8 : enemyV.tx * TILE + 8;
        u.tyPx = h ? h.ty * TILE + 12 : enemyV.ty * TILE + 12;
        return;
      }
    }
    if (!u.hasTarget || dist2(u.x, u.y, u.txPx, u.tyPx) < 6 * 6) {
      if (home) wander(u, home.tx * TILE + 8, home.ty * TILE + 12, home.radius * TILE);
    }
    return;
  }

  // 村民劳作
  if (home) {
    if (!u.hasTarget || dist2(u.x, u.y, u.txPx, u.tyPx) < 7 * 7) {
      wander(u, home.tx * TILE + 8, home.ty * TILE + 12, home.radius * TILE);
    }
    if (dist2(u.x, u.y, home.tx * TILE + 8, home.ty * TILE + 12) < (home.radius + 2) * TILE * (home.radius + 2) * TILE) {
      if (u.workCd <= 0) {
        if (u.job === 'farmer') {
          home.food = Math.min(120, home.food + 0.85);
          u.workCd = 2.2;
          addEffect('effects/icons/spark.png', u.x + rand(-5, 5), u.y - 8, 14, 0.4, { vy: -12 });
        } else if (u.job === 'builder') {
          home.wood = Math.min(90, home.wood + 0.45);
          u.workCd = 2.2;
          addEffect('effects/fx/dirt_01.png', u.x + rand(-5, 5), u.y - 4, 14, 0.35, { vy: -8 });
        } else if (u.job === 'idle') {
          home.food = Math.min(120, home.food + 0.1);
          u.workCd = 3.2;
        }
      }
    }
    return;
  }

  if (!u.hasTarget || dist2(u.x, u.y, u.txPx, u.tyPx) < 8 * 8) wander(u, u.x, u.y, 80);
}

function attack(u, enemy) {
  u.atkCd = u.kind === 'soldier' || u.kind === 'king' ? 0.85 : 1.05;
  const dmg = u.dmg * rand(0.75, 1.25);
  enemy.hp -= dmg;
  addEffect('effects/fx/slash_01.png', enemy.x, enemy.y - 6, 20, 0.22, { rot: rand(-0.5, 0.5) });
  if (u.kind === 'monster' && u.sprite === 'zombie' && enemy.faction !== null && !enemy.infected && Math.random() < 0.22) {
    enemy.infected = true;
    enemy.infectedT = rand(10, 18);
  }
  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    addCorpse(enemy);
    if (enemy.king) {
      const k = world.kingdoms[enemy.faction];
      k.king = null;
      const cap = world.villages.find(v => v.faction === enemy.faction && v.capital);
      if (cap) cap.kingCd = rand(10, 18);
      log(`${FACTIONS[enemy.faction].name}的国王阵亡。`, 'war');
    }
    if (enemy.kind === 'soldier' && Math.random() < 0.12) {
      const v = world.villages.find(vv => vv.id === enemy.homeVillage);
      if (v) log(`${v.name}的一名战士战死。`, 'war');
    }
  }
}

function attackHouse(u, h) {
  u.atkCd = 1.1;
  h.hp -= u.dmg * rand(0.6, 1.1);
  addEffect('effects/fx/slash_01.png', h.tx * TILE + 8, h.ty * TILE + 4, 22, 0.22, { rot: rand(-0.5, 0.5) });
  const v = world.villages.find(vv => vv.id === h.villageId);
  if (h.hp <= 0) {
    addDecal('effects/fx/scorch_dark.png', h.tx * TILE + 8, h.ty * TILE + 8, 30, 50);
    removeHouse(h);
    if (v) log(`${v.name}的一间房屋被摧毁。`, 'war');
  }
}

function moveUnit(u, dt) {
  if (u.target && !u.target.dead) {
    u.txPx = u.target.x;
    u.tyPx = u.target.y;
    u.hasTarget = true;
  }
  if (!u.hasTarget) { u.moving = false; return; }

  const dx = u.txPx - u.x;
  const dy = u.tyPx - u.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) { u.hasTarget = false; u.moving = false; return; }
  if (d > 0.1) u.face = dx < 0 ? -1 : 1;

  const step = u.speed * dt;
  const nx = u.x + (dx / d) * step;
  const ny = u.y + (dy / d) * step;

  if (walkablePx(nx, ny)) {
    u.x = nx;
    u.y = ny;
    u.moving = true;
  } else {
    u.hasTarget = false;
    u.moving = false;
    u.thinkCd = 0;
  }
}

function updateVillages(dt) {
  for (const v of [...world.villages]) {
    const members = world.units.filter(u => !u.dead && u.homeVillage === v.id);
    v.pop = members.length;
    const farmers = members.filter(u => u.job === 'farmer').length;
    const builders = members.filter(u => u.job === 'builder').length;
    const soldiers = members.filter(u => u.job === 'soldier').length;

    v.food = Math.max(0, Math.min(120, v.food - v.pop * 0.038 * dt));
    v.wood = Math.min(90, v.wood + (builders * 0.02) * dt);
    v.stone = Math.min(60, v.stone + 0.01 * dt);

    const wars = [...world.wars].filter(k => k.split('-').map(Number).includes(v.faction)).length;
    const targetHappy = clamp(46 + Math.min(26, v.food * 0.28) + v.houses.length * 1.6 - wars * 12, 5, 96);
    v.happiness += (targetHappy - v.happiness) * Math.min(1, dt * 0.15);

    v.radius = 6 + Math.min(9, v.houses.length * 0.6);
    v.spawnCd -= dt;
    v.buildCd -= dt;
    v.soldierCd -= dt;

    const cap = 3 + v.houses.length * 3;
    if (v.pop < cap && v.food >= 8 && v.happiness > 36 && v.spawnCd <= 0) {
      spawnVillager(v);
      v.food -= 5;
      v.spawnCd = rand(5, 9);
    }

    if (v.houses.length < 12 && v.wood >= 10 && v.pop > v.houses.length * 2.2 && v.buildCd <= 0) {
      const spot = findOpenSpot(v.tx, v.ty, 1, 7);
      if (spot) {
        addHouse(v, spot.tx, spot.ty);
        v.wood -= 10;
        v.buildCd = rand(9, 15);
        addEffect('effects/icons/spark.png', spot.tx * TILE + 8, spot.ty * TILE + 8, 30, 0.7, { vy: -12 });
        if (Math.random() < 0.4) log(`${v.name}建起了一座新房屋。`, 'build');
      }
    }

    if (wars > 0 && v.pop >= 4 && soldiers < Math.min(6, 1 + Math.floor(v.pop / 3)) && v.soldierCd <= 0 && v.food > 3) {
      spawnSoldier(v);
      v.food -= 3;
      v.soldierCd = rand(8, 13);
    }

    if (v.food <= 0 && v.pop > 0 && Math.random() < dt * 0.008) {
      const victim = members.find(u => !u.king && u.job !== 'soldier');
      if (victim) {
        victim.dead = true;
        addCorpse(victim);
        log(`${v.name}有人因饥荒死去。`, 'war');
      }
    }

    if (v.capital) {
      const aliveKing = members.some(u => u.king);
      if (!aliveKing) {
        v.kingCd -= dt;
        if (v.kingCd <= 0 && world.villages.includes(v)) {
          spawnKing(v);
          log(`${FACTIONS[v.faction].name}拥立了新国王。`, 'diplo');
        }
      }
    }

    if (v.houses.length === 0) {
      v.razeCd = (v.razeCd || 0) + dt;
      if (v.pop === 0 && v.razeCd > 12) {
        log(`${v.name}沦为废墟。`, 'war');
        removeVillage(v);
      }
    } else {
      v.razeCd = 0;
    }
  }
}

function updateEffects(dt) {
  for (let i = world.effects.length - 1; i >= 0; i--) {
    const e = world.effects[i];
    e.life -= dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.rot += e.vr * dt;
    if (e.life <= 0) world.effects.splice(i, 1);
  }
}

function updateDecals(dt) {
  for (let i = world.decals.length - 1; i >= 0; i--) {
    const d = world.decals[i];
    d.life -= dt;
    if (d.life <= 0) world.decals.splice(i, 1);
  }
}

/* ---------------- disasters ---------------- */

function diplomacyTick(dt) {
  for (const key of [...world.wars]) {
    world.warTimers[key] = (world.warTimers[key] || 60) - dt;
    if (world.warTimers[key] <= 0) {
      const [a, b] = key.split('-').map(Number);
      makePeace(a, b);
    }
  }
}

function spawnTornado(tx, ty) {
  world.tornado = {
    x: tx * TILE + 8, y: ty * TILE + 8,
    life: 26, dir: rand(0, Math.PI * 2), speed: rand(55, 75)
  };
  flash(0.35);
  log('龙卷风登陆，沿途的一切都被卷入空中。', 'war');
  toast('龙卷风来袭');
}

function updateTornado(dt) {
  const t = world.tornado;
  if (!t) return;
  t.life -= dt;
  t.dir += rand(-0.5, 0.5) * dt;
  t.x += Math.cos(t.dir) * t.speed * dt;
  t.y += Math.sin(t.dir) * t.speed * dt;
  if (t.x < 60 || t.x > W * TILE - 60) t.dir = Math.PI - t.dir;
  if (t.y < 60 || t.y > H * TILE - 60) t.dir = -t.dir;

  if (Math.random() < dt * 22) {
    addEffect(pick(['effects/fx/magic_05.png', 'effects/fx/smoke_01.png', 'effects/fx/flame_03.png']),
      t.x + rand(-22, 22), t.y + rand(-18, 8), rand(28, 62), rand(0.3, 0.7), { vy: -46, vr: rand(-5, 5) });
  }

  for (const tree of [...world.trees.values()]) {
    if (dist2(tree.x * TILE + 8, tree.y * TILE + 8, t.x, t.y) < 30 * 30 && Math.random() < dt * 1.4) {
      world.trees.delete(tree.x + ',' + tree.y);
      addDecal('effects/fx/scorch_01.png', tree.x * TILE + 8, tree.y * TILE + 8, 22, 30);
    }
  }
  for (const h of [...world.houses]) {
    if (dist2(h.tx * TILE + 8, h.ty * TILE + 8, t.x, t.y) < 34 * 34 && Math.random() < dt * 1.1) {
      removeHouse(h);
      const v = world.villages.find(vv => vv.id === h.villageId);
      if (v) log(`${v.name}的房屋被龙卷风卷走。`, 'war');
    }
  }
  for (const u of world.units) {
    if (u.dead) continue;
    if (dist2(u.x, u.y, t.x, t.y) < 48 * 48) {
      u.hp -= dt * 8;
      u.x += rand(-40, 40) * dt;
      u.y += rand(-40, 40) * dt;
      u.hasTarget = false;
    }
  }

  if (t.life <= 0) {
    world.tornado = null;
    log('龙卷风渐渐消散。', 'diplo');
  }
}

function spawnVolcano(tx, ty) {
  world.volcanoes.push({ tx, ty, life: rand(22, 34), eruptCd: 0 });
  for (let y = ty - 3; y <= ty + 3; y++) {
    for (let x = tx - 3; x <= tx + 3; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (dist2(x, y, tx, ty) > 3.2 * 3.2) continue;
      if (world.terrain[tileIdx(x, y)] === T_WATER) continue;
      world.terrain[tileIdx(x, y)] = T_ROCK;
      world.variant[tileIdx(x, y)] = 0;
      world.trees.delete(x + ',' + y);
      const h = houseAt(x, y);
      if (h) removeHouse(h);
    }
  }
  redrawRegion(tx - 4, ty - 4, tx + 4, ty + 4);
  flash(0.5);
  shake(14);
  igniteTile(tx, ty);
  log('火山喷发，熔岩吞没了周围的大地。', 'war');
  toast('火山喷发');
}

function updateVolcanoes(dt) {
  for (let i = world.volcanoes.length - 1; i >= 0; i--) {
    const v = world.volcanoes[i];
    v.life -= dt;
    v.eruptCd -= dt;
    if (v.eruptCd <= 0) {
      v.eruptCd = rand(0.9, 1.8);
      const tx = v.tx + ((Math.random() * 7) | 0) - 3;
      const ty = v.ty + ((Math.random() * 7) | 0) - 3;
      igniteTile(tx, ty);
      addEffect(pick(['effects/fx/fire_01.png', 'effects/fx/flame_04.png', 'effects/fx/smoke_05.png']),
        tx * TILE + 8, ty * TILE + 8, rand(26, 48), rand(0.5, 1), { vy: -22 });
      if (Math.random() < 0.12) shake(3);
    }
    if (v.life <= 0) world.volcanoes.splice(i, 1);
  }
}

function earthquake(tx, ty) {
  flash(0.4);
  shake(24);
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = rand(2, 12);
    const x = Math.round(tx + Math.cos(a) * r);
    const y = Math.round(ty + Math.sin(a) * r);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i2 = tileIdx(x, y);
    const t = world.terrain[i2];
    if (t === T_GRASS || t === T_SAND) {
      world.terrain[i2] = Math.random() < 0.5 ? T_ROCK : T_SAND;
      world.variant[i2] = 0;
      world.trees.delete(x + ',' + y);
    }
    addDecal('effects/fx/scorch_01.png', x * TILE + 8, y * TILE + 8, rand(18, 34), 40);
  }
  for (const u of world.units) {
    if (!u.dead && dist2(u.x, u.y, tx * TILE, ty * TILE) < 12 * TILE * 12 * TILE) u.hp -= rand(15, 40);
  }
  for (const h of [...world.houses]) {
    if (dist2(h.tx, h.ty, tx, ty) < 10 * 10) {
      h.hp -= rand(50, 100);
      if (h.hp <= 0) {
        const v = world.villages.find(vv => vv.id === h.villageId);
        removeHouse(h);
        if (v) log(`${v.name}的房屋在地震中倒塌。`, 'war');
      }
    }
  }
  redrawRegion(tx - 13, ty - 13, tx + 13, ty + 13);
  log('大地剧烈震颤，地表被撕开裂口。', 'war');
  toast('地震');
}

/* ---------------- years ---------------- */

function yearlyEvent() {
  const ids = activeKingdomIds();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      if (atWar(a, b)) {
        if (relation(a, b) > -55 && Math.random() < 0.4) makePeace(a, b, true);
        continue;
      }
      const r = relation(a, b);
      if (!allied(a, b) && r < -50 && Math.random() < 0.32) {
        declareWar(a, b, true);
      } else if (!allied(a, b) && r > 60 && Math.random() < 0.28) {
        formAlliance(a, b, true);
      } else if (r > -50) {
        setRelation(a, b, r + (Math.random() < 0.5 ? 2 : -3));
      }
    }
  }

  // 国家开拓新村庄
  for (const k of world.kingdoms) {
    if (k.villages.length === 0 || k.villages.length >= 5 || world.villages.length >= 12) continue;
    if (Math.random() > 0.17) continue;
    const home = world.villages.find(v => v.id === pick(k.villages));
    if (!home || home.houses.length < 3) continue;
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = rand(10, 22);
      const tx = Math.round(home.tx + Math.cos(a) * r);
      const ty = Math.round(home.ty + Math.sin(a) * r);
      if (canPlaceVillage(tx, ty)) {
        const nv = placeVillage(tx, ty, k.id, true);
        log(`${FACTIONS[k.id].name}的开拓者建立了${nv.name}。`, 'build');
        break;
      }
    }
  }

  const roll = Math.random();
  if (roll < 0.14 && world.villages.length > 0) {
    const v = pick(world.villages);
    const spot = findOpenSpot(v.tx, v.ty, 8, 16);
    if (spot) spawnBeast(spot.tx, spot.ty);
  } else if (roll < 0.22) {
    for (let i = 0; i < 6; i++) {
      const tx = (Math.random() * W) | 0;
      const ty = (Math.random() * H) | 0;
      if (isLand(tx, ty)) { spawnMonster(tx, ty); break; }
    }
  } else if (roll < 0.32) {
    const lines = [
      '海风吹过群岛，卷起一层薄雾。',
      '林间的鸟兽比往年更安静了。',
      '远方的商队带来了陌生的歌谣。',
      '有人在夜里看见山脊上亮起微光。',
      '集市上开始流通新的铜币。'
    ];
    log(pick(lines));
  }

  if (Math.random() < 0.05 && world.villages.length > 0) {
    const v = pick(world.villages);
    const spot = findOpenSpot(v.tx, v.ty, 5, 12);
    if (spot) igniteTile(spot.tx, spot.ty);
  }
}

/* ---------------- god tools ---------------- */

const CONTINUOUS = new Set(['land', 'water', 'sand', 'forest', 'rock', 'human', 'beast', 'monster', 'zombie', 'fire', 'plague', 'acid', 'heal', 'bless', 'clear']);
const ACTIONS = new Set(['lightning', 'meteor', 'tornado', 'earthquake', 'volcano', 'village', 'war']);

function applyAction(tool, tx, ty) {
  const px = tx * TILE + 8, py = ty * TILE + 8;
  if (tool === 'lightning') {
    flash(0.55);
    shake(9);
    addEffect('effects/fx/light_01.png', px, py - 20, 210, 0.32);
    addEffect('effects/fx/magic_05.png', px, py - 12, 90, 0.32, { rot: 0.2 });
    addEffect('effects/fx/smoke_05.png', px, py, 40, 0.7, { vy: -10 });
    for (const u of [...world.units]) {
      if (dist2(u.x, u.y, px, py) < 36 * 36) {
        u.hp -= 95;
        if (u.hp <= 0 && !u.dead) { u.dead = true; addCorpse(u); }
      }
    }
    for (let y = ty - 1; y <= ty + 1; y++) {
      for (let x = tx - 1; x <= tx + 1; x++) {
        if (Math.random() < 0.7) igniteTile(x, y);
      }
    }
    addDecal('effects/fx/scorch_dark.png', px, py, 26, 45);
    return;
  }

  if (tool === 'meteor') {
    flash(0.7);
    shake(18);
    addEffect('effects/fx/fire_01.png', px, py, 250, 0.55);
    addEffect('effects/fx/flame_02.png', px, py, 190, 0.8, { vy: -8 });
    addEffect('effects/fx/smoke_01.png', px, py, 120, 1.1, { vy: -16 });
    for (const u of [...world.units]) {
      if (dist2(u.x, u.y, px, py) < 48 * 48) {
        u.hp -= 130;
        if (u.hp <= 0 && !u.dead) { u.dead = true; addCorpse(u); }
      }
    }
    for (let y = ty - 3; y <= ty + 3; y++) {
      for (let x = tx - 3; x <= tx + 3; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (dist2(x, y, tx, ty) > 3.4 * 3.4) continue;
        const i = tileIdx(x, y);
        if (world.terrain[i] === T_WATER) continue;
        world.terrain[i] = T_ROCK;
        world.variant[i] = 0;
        world.trees.delete(x + ',' + y);
        const h = houseAt(x, y);
        if (h) removeHouse(h);
        if (Math.random() < 0.4) addDecal('effects/fx/scorch_dark.png', x * TILE + 8, y * TILE + 8, rand(18, 30), 60);
      }
    }
    for (let y = ty - 2; y <= ty + 2; y++) {
      for (let x = tx - 2; x <= tx + 2; x++) igniteTile(x, y);
    }
    redrawRegion(tx - 4, ty - 4, tx + 4, ty + 4);
    return;
  }

  if (tool === 'tornado') { spawnTornado(tx, ty); return; }
  if (tool === 'volcano') { spawnVolcano(tx, ty); return; }
  if (tool === 'earthquake') { earthquake(tx, ty); return; }

  if (tool === 'village') {
    if (!canPlaceVillage(tx, ty)) {
      toast('这里无法建立村庄');
      return;
    }
    placeVillage(tx, ty);
    addEffect('effects/fx/magic_05.png', px, py, 50, 0.7);
    return;
  }

  if (tool === 'war') {
    const ids = activeKingdomIds();
    if (world.wars.size > 0) {
      for (const key of [...world.wars]) {
        const [a, b] = key.split('-').map(Number);
        makePeace(a, b, true);
      }
      log('诸国在神明见证下停战。', 'diplo');
      toast('全面停战');
    } else if (ids.length < 2) {
      toast('至少需要两个国家');
    } else {
      let bestA = ids[0], bestB = ids[1], br = relation(ids[0], ids[1]);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const r = relation(ids[i], ids[j]);
          if (r < br) { br = r; bestA = ids[i]; bestB = ids[j]; }
        }
      }
      declareWar(bestA, bestB);
    }
  }
}

function applyBrush(tool, tx, ty) {
  const r = state.brush;
  const r2 = r * r + 0.6;

  if (tool === 'human' || tool === 'monster' || tool === 'beast') {
    for (let i = 0; i < 2; i++) {
      const x = tx + ((Math.random() * (r * 2 + 1)) | 0) - r;
      const y = ty + ((Math.random() * (r * 2 + 1)) | 0) - r;
      if (!isLand(x, y)) continue;
      if (tool === 'human') spawnHuman(x, y);
      else if (tool === 'monster') spawnMonster(x, y);
      else spawnBeast(x, y);
    }
    return;
  }

  if (tool === 'zombie') {
    for (const u of [...world.units]) {
      if (u.dead || u.faction === null || u.kind === 'monster' || u.kind === 'beast') continue;
      if (dist2(Math.floor(u.x / TILE), Math.floor(u.y / TILE), tx, ty) > r2) continue;
      u.dead = true;
      addCorpse(u);
      spawnZombie(Math.floor(u.x / TILE), Math.floor(u.y / TILE));
      addEffect('effects/fx/magic_03.png', u.x, u.y - 8, 24, 0.6, { vy: -10 });
    }
    return;
  }

  if (tool === 'fire') {
    for (let y = ty - r; y <= ty + r; y++) {
      for (let x = tx - r; x <= tx + r; x++) {
        if (dist2(x, y, tx, ty) <= r2 && Math.random() < 0.6) igniteTile(x, y);
      }
    }
    return;
  }

  if (tool === 'plague') {
    for (const u of world.units) {
      if (u.dead || u.kind === 'monster' || u.kind === 'beast') continue;
      if (dist2(Math.floor(u.x / TILE), Math.floor(u.y / TILE), tx, ty) <= r2) {
        u.infected = true;
        u.infectedT = rand(16, 30);
        addEffect('effects/fx/magic_03.png', u.x, u.y - 8, 22, 0.6, { vy: -8 });
      }
    }
    return;
  }

  if (tool === 'acid') {
    let changed = false;
    for (let y = ty - r; y <= ty + r; y++) {
      for (let x = tx - r; x <= tx + r; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (dist2(x, y, tx, ty) > r2) continue;
        const i = tileIdx(x, y);
        if (world.terrain[i] === T_GRASS) { world.terrain[i] = T_SAND; changed = true; }
        const tree = world.trees.get(x + ',' + y);
        if (tree) {
          world.trees.delete(x + ',' + y);
          addDecal('effects/fx/scorch_dark.png', x * TILE + 8, y * TILE + 8, 20, 40);
        }
        if (Math.random() < 0.16) addEffect('effects/icons/poison_aura.png', x * TILE + 8, y * TILE + 8, rand(14, 24), 0.6, { vy: -6 });
      }
    }
    for (const u of world.units) {
      if (u.dead) continue;
      if (dist2(Math.floor(u.x / TILE), Math.floor(u.y / TILE), tx, ty) <= r2) {
        u.hp -= 26;
        u.infected = true;
        u.infectedT = rand(6, 14);
      }
    }
    for (const h of [...world.houses]) {
      if (dist2(h.tx, h.ty, tx, ty) <= r2) h.hp -= 20;
    }
    if (changed) redrawRegion(tx - r, ty - r, tx + r, ty + r);
    return;
  }

  if (tool === 'heal') {
    for (const u of world.units) {
      if (u.dead) continue;
      if (dist2(Math.floor(u.x / TILE), Math.floor(u.y / TILE), tx, ty) <= r2) {
        u.hp = u.maxHp;
        u.burning = false;
        u.infected = false;
        addEffect('effects/fx/magic_03.png', u.x + rand(-6, 6), u.y - 8, 22, 0.5, { vy: -14 });
      }
    }
    for (const h of world.houses) {
      if (dist2(h.tx, h.ty, tx, ty) <= r2) h.burning = false;
    }
    for (const t of world.trees.values()) {
      if (dist2(t.x, t.y, tx, ty) <= r2) t.burning = false;
    }
    for (const f of [...world.fires]) {
      if (dist2(f.tx, f.ty, tx, ty) <= r2) {
        addEffect('effects/fx/magic_03.png', f.tx * TILE + 8, f.ty * TILE + 8, 24, 0.5, { vy: -10 });
        world.fires.splice(world.fires.indexOf(f), 1);
      }
    }
    return;
  }

  if (tool === 'bless') {
    for (const u of world.units) {
      if (u.dead) continue;
      if (dist2(Math.floor(u.x / TILE), Math.floor(u.y / TILE), tx, ty) <= r2) {
        u.hp = Math.min(u.maxHp, u.hp + 30);
        u.burning = false;
        u.infected = false;
        addEffect('effects/icons/spark.png', u.x, u.y - 10, 20, 0.6, { vy: -14 });
      }
    }
    for (const v of world.villages) {
      if (dist2(v.tx, v.ty, tx, ty) <= r2) {
        v.food = Math.min(120, v.food + 16);
        v.wood = Math.min(90, v.wood + 8);
        v.happiness = Math.min(96, v.happiness + 8);
      }
    }
    for (let y = ty - r; y <= ty + r; y++) {
      for (let x = tx - r; x <= tx + r; x++) {
        if (dist2(x, y, tx, ty) > r2) continue;
        const i = tileIdx(x, y);
        if (x >= 0 && y >= 0 && x < W && y < H && world.terrain[i] === T_GRASS && !world.trees.has(x + ',' + y) && Math.random() < 0.15) {
          addTree(x, y, Math.random() < 0.5 ? 'tree' : 'bush');
        }
      }
    }
    return;
  }

  if (tool === 'clear') {
    for (const u of [...world.units]) {
      if (dist2(Math.floor(u.x / TILE), Math.floor(u.y / TILE), tx, ty) <= r2) {
        addEffect('effects/fx/dirt_01.png', u.x, u.y - 6, 30, 0.5, { vy: -10 });
        u.dead = true;
      }
    }
    return;
  }

  let changed = false;
  for (let y = ty - r; y <= ty + r; y++) {
    for (let x = tx - r; x <= tx + r; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (dist2(x, y, tx, ty) > r2) continue;
      const i = tileIdx(x, y);
      const cur = world.terrain[i];
      let next = cur;

      if (tool === 'land') {
        if (cur === T_WATER) next = T_SAND;
        else if (cur === T_ROCK) next = T_GRASS;
      } else if (tool === 'water') {
        next = T_WATER;
      } else if (tool === 'sand') {
        next = T_SAND;
      } else if (tool === 'rock') {
        next = T_ROCK;
      } else if (tool === 'forest') {
        next = T_GRASS;
        world.variant[i] = 1;
        addTree(x, y, Math.random() < 0.72 ? (Math.random() < 0.5 ? 'tree' : 'tree2') : (Math.random() < 0.5 ? 'bush' : 'bush2'));
      }

      if (next !== cur) {
        world.terrain[i] = next;
        changed = true;
        if (next === T_WATER || next === T_SAND || next === T_ROCK) {
          world.variant[i] = 0;
          world.trees.delete(x + ',' + y);
          const h = houseAt(x, y);
          if (h) removeHouse(h);
        }
        if (next === T_WATER || next === T_ROCK) {
          for (const u of [...world.units]) {
            if (u.dead) continue;
            if (Math.floor(u.x / TILE) === x && Math.floor(u.y / TILE) === y) {
              addEffect('effects/fx/smoke_01.png', u.x, u.y - 4, 26, 0.6, { vy: -12 });
              u.dead = true;
            }
          }
        }
      }
    }
  }

  if (changed) redrawRegion(tx - r, ty - r, tx + r, ty + r);
}

/* ---------------- UI data ---------------- */

const TOOL_GROUPS = [
  {
    id: 'view', label: '观察', icon: 'icons/target.png',
    tools: [{ id: 'select', name: '观察', icon: 'icons/target.png', hint: '点击生灵、房屋或村庄查看详情' }]
  },
  {
    id: 'terrain', label: '地形', icon: 'terrain/grass.png',
    tools: [
      { id: 'land', name: '陆地', icon: 'terrain/grass.png', hint: '把海水抬成沙地，把山岩风化成草原' },
      { id: 'water', name: '海洋', icon: 'terrain/water.png', hint: '沉下大地，淹没房屋与生灵' },
      { id: 'sand', name: '沙地', icon: 'terrain/sand.png', hint: '铺开沙土，抹去植被' },
      { id: 'forest', name: '森林', icon: 'nature/tree.png', hint: '催生草地与树林' },
      { id: 'rock', name: '山岩', icon: 'terrain/stone.png', hint: '隆起山岩，驱散生命' }
    ]
  },
  {
    id: 'life', label: '生命', icon: 'units/faction/blue/villager_m.png',
    tools: [
      { id: 'human', name: '人类', icon: 'units/faction/blue/villager_m.png', hint: '播撒人类，他们会投奔附近村庄' },
      { id: 'beast', name: '野兽', icon: 'units/bat.png', hint: '放出生性凶猛的野兽' },
      { id: 'monster', name: '怪物', icon: 'units/skeleton.png', hint: '唤醒憎恨一切生灵的怪物' },
      { id: 'zombie', name: '僵尸', icon: 'units/zombie.png', hint: '把人类变成传染性的僵尸' }
    ]
  },
  {
    id: 'disaster', label: '灾难', icon: 'effects/icons/fire.png',
    tools: [
      { id: 'fire', name: '火焰', icon: 'effects/icons/fire.png', hint: '点燃森林与房屋，火势会自行蔓延' },
      { id: 'plague', name: '瘟疫', icon: 'effects/icons/poison_aura.png', hint: '让生灵染病，并在人群中传染' },
      { id: 'lightning', name: '闪电', icon: 'effects/icons/bolt.png', hint: '降下雷霆，劈碎范围内的生命' },
      { id: 'meteor', name: '陨石', icon: 'effects/icons/meteor.png', hint: '天外火球砸出岩坑与烈焰' },
      { id: 'tornado', name: '龙卷', icon: 'effects/fx/magic_05.png', hint: '召唤移动的龙卷风，撕碎沿途一切' },
      { id: 'earthquake', name: '地震', icon: 'icons/warning.png', hint: '撕裂大地，震塌房屋' },
      { id: 'volcano', name: '火山', icon: 'effects/fx/fire_01.png', hint: '隆起火山，持续喷发熔岩' },
      { id: 'acid', name: '酸雨', icon: 'effects/icons/poison_aura.png', hint: '腐蚀大地、植被与血肉' }
    ]
  },
  {
    id: 'civ', label: '文明', icon: 'buildings/faction_blue_a.png',
    tools: [
      { id: 'village', name: '建村', icon: 'buildings/faction_blue_a.png', hint: '在空地上建立一座村庄，自动归属人口最少的国家' },
      { id: 'war', name: '战争', icon: 'units/sword.png', hint: '让关系最差的两个国家开战；再次使用则全面停战' }
    ]
  },
  {
    id: 'power', label: '神迹', icon: 'effects/icons/heal.png',
    tools: [
      { id: 'heal', name: '治愈', icon: 'effects/icons/heal.png', hint: '治愈伤势、熄灭火焰、净化瘟疫' },
      { id: 'bless', name: '祝福', icon: 'effects/icons/spark.png', hint: '赐予食物与木材，让草木生长' },
      { id: 'clear', name: '抹除', icon: 'icons/trashcan.png', hint: '抹除范围内的所有生灵' }
    ]
  }
];

const TOOL_INFO = {};
for (const g of TOOL_GROUPS) for (const t of g.tools) TOOL_INFO[t.id] = t;

/* ---------------- log & toast ---------------- */

let toastTimer = null;
function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function log(text, type = '') {
  if (!world) return;
  world.log.unshift({ text, type, year: world.year });
  if (world.log.length > 36) world.log.pop();
  renderLog();
}

function renderLog() {
  const el = document.getElementById('log-list');
  if (!el || !world) return;
  el.innerHTML = world.log.slice(0, 7).map(e =>
    `<div class="log-entry ${e.type}"><b>${e.year}年</b>${e.text}</div>`
  ).join('');
}

/* ---------------- HUD ---------------- */

function updateHUD() {
  if (!world) return;
  const civs = world.units.filter(u => !u.dead && u.faction !== null && u.kind !== 'monster' && u.kind !== 'beast').length;
  const wars = world.wars.size;
  document.getElementById('stat-year').textContent = world.year;
  document.getElementById('stat-pop').textContent = civs;
  document.getElementById('stat-villages').textContent = world.villages.length;
  document.getElementById('stat-kingdoms').textContent = activeKingdomIds().length;
  const warEl = document.getElementById('stat-war');
  warEl.textContent = wars > 0 ? '战争 ' + wars : '和平';
  warEl.classList.toggle('hot', wars > 0);
}

/* ---------------- toolbar ---------------- */

function buildRail() {
  const rail = document.getElementById('rail');
  rail.innerHTML = TOOL_GROUPS.map(g =>
    `<button class="rail-btn ${g.id === state.cat ? 'active' : ''}" data-cat="${g.id}" title="${g.label}">
      <img src="assets/${g.icon}" alt="${g.label}"><span>${g.label}</span>
    </button>`
  ).join('');

  rail.querySelectorAll('.rail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.cat = btn.dataset.cat;
      const group = TOOL_GROUPS.find(g => g.id === state.cat);
      state.tool = group.tools[0].id;
      buildRail();
      buildTools();
      updateToolState();
    });
  });
}

function buildTools() {
  const group = TOOL_GROUPS.find(g => g.id === state.cat) || TOOL_GROUPS[0];
  document.getElementById('tool-panel-title').textContent = group.label;
  const wrap = document.getElementById('tools');
  wrap.innerHTML = group.tools.map(t =>
    `<button class="tool ${t.id === state.tool ? 'active' : ''}" data-tool="${t.id}" title="${t.hint}">
      <img src="assets/${t.icon}" alt="${t.name}"><span>${t.name}</span>
    </button>`
  ).join('');

  wrap.querySelectorAll('.tool').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tool = btn.dataset.tool;
      wrap.querySelectorAll('.tool').forEach(b => b.classList.toggle('active', b.dataset.tool === state.tool));
      updateToolState();
    });
  });
}

function updateToolState() {
  const info = TOOL_INFO[state.tool];
  document.getElementById('tool-hint').textContent = info ? info.hint : '';
  document.getElementById('brush-size').textContent = state.brush;
  const brushRow = document.querySelector('.brush-row');
  const usable = CONTINUOUS.has(state.tool);
  brushRow.classList.toggle('disabled', !usable);
}

/* ---------------- inspector ---------------- */

function showInspector() {
  document.getElementById('inspector').classList.remove('hidden');
}

function hideInspector() {
  document.getElementById('inspector').classList.add('hidden');
  state.selectedUnit = null;
  state.selectedVillage = null;
  state.selectedTile = null;
}

function clearSelection() {
  state.selectedUnit = null;
  state.selectedVillage = null;
  state.selectedTile = null;
  hideInspector();
}

function unitDisplayName(u) {
  if (u.king) return `${FACTIONS[u.faction].name}国王`;
  if (u.kind === 'soldier') return '战士';
  if (u.kind === 'zombie' || (u.kind === 'monster' && u.sprite === 'zombie')) return '僵尸';
  if (u.kind === 'monster') return SPRITE_NAMES[u.sprite] || '怪物';
  if (u.kind === 'beast') return SPRITE_NAMES[u.sprite] || '野兽';
  return u.faction !== null ? '村民' : '流浪者';
}

function showUnit(u) {
  state.selectedUnit = u;
  state.selectedVillage = null;
  state.selectedTile = null;
  showInspector();
  const faction = u.faction !== null ? FACTIONS[u.faction].name : '无阵营';
  const hpPct = Math.max(0, Math.min(100, u.hp / u.maxHp * 100));
  const rows = [
    ['阵营', faction],
    ['身份', u.king ? '国王' : (JOB_NAMES[u.job] || '平民')],
    ['生命', `${Math.ceil(u.hp)} / ${Math.round(u.maxHp)}`],
    ['年龄', `${Math.floor(u.age)} 岁`],
    ['战力', u.dmg.toFixed(1)]
  ];
  if (u.burning) rows.push(['状态', '<span class="tag">燃烧中</span>']);
  if (u.infected) rows.push(['状态', '<span class="tag">染病</span>']);

  document.getElementById('insp-kicker').textContent = u.kind === 'monster' ? 'MONSTER' : u.kind === 'beast' ? 'WILDLIFE' : 'LIFE';
  document.getElementById('insp-title').textContent = unitDisplayName(u);
  document.getElementById('insp-body').innerHTML =
    rows.map(r => `<div class="row"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('') +
    `<div class="bar"><i style="width:${hpPct}%"></i></div>`;

  const actions = [];
  actions.push(`<button class="act-btn" data-act="heal-unit">治愈</button>`);
  if (u.faction !== null && u.kind === 'villager') actions.push(`<button class="act-btn" data-act="recruit-unit">招募为战士</button>`);
  if (u.faction !== null && !u.king) actions.push(`<button class="act-btn hot" data-act="exile-unit">放逐</button>`);
  actions.push(`<button class="act-btn hot" data-act="smite-unit">降下雷霆</button>`);
  document.getElementById('insp-actions').innerHTML = actions.join('');
}

function relationStatus(a, b) {
  if (atWar(a, b)) return { text: '战争', cls: 'war' };
  if (allied(a, b)) return { text: '同盟', cls: 'ally' };
  return { text: '和平', cls: '' };
}

function showVillage(v) {
  state.selectedVillage = v;
  state.selectedUnit = null;
  state.selectedTile = null;
  showInspector();

  const f = FACTIONS[v.faction];
  const soldiers = world.units.filter(u => !u.dead && u.homeVillage === v.id && u.job === 'soldier').length;
  const king = world.units.find(u => u.king && !u.dead && u.homeVillage === v.id);
  const foodPct = Math.min(100, v.food / 120 * 100);
  const happyPct = Math.min(100, v.happiness);

  let diplo = '';
  for (const k of world.kingdoms) {
    if (k.id === v.faction || k.villages.length === 0) continue;
    const st = relationStatus(v.faction, k.id);
    const r = relation(v.faction, k.id);
    diplo += `<div class="diplo-row">
      <span class="dname">${FACTIONS[k.id].name}</span>
      <span class="drel">${r > 0 ? '+' : ''}${r}</span>
      <span class="dstat ${st.cls}">${st.text}</span>
      ${atWar(v.faction, k.id)
        ? `<button class="mini-btn" data-act="dip-peace" data-f="${k.id}">求和</button>`
        : `<button class="mini-btn" data-act="dip-war" data-f="${k.id}">宣战</button>`}
      ${(!allied(v.faction, k.id) && !atWar(v.faction, k.id))
        ? `<button class="mini-btn" data-act="dip-ally" data-f="${k.id}">结盟</button>`
        : ''}
      <button class="mini-btn" data-act="dip-gift" data-f="${k.id}">赠礼</button>
    </div>`;
  }

  document.getElementById('insp-kicker').textContent = v.capital ? 'CAPITAL' : 'SETTLEMENT';
  document.getElementById('insp-title').textContent = v.name;
  document.getElementById('insp-body').innerHTML = `
    <div class="insp-sub">${f.name} · ${v.capital ? '王都' : '村庄'} · 建于 ${v.bornYear} 年</div>
    <div class="row"><span>人口</span><span>${v.pop} / ${3 + v.houses.length * 3}</span></div>
    <div class="row"><span>房屋</span><span>${v.houses.length}</span></div>
    <div class="row"><span>战士</span><span>${soldiers}</span></div>
    <div class="row"><span>国王</span><span>${king ? '在位' : '空缺'}</span></div>
    <div class="row"><span>木材</span><span>${Math.floor(v.wood)}</span></div>
    <div class="insp-section">粮食 ${Math.floor(v.food)} / 120</div>
    <div class="bar food"><i style="width:${foodPct}%"></i></div>
    <div class="insp-section">民心 ${Math.floor(v.happiness)}</div>
    <div class="bar happy"><i style="width:${happyPct}%"></i></div>
    <div class="insp-section">外交</div>
    ${diplo || '<div class="row"><span>暂无邻国</span><span></span></div>'}`;

  document.getElementById('insp-actions').innerHTML = `
    <button class="act-btn" data-act="vil-food">赐粮</button>
    <button class="act-btn" data-act="vil-house">建屋</button>
    <button class="act-btn" data-act="vil-soldier">征兵</button>
    <button class="act-btn" data-act="vil-center">定位村庄</button>`;
}

function showTerrain(tx, ty) {
  state.selectedTile = { tx, ty };
  state.selectedUnit = null;
  state.selectedVillage = null;
  showInspector();
  const t = getTile(tx, ty);
  const names = { 0: '海洋', 1: '沙地', 2: '草地', 3: '山岩' };
  const tree = world.trees.get(tx + ',' + ty);
  const v = nearestVillage(tx * TILE + 8, ty * TILE + 8, 40);
  document.getElementById('insp-kicker').textContent = 'TERRAIN';
  document.getElementById('insp-title').textContent = names[t] || '未知';
  document.getElementById('insp-body').innerHTML = `
    <div class="row"><span>坐标</span><span>${tx}, ${ty}</span></div>
    <div class="row"><span>植被</span><span>${tree ? '有' : '无'}</span></div>
    <div class="row"><span>附近村庄</span><span>${v ? v.name : '无'}</span></div>
    <div class="row"><span>火焰</span><span>${world.fires.some(f => f.tx === tx && f.ty === ty) ? '燃烧' : '无'}</span></div>`;
  document.getElementById('insp-actions').innerHTML =
    (isLand(tx, ty) && canPlaceVillage(tx, ty))
      ? `<button class="act-btn" data-act="tile-village">在此建村</button>`
      : '';
}

function updateInspector(force = false) {
  const panel = document.getElementById('inspector');
  if (!force && panel.matches(':hover')) return;
  const scrollTop = panel.scrollTop;
  if (state.selectedUnit) {
    if (state.selectedUnit.dead) { clearSelection(); return; }
    showUnit(state.selectedUnit);
  } else if (state.selectedVillage) {
    if (!world.villages.includes(state.selectedVillage)) { clearSelection(); return; }
    showVillage(state.selectedVillage);
  } else if (state.selectedTile) {
    showTerrain(state.selectedTile.tx, state.selectedTile.ty);
  }
  panel.scrollTop = scrollTop;
}

function bindInspectorActions() {
  document.getElementById('inspector').addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const targetF = btn.dataset.f !== undefined ? Number(btn.dataset.f) : null;

    if (act === 'heal-unit' && state.selectedUnit) {
      const u = state.selectedUnit;
      u.hp = u.maxHp; u.burning = false; u.infected = false;
      addEffect('effects/icons/heal.png', u.x, u.y - 10, 26, 0.7, { vy: -14 });
      toast('伤势痊愈');
    } else if (act === 'recruit-unit' && state.selectedUnit) {
      const u = state.selectedUnit;
      u.kind = 'soldier'; u.job = 'soldier'; u.hp = 58; u.maxHp = 58; u.dmg = 7; u.sprite = pick(SOLDIER_SPRITES);
      u.imgPath = factionSpritePath(u.faction, u.sprite);
      u.img = img(u.imgPath);
      toast('已招募为战士');
      log(`${FACTIONS[u.faction].name}征召了一名战士。`, 'war');
    } else if (act === 'exile-unit' && state.selectedUnit) {
      const u = state.selectedUnit;
      u.faction = null; u.homeVillage = null; u.job = 'idle';
      u.imgPath = `units/${u.sprite}.png`;
      u.img = img(u.imgPath);
      toast('已将其放逐');
    } else if (act === 'smite-unit' && state.selectedUnit) {
      const u = state.selectedUnit;
      applyAction('lightning', Math.floor(u.x / TILE), Math.floor(u.y / TILE));
    } else if (act === 'vil-food' && state.selectedVillage) {
      state.selectedVillage.food = Math.min(120, state.selectedVillage.food + 40);
      toast('粮食从天而降');
      addEffect('effects/icons/spark.png', state.selectedVillage.tx * TILE + 8, state.selectedVillage.ty * TILE, 40, 0.8, { vy: -14 });
    } else if (act === 'vil-house' && state.selectedVillage) {
      const v = state.selectedVillage;
      const spot = findOpenSpot(v.tx, v.ty, 1, 7);
      if (spot) {
        addHouse(v, spot.tx, spot.ty);
        addEffect('effects/icons/spark.png', spot.tx * TILE + 8, spot.ty * TILE + 8, 30, 0.7, { vy: -12 });
        toast('房屋落成');
      } else toast('周围没有空地');
    } else if (act === 'vil-soldier' && state.selectedVillage) {
      const v = state.selectedVillage;
      if (v.pop < 4) { toast('人口不足'); return; }
      spawnSoldier(v);
      v.food = Math.max(0, v.food - 3);
      toast('一名战士应征入伍');
    } else if (act === 'vil-center' && state.selectedVillage) {
      cam.x = state.selectedVillage.tx * TILE;
      cam.y = state.selectedVillage.ty * TILE;
      clampCamera();
    } else if (act === 'tile-village' && state.selectedTile) {
      const { tx, ty } = state.selectedTile;
      if (canPlaceVillage(tx, ty)) {
        placeVillage(tx, ty);
        addEffect('effects/fx/magic_05.png', tx * TILE + 8, ty * TILE + 8, 50, 0.8);
      } else toast('这里无法建立村庄');
    } else if (act === 'dip-war' && state.selectedVillage && targetF !== null) {
      declareWar(state.selectedVillage.faction, targetF);
    } else if (act === 'dip-peace' && state.selectedVillage && targetF !== null) {
      makePeace(state.selectedVillage.faction, targetF);
    } else if (act === 'dip-ally' && state.selectedVillage && targetF !== null) {
      formAlliance(state.selectedVillage.faction, targetF);
    } else if (act === 'dip-gift' && state.selectedVillage && targetF !== null) {
      giftRelation(state.selectedVillage.faction, targetF, 15);
      toast('使者送去了礼物，两国关系改善');
    }
    updateInspector(true);
    updateHUD();
  });
}

/* ---------------- minimap ---------------- */

const MINI_W = 180, MINI_H = 110;

function drawMinimap() {
  const cv = document.getElementById('minimap');
  if (!cv || !world) return;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(terrainCanvas, 0, 0, terrainCanvas.width, terrainCanvas.height, 0, 0, MINI_W, MINI_H);

  for (const h of world.houses) {
    ctx.drawImage(h.img, h.tx, h.ty, 4, 4);
  }

  const scale = cam.zoom;
  const viewW = window.innerWidth / (TILE * scale);
  const viewH = window.innerHeight / (TILE * scale);
  const vx = cam.x / TILE - viewW / 2;
  const vy = cam.y / TILE - viewH / 2;
  ctx.strokeStyle = 'rgba(231,193,118,0.9)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    clamp(vx, 0, W - 1), clamp(vy, 0, H - 1),
    Math.min(viewW, W), Math.min(viewH, H)
  );
}

function bindMinimap() {
  const cv = document.getElementById('minimap');
  cv.addEventListener('pointerdown', e => {
    const rect = cv.getBoundingClientRect();
    const tx = (e.clientX - rect.left) / rect.width * W;
    const ty = (e.clientY - rect.top) / rect.height * H;
    cam.x = tx * TILE;
    cam.y = ty * TILE;
    clampCamera();
  });
}

/* ---------------- save / load ---------------- */

const SLOT_PREFIX = 'weichen_world_slot_';

function toB64(u8) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
  }
  return btoa(s);
}

function fromB64(b64) {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

function serializeWorld() {
  return {
    version: 2,
    seed: world.seed,
    time: world.time,
    year: world.year,
    nextId: world.nextId,
    nameCount: world.nameCount,
    terrain: toB64(world.terrain),
    variant: toB64(world.variant),
    trees: [...world.trees.values()].map(t => ({ x: t.x, y: t.y, img: t.img, burning: t.burning, burnT: t.burnT })),
    houses: world.houses.map(h => ({ tx: h.tx, ty: h.ty, imgPath: h.imgPath, villageId: h.villageId, hp: h.hp, burning: h.burning, burnT: h.burnT })),
    units: world.units.map(u => ({
      id: u.id, kind: u.kind, faction: u.faction, sprite: u.sprite, imgPath: u.imgPath,
      job: u.job, x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp, speed: u.speed, dmg: u.dmg,
      age: u.age, maxAge: u.maxAge, homeVillage: u.homeVillage, burning: u.burning,
      infected: u.infected, infectedT: u.infectedT, king: u.king, face: u.face, phase: u.phase
    })),
    villages: world.villages.map(v => ({
      id: v.id, faction: v.faction, name: v.name, tx: v.tx, ty: v.ty, radius: v.radius,
      food: v.food, wood: v.wood, stone: v.stone, pop: v.pop, happiness: v.happiness,
      capital: v.capital, spawnCd: v.spawnCd, buildCd: v.buildCd, soldierCd: v.soldierCd,
      kingCd: v.kingCd, bornYear: v.bornYear, razeCd: v.razeCd || 0
    })),
    fires: world.fires,
    log: world.log,
    rels: world.rels,
    wars: [...world.wars],
    allies: [...world.allies],
    warTimers: world.warTimers,
    kingdoms: world.kingdoms.map(k => ({ id: k.id, capital: k.capital, villages: k.villages.slice(), king: k.king }))
  };
}

function deserializeWorld(data) {
  world = {
    seed: data.seed || 1,
    timers: {},
    terrain: fromB64(data.terrain),
    variant: fromB64(data.variant),
    trees: new Map(),
    houses: [],
    units: [],
    villages: data.villages.map(v => ({ ...v, houses: [] })),
    effects: [],
    decals: [],
    fires: data.fires || [],
    volcanoes: [],
    tornado: null,
    log: data.log || [],
    time: data.time || 0,
    year: data.year || 1,
    nextId: data.nextId || 1,
    nameCount: data.nameCount || {},
    rels: data.rels,
    wars: new Set(data.wars || []),
    allies: new Set(data.allies || []),
    warTimers: data.warTimers || {},
    kingdoms: data.kingdoms.map(k => ({ ...k, villages: k.villages.slice() }))
  };

  for (const t of data.trees || []) {
    world.trees.set(t.x + ',' + t.y, { x: t.x, y: t.y, img: t.img, burning: t.burning, burnT: t.burnT, hp: 18 });
  }
  for (const h of data.houses || []) {
    const hh = { ...h, img: img(h.imgPath) };
    world.houses.push(hh);
    const v = world.villages.find(vv => vv.id === hh.villageId);
    if (v) v.houses.push(hh);
  }
  for (const raw of data.units || []) {
    const u = { ...raw, img: img(raw.imgPath || `units/${raw.sprite}.png`), target: null, hasTarget: false, dead: false, moving: false, atkCd: 0, thinkCd: 0.2, workCd: 0 };
    world.units.push(u);
  }

  terrainCanvas = terrainCanvas || document.createElement('canvas');
  terrainCtx = terrainCanvas.getContext('2d');
  terrainCanvas.width = W * TILE;
  terrainCanvas.height = H * TILE;
  renderTerrainAll();

  state.selectedUnit = null;
  state.selectedVillage = null;
  state.selectedTile = null;
  hideInspector();
  state.speed = 1;
  document.querySelectorAll('.speed').forEach(b => b.classList.toggle('active', b.dataset.speed === '1'));

  const cap = world.villages[0];
  if (cap) { cam.x = cap.tx * TILE; cam.y = cap.ty * TILE; }
  clampCamera();
  renderLog();
  updateHUD();
  drawMinimap();
}

function saveSlot(i) {
  try {
    localStorage.setItem(SLOT_PREFIX + i, JSON.stringify(serializeWorld()));
    toast(`已保存到存档 ${i}`);
    renderSlots();
  } catch (err) {
    toast('保存失败：存储空间不足');
  }
}

function loadSlot(i) {
  const raw = localStorage.getItem(SLOT_PREFIX + i);
  if (!raw) { toast('该存档为空'); return; }
  try {
    deserializeWorld(JSON.parse(raw));
    document.getElementById('save-menu').classList.add('hidden');
    toast('世界已读取');
  } catch (err) {
    console.error(err);
    toast('存档损坏，无法读取');
  }
}

function slotInfo(i) {
  const raw = localStorage.getItem(SLOT_PREFIX + i);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    const pop = (d.units || []).filter(u => u.faction !== null && u.kind !== 'monster' && u.kind !== 'beast').length;
    return { year: d.year, pop, villages: (d.villages || []).length, time: d.time };
  } catch (e) { return null; }
}

function renderSlots() {
  const el = document.getElementById('slots');
  if (!el) return;
  let html = '';
  for (let i = 1; i <= 3; i++) {
    const info = slotInfo(i);
    html += `<div class="slot">
      <span class="slot-name">存档 ${i}</span>
      <span class="slot-info">${info ? `第 ${info.year} 年 · 人口 ${info.pop} · 村庄 ${info.villages}` : '空'}</span>
      <button class="ghost-btn mini" data-slot-save="${i}">保存</button>
      <button class="ghost-btn mini" data-slot-load="${i}">读取</button>
    </div>`;
  }
  el.innerHTML = html;

  el.querySelectorAll('[data-slot-save]').forEach(b => b.addEventListener('click', () => saveSlot(Number(b.dataset.slotSave))));
  el.querySelectorAll('[data-slot-load]').forEach(b => b.addEventListener('click', () => loadSlot(Number(b.dataset.slotLoad))));
}

function exportSave() {
  const blob = new Blob([JSON.stringify(serializeWorld())], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `微尘世界-第${world.year}年.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('存档已导出');
}

function importSave(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      deserializeWorld(JSON.parse(reader.result));
      document.getElementById('save-menu').classList.add('hidden');
      toast('存档已导入');
    } catch (err) {
      console.error(err);
      toast('文件无法识别');
    }
  };
  reader.readAsText(file);
}

function screenshot() {
  const a = document.createElement('a');
  a.href = document.getElementById('world').toDataURL('image/png');
  a.download = `微尘世界-第${world.year}年.png`;
  a.click();
  toast('截图已保存');
}

/* ---------------- camera & input ---------------- */

function screenToWorld(sx, sy) {
  const rect = document.getElementById('world').getBoundingClientRect();
  return {
    x: (sx - rect.left - rect.width / 2) / cam.zoom + cam.x,
    y: (sy - rect.top - rect.height / 2) / cam.zoom + cam.y
  };
}

function clampCamera() {
  const vw = window.innerWidth / cam.zoom;
  const vh = window.innerHeight / cam.zoom;
  const worldW = W * TILE;
  const worldH = H * TILE;
  if (vw >= worldW) cam.x = worldW / 2;
  else cam.x = clamp(cam.x, vw / 2, worldW - vw / 2);
  if (vh >= worldH) cam.y = worldH / 2;
  else cam.y = clamp(cam.y, vh / 2, worldH - vh / 2);
}

function zoomBy(factor) {
  cam.zoom = clamp(cam.zoom * factor, 0.45, 3.4);
  clampCamera();
}

function pickAt(wx, wy) {
  for (const h of world.houses) {
    const cx = h.tx * TILE + 8;
    const cy = h.ty * TILE + 2;
    if (Math.abs(wx - cx) <= 18 && wy >= h.ty * TILE - 24 && wy <= h.ty * TILE + 30) {
      const v = world.villages.find(vv => vv.id === h.villageId);
      if (v) return { type: 'village', village: v };
    }
  }

  let best = null, bd = 14 * 14;
  for (const u of world.units) {
    if (u.dead) continue;
    const d = dist2(wx, wy, u.x, u.y - 6);
    if (d < bd) { bd = d; best = u; }
  }
  if (best) return { type: 'unit', unit: best };

  const v = nearestVillage(wx, wy, 40);
  if (v) return { type: 'village', village: v };

  return { type: 'terrain', tx: Math.floor(wx / TILE), ty: Math.floor(wy / TILE) };
}

function useToolAt(wx, wy) {
  const tx = clamp(Math.floor(wx / TILE), 0, W - 1);
  const ty = clamp(Math.floor(wy / TILE), 0, H - 1);
  if (state.tool === 'select') {
    const hit = pickAt(wx, wy);
    if (hit.type === 'unit') showUnit(hit.unit);
    else if (hit.type === 'village') showVillage(hit.village);
    else showTerrain(hit.tx, hit.ty);
    return;
  }
  if (ACTIONS.has(state.tool)) {
    applyAction(state.tool, tx, ty);
    return;
  }
  if (CONTINUOUS.has(state.tool)) {
    applyBrush(state.tool, tx, ty);
    return;
  }
}

function bindInput() {
  const cvs = document.getElementById('world');

  cvs.addEventListener('contextmenu', e => e.preventDefault());

  cvs.addEventListener('pointerdown', e => {
    cvs.setPointerCapture(e.pointerId);
    if (e.button === 2 || e.button === 1) {
      state.panning = true;
      state.pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
      return;
    }
    if (e.button !== 0) return;
    const p = screenToWorld(e.clientX, e.clientY);
    if (e.pointerType === 'touch') {
      state.touch = {
        id: e.pointerId, startX: e.clientX, startY: e.clientY,
        camX: cam.x, camY: cam.y, wx: p.x, wy: p.y, used: false, at: performance.now()
      };
      return;
    }
    state.painting = true;
    state.lastPaint = { tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) };
    useToolAt(p.x, p.y);
  });

  cvs.addEventListener('pointermove', e => {
    const p = screenToWorld(e.clientX, e.clientY);
    state.mouse.sx = e.clientX;
    state.mouse.sy = e.clientY;
    state.mouse.wx = p.x;
    state.mouse.wy = p.y;
    state.mouse.inside = true;

    if (state.touch && e.pointerId === state.touch.id) {
      const dx = e.clientX - state.touch.startX;
      const dy = e.clientY - state.touch.startY;
      if (!state.touch.used && Math.hypot(dx, dy) > 10) state.touch.used = true;
      if (state.touch.used) {
        cam.x = state.touch.camX - dx / cam.zoom;
        cam.y = state.touch.camY - dy / cam.zoom;
        clampCamera();
      }
      return;
    }

    if (state.panning && state.pan) {
      cam.x = state.pan.cx - (e.clientX - state.pan.x) / cam.zoom;
      cam.y = state.pan.cy - (e.clientY - state.pan.y) / cam.zoom;
      clampCamera();
      return;
    }

    if (state.painting && CONTINUOUS.has(state.tool)) {
      const tx = Math.floor(p.x / TILE);
      const ty = Math.floor(p.y / TILE);
      if (state.lastPaint && (tx !== state.lastPaint.tx || ty !== state.lastPaint.ty)) {
        if (state.tool === 'human' || state.tool === 'beast' || state.tool === 'monster') {
          const now = performance.now();
          if (now - state.lastSpawnAt > 90) {
            state.lastSpawnAt = now;
            useToolAt(p.x, p.y);
          }
        } else {
          useToolAt(p.x, p.y);
        }
        state.lastPaint = { tx, ty };
      }
    }
  });

  const end = e => {
    if (state.touch) {
      const t = state.touch;
      if (!t.used && performance.now() - t.at < 700) useToolAt(t.wx, t.wy);
      state.touch = null;
    }
    state.painting = false;
    state.panning = false;
    state.pan = null;
  };
  cvs.addEventListener('pointerup', end);
  cvs.addEventListener('pointercancel', end);
  cvs.addEventListener('pointerleave', e => {
    state.mouse.inside = false;
    if (e.pointerType !== 'touch') end(e);
  });

  cvs.addEventListener('wheel', e => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.12 : 0.89);
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); setSpeed(state.speed === 0 ? (state.lastSpeed || 1) : 0); }
    else if (k === '1') setSpeed(1);
    else if (k === '2') setSpeed(2);
    else if (k === '3') setSpeed(4);
    else if (k === '0') setSpeed(0);
    else if (k === '+' || k === '=') { state.brush = clamp(state.brush + 1, 1, 10); updateToolState(); }
    else if (k === '-') { state.brush = clamp(state.brush - 1, 1, 10); updateToolState(); }
    else if (k === 's' || k === 'l') openSaveMenu();
    else if (k === 'f') screenshot();
    else if (k === 'escape') {
      document.getElementById('help').classList.add('hidden');
      document.getElementById('save-menu').classList.add('hidden');
      clearSelection();
    }
    else if (k === 'arrowleft' || k === 'a') { cam.x -= 46 / cam.zoom; clampCamera(); }
    else if (k === 'arrowright' || k === 'd') { cam.x += 46 / cam.zoom; clampCamera(); }
    else if (k === 'arrowup' || k === 'w') { cam.y -= 46 / cam.zoom; clampCamera(); }
    else if (k === 'arrowdown') { cam.y += 46 / cam.zoom; clampCamera(); }
  });

  window.addEventListener('resize', resizeCanvas);
}

function setSpeed(v) {
  state.speed = v;
  if (v > 0) state.lastSpeed = v;
  document.querySelectorAll('.speed').forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === v));
}

/* ---------------- rendering ---------------- */

let dpr = Math.min(2, window.devicePixelRatio || 1);

function resizeCanvas() {
  const cvs = document.getElementById('world');
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cvs.width = Math.floor(window.innerWidth * dpr);
  cvs.height = Math.floor(window.innerHeight * dpr);
  clampCamera();
}

function drawTree(tree) {
  const size = 20;
  const px = tree.x * TILE + 8 - size / 2;
  const py = tree.y * TILE + 14 - size;
  ctxDrawImage(img(tree.img), px, py, size, size);
}

function drawHouse(h) {
  const size = 34;
  const px = h.tx * TILE + 8 - size / 2;
  const py = h.ty * TILE + 26 - size;
  ctxDrawImage(h.img, px, py, size, size);
}

const ctxState = { ctx: null };

function ctxDrawImage(im, x, y, w, h) {
  ctxState.ctx.drawImage(im, x, y, w, h);
}

function drawUnit(u) {
  const ctx = ctxState.ctx;
  const bob = u.moving ? Math.sin(world.time * 11 + u.phase) * 1.2 : 0;
  const size = u.king ? 20 : 16;
  const px = u.x - size / 2;
  const py = u.y - size + bob;

  ctx.save();
  if (u.face < 0) {
    ctx.translate(u.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-u.x, 0);
  }
  if (u.burning) ctx.globalAlpha = 0.95;
  ctx.drawImage(u.img, px, py, size, size);
  ctx.restore();

  if (u.king) {
    ctx.drawImage(img('icons/star.png'), u.x - 5, py - 12, 10, 10);
  }

  if (u === state.hoverUnit && u !== state.selectedUnit) {
    ctx.globalAlpha = 0.55;
    ctx.drawImage(img('effects/fx/circle_02.png'), u.x - 11, u.y - 10, 22, 22);
    ctx.globalAlpha = 1;
  }
}

function drawEffects() {
  const ctx = ctxState.ctx;
  for (const d of world.decals) {
    const a = clamp(d.life / d.maxLife, 0, 1);
    ctx.globalAlpha = 0.45 * a;
    ctx.drawImage(d.img, d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
  }
  ctx.globalAlpha = 1;

  for (const e of world.effects) {
    const t = clamp(e.life / e.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.5);
    if (e.rot !== 0) {
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot);
      ctx.drawImage(e.img, -e.size / 2, -e.size / 2, e.size, e.size);
    } else {
      ctx.drawImage(e.img, e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    }
    ctx.restore();
  }

  if (world.tornado) {
    const t = world.tornado;
    for (let i = 0; i < 5; i++) {
      const ang = world.time * 6 + i * 1.2;
      const r = 8 + i * 7;
      const size = 26 + i * 9;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.translate(t.x + Math.cos(ang) * r, t.y - i * 14 + Math.sin(ang) * 4);
      ctx.rotate(ang * 0.6);
      ctx.drawImage(img(i % 2 ? 'effects/fx/smoke_01.png' : 'effects/fx/magic_05.png'), -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }
}

function drawBrush() {
  if (!state.mouse.inside) return;
  const ctx = ctxState.ctx;
  const tx = clamp(Math.floor(state.mouse.wx / TILE), 0, W - 1);
  const ty = clamp(Math.floor(state.mouse.wy / TILE), 0, H - 1);
  const size = (state.brush * 2 + 1) * TILE;
  const cx = tx * TILE + TILE / 2;
  const cy = ty * TILE + TILE / 2;

  if (state.tool === 'select') {
    ctx.globalAlpha = 0.6;
    ctx.drawImage(img('icons/target.png'), cx - 14, cy - 14, 28, 28);
    ctx.globalAlpha = 1;
    return;
  }

  ctx.globalAlpha = CONTINUOUS.has(state.tool) ? 0.4 : 0.7;
  ctx.drawImage(img('effects/fx/circle_02.png'), cx - size / 2, cy - size / 2, size, size);
  ctx.globalAlpha = 1;
}

function render() {
  const cvs = document.getElementById('world');
  const ctx = cvs.getContext('2d');
  ctxState.ctx = ctx;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#10222f';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const shakeX = state.shake > 0 ? rand(-state.shake, state.shake) : 0;
  const shakeY = state.shake > 0 ? rand(-state.shake, state.shake) : 0;
  state.shake *= 0.88;
  if (state.shake < 0.3) state.shake = 0;

  ctx.save();
  ctx.translate(window.innerWidth / 2 + shakeX, window.innerHeight / 2 + shakeY);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  ctx.drawImage(terrainCanvas, 0, 0);

  if (state.selectedVillage) {
    const v = state.selectedVillage;
    const size = v.radius * TILE * 2;
    ctx.globalAlpha = 0.12;
    ctx.drawImage(img('effects/fx/circle_02.png'), v.tx * TILE + 8 - size / 2, v.ty * TILE + 8 - size / 2, size, size);
    ctx.globalAlpha = 1;
  }

  for (const tree of world.trees.values()) drawTree(tree);
  for (const h of world.houses) drawHouse(h);

  const sorted = world.units.filter(u => !u.dead).sort((a, b) => a.y - b.y);
  for (const u of sorted) drawUnit(u);

  if (state.selectedUnit && !state.selectedUnit.dead) {
    const u = state.selectedUnit;
    ctx.globalAlpha = 0.8;
    ctx.drawImage(img('effects/fx/circle_02.png'), u.x - 13, u.y - 12, 26, 26);
    ctx.globalAlpha = 1;
  }

  drawEffects();
  drawBrush();

  ctx.restore();
}

/* ---------------- world creation ---------------- */

function newWorld(seed) {
  seed = seed || ((Math.random() * 1e9) | 0);
  world = {
    seed,
    time: 0,
    year: 1,
    nextId: 1,
    nameCount: {},
    terrain: new Uint8Array(W * H),
    variant: new Uint8Array(W * H),
    trees: new Map(),
    houses: [],
    units: [],
    villages: [],
    effects: [],
    decals: [],
    fires: [],
    volcanoes: [],
    tornado: null,
    log: [],
    rels: Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => i === j ? 100 : 0)),
    wars: new Set(),
    allies: new Set(),
    warTimers: {},
    kingdoms: FACTIONS.map((f, i) => ({ id: i, capital: null, villages: [], king: null }))
  };

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const r = Math.round(rand(-24, 38));
      world.rels[i][j] = r;
      world.rels[j][i] = r;
    }
  }

  if (!terrainCanvas) {
    terrainCanvas = document.createElement('canvas');
    terrainCanvas.width = W * TILE;
    terrainCanvas.height = H * TILE;
    terrainCtx = terrainCanvas.getContext('2d');
  }

  generateTerrain(seed);
  scatterNature();
  renderTerrainAll();

  // 初始四个国家
  const placed = [];
  let guard = 0;
  while (placed.length < 4 && guard++ < 1200) {
    const tx = Math.floor(rand(18, W - 18));
    const ty = Math.floor(rand(14, H - 14));
    if (!canPlaceVillage(tx, ty)) continue;
    if (placed.some(p => dist2(p.tx, p.ty, tx, ty) < 42 * 42)) continue;
    placed.push({ tx, ty });
    placeVillage(tx, ty, placed.length - 1, true);
  }

  // 让关系有张力
  if (placed.length >= 2) {
    world.rels[0][1] = world.rels[1][0] = -38;
    world.rels[1][2] = world.rels[2][1] = -22;
    world.rels[0][2] = world.rels[2][0] = 42;
  }

  // 初始野生动物与怪物
  for (let i = 0; i < 6; i++) {
    const tx = Math.floor(rand(6, W - 6));
    const ty = Math.floor(rand(6, H - 6));
    if (isLand(tx, ty)) spawnBeast(tx, ty);
  }
  for (let i = 0; i < 3; i++) {
    const tx = Math.floor(rand(6, W - 6));
    const ty = Math.floor(rand(6, H - 6));
    if (isLand(tx, ty)) spawnMonster(tx, ty);
  }

  state.tool = 'land';
  state.cat = 'terrain';
  state.brush = 2;
  state.selectedUnit = null;
  state.selectedVillage = null;
  state.selectedTile = null;
  if (document.getElementById('inspector')) hideInspector();

  const first = world.villages[0];
  cam.zoom = 1.6;
  if (first) { cam.x = first.tx * TILE; cam.y = first.ty * TILE; }
  clampCamera();

  world.log = [];
  log('世界在虚空中成形。', 'diplo');
  log('四个国家在群岛上点燃了第一堆篝火。', 'build');
  renderLog();
  updateHUD();

  if (document.getElementById('rail')) {
    buildRail();
    buildTools();
    updateToolState();
  }
}

/* ---------------- save menu ---------------- */

function openSaveMenu() {
  renderSlots();
  document.getElementById('save-menu').classList.remove('hidden');
}

/* ---------------- boot ---------------- */

function bindButtons() {
  document.querySelectorAll('.speed').forEach(b => {
    b.addEventListener('click', () => setSpeed(Number(b.dataset.speed)));
  });

  document.getElementById('btn-step').addEventListener('click', () => {
    for (let i = 0; i < 60; i++) simTick(1 / 30);
    updateHUD();
    toast('时间推进了两秒');
  });

  document.getElementById('btn-zoom-in').addEventListener('click', () => zoomBy(1.18));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoomBy(0.85));

  document.getElementById('btn-save').addEventListener('click', openSaveMenu);
  document.getElementById('btn-save-close').addEventListener('click', () => document.getElementById('save-menu').classList.add('hidden'));
  document.getElementById('btn-export').addEventListener('click', exportSave);
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-import').click());
  document.getElementById('file-import').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) importSave(f);
    e.target.value = '';
  });
  document.getElementById('btn-shot').addEventListener('click', screenshot);

  document.getElementById('btn-help').addEventListener('click', () => document.getElementById('help').classList.remove('hidden'));
  document.getElementById('btn-help-close').addEventListener('click', () => document.getElementById('help').classList.add('hidden'));
  document.getElementById('btn-reset').addEventListener('click', () => {
    newWorld();
    setSpeed(1);
    toast('新的世界诞生了');
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('splash').classList.add('hidden');
    setSpeed(1);
  });
  document.getElementById('btn-new').addEventListener('click', () => {
    newWorld();
    document.getElementById('splash').classList.add('hidden');
    setSpeed(1);
    toast('新的世界诞生了');
  });

  document.getElementById('brush-plus').addEventListener('click', () => {
    state.brush = clamp(state.brush + 1, 1, 10);
    updateToolState();
  });
  document.getElementById('brush-minus').addEventListener('click', () => {
    state.brush = clamp(state.brush - 1, 1, 10);
    updateToolState();
  });

  document.getElementById('insp-close').addEventListener('click', clearSelection);
}

function boot() {
  resizeCanvas();
  newWorld();
  buildRail();
  buildTools();
  updateToolState();
  bindInput();
  bindButtons();
  bindInspectorActions();
  bindMinimap();
  setSpeed(0);

  let last = performance.now();
  let acc = 0;
  let hudAt = 0, miniAt = 0, inspAt = 0;

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;

    if (state.speed > 0) {
      acc += dt * state.speed;
      let guard = 0;
      while (acc >= 1 / 30 && guard++ < 8) {
        simTick(1 / 30);
        acc -= 1 / 30;
      }
    } else {
      acc = 0;
    }

    render();

    if (ts - hudAt > 220) {
      hudAt = ts;
      updateHUD();
    }
    if (state.selectedUnit || state.selectedVillage || state.selectedTile) {
      if (ts - inspAt > 900) {
        inspAt = ts;
        updateInspector();
      }
    }
    if (ts - miniAt > 600) {
      miniAt = ts;
      drawMinimap();
    }
    if (ts - inspAt > 500) {
      inspAt = ts;
      if (state.mouse.inside && state.tool === 'select') {
        const hit = pickAt(state.mouse.wx, state.mouse.wy);
        state.hoverUnit = hit.type === 'unit' ? hit.unit : null;
      } else {
        state.hoverUnit = null;
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

loadAssets().then(() => {
  boot();
}).catch(err => {
  console.error(err);
  boot();
});




