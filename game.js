'use strict';

/* =========================================================
   微尘世界 · 像素神明沙盒
   所有画面元素均来自 Kenney.nl 的 CC0 像素素材
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
  bat: '蝙蝠', spider: '蜘蛛', ghost: '幽灵'
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
  'units/skull.png', 'units/sword.png',
  'buildings/house_a.png', 'buildings/house_b.png',
  'effects/fx/flame_01.png', 'effects/fx/flame_02.png', 'effects/fx/flame_03.png',
  'effects/fx/flame_04.png', 'effects/fx/flame_05.png', 'effects/fx/flame_06.png',
  'effects/fx/fire_01.png', 'effects/fx/smoke_01.png', 'effects/fx/smoke_05.png',
  'effects/fx/magic_01.png', 'effects/fx/magic_03.png', 'effects/fx/magic_05.png',
  'effects/fx/light_01.png', 'effects/fx/dirt_01.png', 'effects/fx/scorch_01.png',
  'effects/fx/scorch_dark.png', 'effects/fx/slash_01.png', 'effects/fx/circle_02.png',
  'effects/icons/ring.png', 'effects/icons/fire_aura.png', 'effects/icons/poison_aura.png',
  'icons/target.png'
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
  tool: 'select',
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
  logOpen: true
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

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
  const midLine = q(0.55);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = tileIdx(x, y);
      const e = elev[i];
      let t;
      if (e < seaLevel) t = T_WATER;
      else if (e < beachLine) t = T_SAND;
      else if (e > midLine && mtn[i] > 0.635) t = T_ROCK;
      else t = T_GRASS;

      world.terrain[i] = t;
      const moist = fbm(x * 0.055 + 31, y * 0.055 + 17, seed + 9, 4);
      world.variant[i] = (t === T_GRASS && moist > 0.53) ? 1 : 0;
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
  world.trees.set(key, {
    x: tx, y: ty, img: paths[type], burning: false, burnT: 0, hp: 18
  });
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
          if (Math.random() < 0.44) addTree(x, y, Math.random() < 0.86 ? pickTree() : (Math.random() < 0.5 ? 'bush' : 'bush2'));
        } else if (Math.random() < 0.028) {
          addTree(x, y, pickTree());
        } else if (Math.random() < 0.03) {
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

function makeUnit(opts) {
  const u = {
    id: world.nextId++,
    kind: 'villager',
    faction: null,
    sprite: 'villager_m',
    img: null,
    x: 0, y: 0,
    hp: 24, maxHp: 24,
    speed: 16, dmg: 3,
    atkCd: 0, thinkCd: Math.random() * 0.4,
    age: 0, maxAge: 600,
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
    moving: false
  };
  Object.assign(u, opts);
  u.maxHp = u.hp;
  if (!u.img) {
    if (u.faction !== null && (u.kind === 'villager' || u.kind === 'soldier')) {
      u.img = img(`units/faction/${FACTIONS[u.faction].key}/${u.sprite}.png`);
    } else {
      u.img = img(`units/${u.sprite}.png`);
    }
  }
  world.units.push(u);
  return u;
}

function spawnVillager(village, opts = {}) {
  const pos = findOpenSpot(village.tx, village.ty, 1, 4) || { tx: village.tx, ty: village.ty };
  const sprite = pick(CIV_SPRITES);
  return makeUnit({
    kind: 'villager',
    faction: village.faction,
    sprite,
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

function spawnHuman(tx, ty) {
  const sprite = pick(CIV_SPRITES);
  return makeUnit({
    kind: 'villager',
    faction: null,
    sprite,
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
    radius: 9,
    houses: [],
    food: 16,
    spawnCd: 5,
    buildCd: 7,
    soldierCd: 8,
    bornYear: world.year
  };
  world.villages.push(v);

  for (let i = 0; i < 4; i++) spawnVillager(v);
  const spot = findOpenSpot(tx, ty, 0, 2) || { tx, ty };
  addHouse(v, spot.tx, spot.ty);

  if (!silent) {
    log(`${f.name}部族建立了${name}。`, 'build');
    toast(`${name} 建立了`);
  }
  return v;
}

/* ---------------- effects ---------------- */

function addEffect(path, x, y, size, life, opts = {}) {
  if (world.effects.length > 280) world.effects.shift();
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
  if (world.decals.length > 220) world.decals.shift();
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

function igniteTile(tx, ty, source) {
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
      if (tree || house) {
        if (Math.random() < 0.55) igniteTile(nx, ny);
      }
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
      removeHouse(h);
      const v = world.villages.find(vv => vv.id === h.villageId);
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
  fireSpreadTick(dt);
  updateEffects(dt);
  updateDecals(dt);

  if (world.warTimer > 0) {
    world.warTimer -= dt;
    if (world.warTimer <= 0) endWar();
  }
}

function updateUnits(dt) {
  const units = world.units;

  for (const u of units) {
    if (u.dead) continue;
    u.age += dt;

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
  const aHostile = a.kind === 'monster' || a.kind === 'beast';
  const bHostile = b.kind === 'monster' || b.kind === 'beast';
  if (aHostile && !bHostile) return true;
  if (!aHostile && bHostile) return true;
  if (a.faction !== null && b.faction !== null && a.faction !== b.faction && world.atWar) return true;
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

function think(u) {
  // 流浪者加入附近村庄
  if (u.faction === null && u.kind === 'villager') {
    const v = nearestVillage(u.x, u.y, 90);
    if (v) {
      u.faction = v.faction;
      u.homeVillage = v.id;
      u.img = img(`units/faction/${FACTIONS[v.faction].key}/${u.sprite}.png`);
      if (Math.random() < 0.25) log(`${v.name}收留了一名流浪者。`, 'build');
      return;
    }
  }

  const range = (u.kind === 'monster' || u.kind === 'beast') ? 180 : (world.atWar ? 250 : 95);
  const enemy = findEnemy(u, range);

  if (enemy) {
    u.target = enemy;
    u.hasTarget = true;
    u.txPx = enemy.x;
    u.tyPx = enemy.y;
    if (dist2(u.x, u.y, enemy.x, enemy.y) < 12 * 12 && u.atkCd <= 0) attack(u, enemy);
    return;
  }

  u.target = null;

  // 战时的战士会主动向敌国村庄进军
  if (u.kind === 'soldier' && world.atWar) {
    let bestV = null, bd = 1e12;
    for (const v of world.villages) {
      if (v.faction === u.faction) continue;
      const d = dist2(u.x, u.y, v.tx * TILE, v.ty * TILE);
      if (d < bd) { bd = d; bestV = v; }
    }
    if (bestV) {
      u.hasTarget = true;
      u.txPx = bestV.tx * TILE + 8 + rand(-14, 14);
      u.tyPx = bestV.ty * TILE + 12 + rand(-14, 14);
      return;
    }
  }

  // 游荡
  if (!u.hasTarget || dist2(u.x, u.y, u.txPx, u.tyPx) < 6 * 6) {
    const home = u.homeVillage ? world.villages.find(v => v.id === u.homeVillage) : null;
    const cx = home ? home.tx * TILE : u.x;
    const cy = home ? home.ty * TILE : u.y;
    const r = home ? home.radius * TILE : 90;
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = rand(20, r);
      const tx = cx + Math.cos(a) * rr;
      const ty = cy + Math.sin(a) * rr;
      if (walkablePx(tx, ty)) {
        u.txPx = tx;
        u.tyPx = ty;
        u.hasTarget = true;
        break;
      }
    }
  }
}

function attack(u, enemy) {
  u.atkCd = u.kind === 'soldier' ? 0.85 : 1.05;
  const dmg = u.dmg * rand(0.75, 1.25);
  enemy.hp -= dmg;
  addEffect('effects/fx/slash_01.png', enemy.x, enemy.y - 6, 20, 0.22, { rot: rand(-0.5, 0.5) });
  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    addCorpse(enemy);
    if (enemy.kind === 'soldier' && Math.random() < 0.12) {
      const v = world.villages.find(vv => vv.id === enemy.homeVillage);
      if (v) log(`${v.name}的一名战士战死。`, 'war');
    }
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
  for (const v of world.villages) {
    const members = world.units.filter(u => !u.dead && u.homeVillage === v.id);
    v.pop = members.length;
    v.food = Math.min(70, v.food + v.pop * 0.22 * dt);

    v.spawnCd -= dt;
    v.buildCd -= dt;
    v.soldierCd -= dt;

    const cap = 4 + v.houses.length * 3;
    if (v.pop < cap && v.food >= 6 && v.spawnCd <= 0 && v.pop < 32) {
      spawnVillager(v);
      v.food -= 6;
      v.spawnCd = rand(6, 10);
    }

    if (v.houses.length < 9 && v.pop > v.houses.length * 2 + 1 && v.food >= 10 && v.buildCd <= 0) {
      const spot = findOpenSpot(v.tx, v.ty, 1, 7);
      if (spot) {
        addHouse(v, spot.tx, spot.ty);
        v.food -= 10;
        v.buildCd = rand(7, 12);
        if (Math.random() < 0.5) log(`${v.name}建起了一座新房屋。`, 'build');
      }
    }

    if (world.atWar && v.pop >= 4 && v.soldierCd <= 0) {
      const soldiers = members.filter(u => u.kind === 'soldier').length;
      if (soldiers < 5) {
        spawnSoldier(v);
        v.soldierCd = rand(6, 10);
      }
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

/* ---------------- years & war ---------------- */

function yearlyEvent() {
  if (world.villages.length >= 2 && !world.atWar && Math.random() < 0.2) {
    startWar(true);
  }

  const roll = Math.random();
  if (roll < 0.16 && world.villages.length > 0) {
    const v = pick(world.villages);
    const spot = findOpenSpot(v.tx, v.ty, 8, 16);
    if (spot) spawnBeast(spot.tx, spot.ty);
  } else if (roll < 0.24) {
    for (let i = 0; i < 6; i++) {
      const tx = (Math.random() * W) | 0;
      const ty = (Math.random() * H) | 0;
      if (isLand(tx, ty)) { spawnMonster(tx, ty); break; }
    }
  } else if (roll < 0.34) {
    const lines = [
      '海风吹过群岛，卷起一层薄雾。',
      '林间的鸟兽比往年更安静了。',
      '远方的商队带来了陌生的歌谣。',
      '有人在夜里看见山脊上亮起微光。'
    ];
    log(pick(lines));
  }

  if (Math.random() < 0.06 && world.villages.length > 0) {
    const v = pick(world.villages);
    const spot = findOpenSpot(v.tx, v.ty, 5, 12);
    if (spot) igniteTile(spot.tx, spot.ty);
  }
}

function startWar(quiet = false) {
  if (world.atWar || world.villages.length < 2) return;
  world.atWar = true;
  world.warTimer = 90;
  log('战火燃起，诸国互相宣战。', 'war');
  if (!quiet) toast('战争爆发');
  shake(8);
  for (const v of world.villages) {
    spawnSoldier(v);
    if (Math.random() < 0.6) spawnSoldier(v);
  }
}

function endWar() {
  if (!world.atWar) return;
  world.atWar = false;
  world.warTimer = 0;
  log('战争结束，大地暂时归于平静。', 'build');
  toast('战争结束');
}

/* ---------------- god tools ---------------- */

const CONTINUOUS = new Set(['land', 'water', 'sand', 'forest', 'rock', 'human', 'beast', 'monster', 'fire', 'plague', 'heal', 'clear']);
const ACTIONS = new Set(['lightning', 'meteor', 'village', 'war']);

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
    if (world.atWar) endWar();
    else if (world.villages.length < 2) toast('至少需要两个村庄');
    else startWar();
  }
}

function applyBrush(tool, tx, ty) {
  const r = state.brush;
  const r2 = r * r + 0.6;

  if (tool === 'human') {
    for (let i = 0; i < 2; i++) {
      const x = tx + ((Math.random() * (r * 2 + 1)) | 0) - r;
      const y = ty + ((Math.random() * (r * 2 + 1)) | 0) - r;
      if (isLand(x, y)) spawnHuman(x, y);
    }
    return;
  }

  if (tool === 'monster') {
    for (let i = 0; i < 2; i++) {
      const x = tx + ((Math.random() * (r * 2 + 1)) | 0) - r;
      const y = ty + ((Math.random() * (r * 2 + 1)) | 0) - r;
      if (isLand(x, y)) spawnMonster(x, y);
    }
    return;
  }

  if (tool === 'beast') {
    for (let i = 0; i < 2; i++) {
      const x = tx + ((Math.random() * (r * 2 + 1)) | 0) - r;
      const y = ty + ((Math.random() * (r * 2 + 1)) | 0) - r;
      if (isLand(x, y)) spawnBeast(x, y);
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

  if (tool === 'clear') {
    for (const u of [...world.units]) {
      if (dist2(Math.floor(u.x / TILE), Math.floor(u.y / TILE), tx, ty) <= r2) {
        addEffect('effects/fx/dirt_01.png', u.x, u.y - 6, 30, 0.5, { vy: -10 });
        u.dead = true;
      }
    }
    return;
  }

  // 地形工具
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
        else if (cur === T_SAND) next = T_GRASS;
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

/* ---------------- UI ---------------- */

const TOOL_GROUPS = [
  {
    label: '观察', tools: [
      { id: 'select', label: '查看', icon: 'icons/target.png', desc: '点击生灵或房屋查看详情' }
    ]
  },
  {
    label: '地形', tools: [
      { id: 'land', label: '陆地', icon: 'terrain/grass.png' },
      { id: 'water', label: '海洋', icon: 'terrain/water.png' },
      { id: 'sand', label: '沙滩', icon: 'terrain/sand.png' },
      { id: 'forest', label: '森林', icon: 'nature/tree.png' },
      { id: 'rock', label: '山岩', icon: 'terrain/stone.png' }
    ]
  },
  {
    label: '生命', tools: [
      { id: 'human', label: '人类', icon: 'units/villager_m.png' },
      { id: 'beast', label: '野兽', icon: 'units/spider.png' },
      { id: 'monster', label: '怪物', icon: 'units/demon.png' }
    ]
  },
  {
    label: '神迹', tools: [
      { id: 'fire', label: '火焰', icon: 'effects/icons/fire.png' },
      { id: 'lightning', label: '闪电', icon: 'effects/icons/bolt.png' },
      { id: 'meteor', label: '陨石', icon: 'effects/icons/meteor.png' },
      { id: 'plague', label: '瘟疫', icon: 'units/slime.png' },
      { id: 'heal', label: '治愈', icon: 'effects/icons/heal.png' }
    ]
  },
  {
    label: '文明', tools: [
      { id: 'village', label: '村庄', icon: 'buildings/house_a.png' },
      { id: 'war', label: '战争', icon: 'units/sword.png' },
      { id: 'clear', label: '抹除', icon: 'units/skull.png' }
    ]
  }
];

function buildToolbar() {
  const root = document.getElementById('tools');
  root.innerHTML = '';
  for (const group of TOOL_GROUPS) {
    const g = document.createElement('div');
    g.className = 'tool-group';
    const label = document.createElement('div');
    label.className = 'tool-group-label';
    label.textContent = group.label;
    const row = document.createElement('div');
    row.className = 'tool-row';
    for (const tool of group.tools) {
      const btn = document.createElement('button');
      btn.className = 'tool' + (tool.id === state.tool ? ' active' : '');
      btn.dataset.tool = tool.id;
      btn.title = tool.desc || tool.label;
      btn.innerHTML = `<img src="assets/${tool.icon}" alt=""><span>${tool.label}</span>`;
      btn.addEventListener('click', () => selectTool(tool.id));
      row.appendChild(btn);
    }
    g.appendChild(label);
    g.appendChild(row);
    root.appendChild(g);
  }
}

function selectTool(id) {
  state.tool = id;
  document.querySelectorAll('.tool').forEach(el => {
    el.classList.toggle('active', el.dataset.tool === id);
  });
}

function setSpeed(speed) {
  if (speed === 0) {
    if (state.speed > 0) state.lastSpeed = state.speed;
    state.speed = 0;
  } else {
    state.speed = speed;
    state.lastSpeed = speed;
  }
  document.querySelectorAll('.speed').forEach(el => {
    const v = Number(el.dataset.speed);
    el.classList.toggle('active', v === state.speed);
  });
}

function setBrush(v) {
  state.brush = clamp(v, 1, 7);
  document.getElementById('brush-size').textContent = String(state.brush);
}

function setupUI() {
  buildToolbar();

  document.querySelectorAll('.speed').forEach(btn => {
    btn.addEventListener('click', () => setSpeed(Number(btn.dataset.speed)));
  });

  document.getElementById('brush-minus').addEventListener('click', () => setBrush(state.brush - 1));
  document.getElementById('brush-plus').addEventListener('click', () => setBrush(state.brush + 1));

  document.getElementById('btn-zoom-in').addEventListener('click', () => zoomBy(1.2));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoomBy(1 / 1.2));

  document.getElementById('btn-help').addEventListener('click', () => {
    document.getElementById('help').classList.remove('hidden');
  });
  document.getElementById('btn-help-close').addEventListener('click', () => {
    document.getElementById('help').classList.add('hidden');
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    newWorld((Math.random() * 1e9) | 0);
    toast('新的世界已生成');
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('splash').classList.add('hidden');
    toast('点击下方工具，开始塑造世界');
  });
  document.getElementById('btn-new').addEventListener('click', () => {
    newWorld((Math.random() * 1e9) | 0);
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      e.preventDefault();
      setSpeed(state.speed > 0 ? 0 : (state.lastSpeed || 1));
    } else if (e.key === '1') setSpeed(1);
    else if (e.key === '2') setSpeed(2);
    else if (e.key === '3') setSpeed(4);
    else if (e.key === '0') setSpeed(0);
    else if (e.key === 'Escape') document.getElementById('help').classList.add('hidden');
  });
}

function log(msg, type = '') {
  if (!world) return;
  world.log.unshift({ year: world.year, msg, type });
  if (world.log.length > 24) world.log.pop();
  renderLog();
}

function renderLog() {
  const list = document.getElementById('log-list');
  if (!world) return;
  list.innerHTML = world.log.slice(0, 8).map(e =>
    `<div class="log-entry ${e.type}"><b>第${e.year}年</b>${e.msg}</div>`
  ).join('');
}

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function updateHUD() {
  if (!world) return;
  const pop = world.units.filter(u => u.faction !== null).length;
  document.getElementById('stat-year').textContent = String(world.year);
  document.getElementById('stat-pop').textContent = String(pop);
  document.getElementById('stat-villages').textContent = String(world.villages.length);
  const warEl = document.getElementById('stat-war');
  warEl.textContent = world.atWar ? '战争' : '和平';
  warEl.classList.toggle('hot', world.atWar);
  updateInspector();
}

function updateInspector() {
  if (!world) return;
  const titleEl = document.getElementById('insp-title');
  const bodyEl = document.getElementById('insp-body');

  const u = state.selectedUnit && !state.selectedUnit.dead ? state.selectedUnit : state.hoverUnit;
  const v = state.selectedVillage || state.hoverVillage;

  if (u && !u.dead) {
    const faction = u.faction !== null ? FACTIONS[u.faction] : null;
    const typeName = u.kind === 'villager' ? (u.faction === null ? '流浪者' : '村民')
      : u.kind === 'soldier' ? '战士'
      : u.kind === 'monster' ? '怪物' : '野兽';
    const stateText = u.burning ? '燃烧中' : u.infected ? '患病' : u.target ? '战斗中' : (u.moving ? '行走' : '停留');
    titleEl.textContent = '生灵档案';
    bodyEl.innerHTML = `
      <div class="row"><span>种类</span><span>${typeName} · ${SPRITE_NAMES[u.sprite] || ''}</span></div>
      <div class="row"><span>部族</span><span style="color:${faction ? faction.color : '#b39a76'}">${faction ? faction.name : '无'}</span></div>
      <div class="row"><span>生命</span><span>${Math.max(0, Math.round(u.hp))} / ${Math.round(u.maxHp)}</span></div>
      <div class="row"><span>年龄</span><span>${(u.age / 20).toFixed(1)} 岁</span></div>
      <div class="row"><span>状态</span><span class="tag">${stateText}</span></div>`;
    return;
  }

  if (v) {
    const faction = FACTIONS[v.faction];
    titleEl.textContent = '村庄档案';
    bodyEl.innerHTML = `
      <div class="row"><span>名称</span><span>${v.name}</span></div>
      <div class="row"><span>部族</span><span style="color:${faction.color}">${faction.name}</span></div>
      <div class="row"><span>人口</span><span>${v.pop || 0}</span></div>
      <div class="row"><span>房屋</span><span>${v.houses.length}</span></div>
      <div class="row"><span>存粮</span><span>${Math.round(v.food)}</span></div>`;
    return;
  }

  const tx = Math.floor(state.mouse.wx / TILE);
  const ty = Math.floor(state.mouse.wy / TILE);
  if (tx >= 0 && ty >= 0 && tx < W && ty < H) {
    const t = getTile(tx, ty);
    const names = { 0: '海洋', 1: '沙滩', 2: world.variant[tileIdx(tx, ty)] ? '森林' : '草原', 3: '山岩' };
    titleEl.textContent = '世界观察';
    bodyEl.innerHTML = `
      <div class="row"><span>地形</span><span>${names[t]}</span></div>
      <div class="row"><span>坐标</span><span>${tx}, ${ty}</span></div>
      <div class="row"><span>提示</span><span class="tag">左键使用神力</span></div>`;
  } else {
    titleEl.textContent = '世界观察';
    bodyEl.innerHTML = '<div class="row"><span>把鼠标移到世界上查看土地与生灵。</span></div>';
  }
}

/* ---------------- input ---------------- */

function screenToWorld(sx, sy) {
  return { x: cam.x + sx / cam.zoom, y: cam.y + sy / cam.zoom };
}

function zoomBy(factor, sx = window.innerWidth / 2, sy = window.innerHeight / 2) {
  const before = screenToWorld(sx, sy);
  cam.zoom = clamp(cam.zoom * factor, 0.55, 3.4);
  const after = screenToWorld(sx, sy);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  clampCamera();
}

function clampCamera() {
  const vw = window.innerWidth / cam.zoom;
  const vh = window.innerHeight / cam.zoom;
  const ww = W * TILE, wh = H * TILE;

  if (vw >= ww) cam.x = (ww - vw) / 2;
  else cam.x = clamp(cam.x, 0, ww - vw);
  if (vh >= wh) cam.y = (wh - vh) / 2;
  else cam.y = clamp(cam.y, 0, wh - vh);
}

function pickAt(wx, wy) {
  let bestUnit = null, bd = 13 * 13;
  for (const u of world.units) {
    if (u.dead) continue;
    const d = dist2(wx, wy, u.x, u.y - 7);
    if (d < bd) { bd = d; bestUnit = u; }
  }
  let bestVillage = null;
  for (const h of world.houses) {
    if (wx >= h.tx * TILE - 10 && wx <= h.tx * TILE + 26 && wy >= h.ty * TILE - 20 && wy <= h.ty * TILE + 20) {
      bestVillage = world.villages.find(v => v.id === h.villageId) || null;
      break;
    }
  }
  return { unit: bestUnit, village: bestVillage };
}

function onPointerDown(e) {
  if (e.button === 2 || e.button === 1) {
    state.panning = true;
    state.pan = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
    return;
  }
  if (e.button !== 0) return;

  const w = screenToWorld(e.clientX, e.clientY);
  const tx = Math.floor(w.x / TILE);
  const ty = Math.floor(w.y / TILE);

  if (state.tool === 'select') {
    const found = pickAt(w.x, w.y);
    state.selectedUnit = found.unit;
    state.selectedVillage = found.unit ? null : found.village;
    updateInspector();
    return;
  }

  if (ACTIONS.has(state.tool)) {
    applyAction(state.tool, tx, ty);
    return;
  }

  state.painting = true;
  state.lastPaint = { x: w.x, y: w.y };
  applyBrush(state.tool, tx, ty);
}

function onPointerMove(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (state.panning && state.pan) {
    cam.x = state.pan.cx - (e.clientX - state.pan.sx) / cam.zoom;
    cam.y = state.pan.cy - (e.clientY - state.pan.sy) / cam.zoom;
    clampCamera();
    return;
  }

  const w = screenToWorld(sx, sy);
  state.mouse.sx = sx;
  state.mouse.sy = sy;
  state.mouse.wx = w.x;
  state.mouse.wy = w.y;
  state.mouse.inside = true;

  const found = pickAt(w.x, w.y);
  state.hoverUnit = found.unit;
  state.hoverVillage = found.village;

  if (!state.painting) return;

  const last = state.lastPaint;
  if (!last) return;
  const d = Math.hypot(w.x - last.x, w.y - last.y);
  const stepLen = Math.max(6, state.brush * TILE * 0.55);
  const now = performance.now();

  if (d > stepLen) {
    const steps = Math.min(12, Math.floor(d / stepLen));
    for (let i = 1; i <= steps; i++) {
      const px = last.x + (w.x - last.x) * (i / steps);
      const py = last.y + (w.y - last.y) * (i / steps);
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(py / TILE);
      if (state.tool === 'human' || state.tool === 'beast' || state.tool === 'monster') {
        if (now - state.lastSpawnAt > 260) {
          applyBrush(state.tool, tx, ty);
          state.lastSpawnAt = now;
        }
      } else if (state.tool === 'fire' || state.tool === 'plague' || state.tool === 'heal' || state.tool === 'clear') {
        if (now - state.lastFxAt > 90) {
          applyBrush(state.tool, tx, ty);
          state.lastFxAt = now;
        }
      } else {
        applyBrush(state.tool, tx, ty);
      }
    }
    state.lastPaint = { x: w.x, y: w.y };
  }
}

function onPointerUp() {
  state.painting = false;
  state.panning = false;
  state.pan = null;
  state.lastPaint = null;
}

function onWheel(e) {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  zoomBy(factor, e.clientX, e.clientY);
}

/* ---------------- rendering ---------------- */

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');

let lastTime = 0;
let acc = 0;
let lastHud = 0;
let dpr = window.devicePixelRatio || 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.imageSmoothingEnabled = false;
  clampCamera();
}

function render(now) {
  const dt = Math.min(0.06, (now - lastTime) / 1000 || 0);

  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 40);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#12303f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const shakeX = state.shake ? rand(-state.shake, state.shake) * dpr : 0;
  const shakeY = state.shake ? rand(-state.shake, state.shake) * dpr : 0;

  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, -cam.x * dpr * cam.zoom + shakeX, -cam.y * dpr * cam.zoom + shakeY);

  const vw = window.innerWidth / cam.zoom;
  const vh = window.innerHeight / cam.zoom;
  const view = { x0: cam.x - 40, y0: cam.y - 40, x1: cam.x + vw + 40, y1: cam.y + vh + 40 };

  ctx.drawImage(terrainCanvas, 0, 0);
  drawDecals(view);
  drawEntities(view, now);
  drawEffects();
  drawBrush(now);
}

function drawDecals(view) {
  for (const d of world.decals) {
    if (d.x < view.x0 || d.y < view.y0 || d.x > view.x1 || d.y > view.y1) continue;
    const a = Math.min(1, d.life / d.maxLife + 0.15);
    ctx.globalAlpha = a;
    ctx.drawImage(d.img, d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
  }
  ctx.globalAlpha = 1;
}

const flamePaths = [
  'effects/fx/flame_01.png', 'effects/fx/flame_02.png', 'effects/fx/flame_03.png',
  'effects/fx/flame_04.png', 'effects/fx/flame_05.png', 'effects/fx/flame_06.png'
];

function drawEntities(view, now) {
  const items = [];

  for (const tree of world.trees.values()) {
    const px = tree.x * TILE, py = tree.y * TILE;
    if (px < view.x0 - 24 || py < view.y0 - 24 || px > view.x1 || py > view.y1) continue;
    items.push({ y: py + 16, type: 0, obj: tree });
  }
  for (const h of world.houses) {
    const px = h.tx * TILE, py = h.ty * TILE;
    if (px < view.x0 - 40 || py < view.y0 - 40 || px > view.x1 || py > view.y1) continue;
    items.push({ y: py + 16, type: 1, obj: h });
  }
  for (const u of world.units) {
    if (u.dead) continue;
    if (u.x < view.x0 - 24 || u.y < view.y0 - 24 || u.x > view.x1 || u.y > view.y1) continue;
    items.push({ y: u.y, type: 2, obj: u });
  }

  items.sort((a, b) => a.y - b.y);

  for (const it of items) {
    if (it.type === 0) drawTree(it.obj, now);
    else if (it.type === 1) drawHouse(it.obj, now);
    else drawUnit(it.obj, now);
  }
}

function drawTree(tree, now) {
  const cx = tree.x * TILE + TILE / 2;
  const by = tree.y * TILE + TILE;
  const size = tree.img === 'nature/deadtree.png' ? 22 : (tree.img.indexOf('/tree') >= 0 ? 26 : 18);
  const px = cx - size / 2;
  const py = by - size;
  ctx.drawImage(img(tree.img), px, py, size, size);
  if (tree.burning) {
    ctx.globalAlpha = 0.55 + Math.sin(now / 90 + tree.x) * 0.12;
    ctx.drawImage(img('effects/icons/fire_aura.png'), px - 2, py - 2, size + 4, size + 4);
    ctx.globalAlpha = 1;
  }
}

function drawHouse(h, now) {
  const px = h.tx * TILE - 8;
  const py = h.ty * TILE - 16;
  ctx.drawImage(h.img, px, py);
  if (h.burning) {
    ctx.globalAlpha = 0.55 + Math.sin(now / 80 + h.tx) * 0.12;
    ctx.drawImage(img('effects/icons/fire_aura.png'), h.tx * TILE - 8, h.ty * TILE - 8, 32, 32);
    ctx.globalAlpha = 1;
  }
}

function drawUnit(u, now) {
  const px = Math.round(u.x);
  const py = Math.round(u.y);
  const bob = u.moving ? Math.sin(now / 130 + u.phase) * 1.2 : 0;

  if (u.burning) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(img('effects/icons/fire_aura.png'), px - 11, py - 20 + bob, 22, 22);
    ctx.globalAlpha = 1;
  } else if (u.infected) {
    ctx.globalAlpha = 0.42 + Math.sin(now / 180 + u.phase) * 0.1;
    ctx.drawImage(img('effects/icons/poison_aura.png'), px - 10, py - 19 + bob, 20, 20);
    ctx.globalAlpha = 1;
  }

  if (u.faction !== null) {
    ctx.globalAlpha = 0.3;
    ctx.drawImage(img('effects/fx/circle_02.png'), px - 9, py - 3, 18, 9);
    ctx.globalAlpha = 1;
  }

  ctx.save();
  if (u.face < 0) {
    ctx.translate(px, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(u.img, -8, py - 16 + bob);
  } else {
    ctx.drawImage(u.img, px - 8, py - 16 + bob);
  }
  ctx.restore();

  if (state.selectedUnit === u) {
    ctx.globalAlpha = 0.8;
    ctx.drawImage(img('effects/icons/ring.png'), px - 12, py - 6, 24, 24);
    ctx.globalAlpha = 1;
  }
}

function drawEffects() {
  for (const e of world.effects) {
    const t = Math.max(0, e.life / e.maxLife);
    ctx.globalAlpha = Math.min(1, t * 1.6);
    if (e.rot) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot);
      ctx.drawImage(e.img, -e.size / 2, -e.size / 2, e.size, e.size);
      ctx.restore();
    } else {
      ctx.drawImage(e.img, e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    }
  }
  ctx.globalAlpha = 1;
}

function drawBrush(now) {
  if (!state.mouse.inside || state.panning) return;
  let x = state.mouse.wx, y = state.mouse.wy;
  if (state.painting) { x = state.lastPaint ? state.lastPaint.x : x; y = state.lastPaint ? state.lastPaint.y : y; }
  const size = state.tool === 'select' ? 20 : (state.brush * 2 + 1) * TILE;
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(now / 320) * 0.12;
  ctx.translate(x, y);
  ctx.rotate(now / 6000);
  ctx.drawImage(img('effects/fx/circle_02.png'), -size / 2, -size / 2, size, size);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* ---------------- world lifecycle ---------------- */

function newWorld(seed) {
  world = {
    seed,
    terrain: new Uint8Array(W * H),
    variant: new Uint8Array(W * H),
    trees: new Map(),
    houses: [],
    units: [],
    villages: [],
    effects: [],
    decals: [],
    fires: [],
    log: [],
    time: 0,
    year: 1,
    atWar: false,
    warTimer: 0,
    nextId: 1,
    nameCount: {}
  };

  generateTerrain(seed);
  scatterNature();

  state.selectedUnit = null;
  state.selectedVillage = null;
  state.hoverUnit = null;
  state.hoverVillage = null;
  state.painting = false;

  if (!terrainCanvas) {
    terrainCanvas = document.createElement('canvas');
    terrainCanvas.width = W * TILE;
    terrainCanvas.height = H * TILE;
    terrainCtx = terrainCanvas.getContext('2d');
    terrainCtx.imageSmoothingEnabled = false;
  }
  renderTerrainAll();

  // 初始文明
  const spots = [];
  for (let i = 0; i < 700 && world.villages.length < 2; i++) {
    const tx = 8 + ((Math.random() * (W - 16)) | 0);
    const ty = 8 + ((Math.random() * (H - 16)) | 0);
    if (!canPlaceVillage(tx, ty)) continue;
    if (spots.some(s => dist2(s.tx, s.ty, tx, ty) < 38 * 38)) continue;
    spots.push({ tx, ty });
    placeVillage(tx, ty, world.villages.length, true);
  }

  // 初始野兽
  for (let i = 0; i < 10; i++) {
    const tx = 6 + ((Math.random() * (W - 12)) | 0);
    const ty = 6 + ((Math.random() * (H - 12)) | 0);
    if (isLand(tx, ty) && !nearestVillage(tx * TILE, ty * TILE, 18)) spawnBeast(tx, ty);
  }
  for (let i = 0; i < 4; i++) {
    const tx = 6 + ((Math.random() * (W - 12)) | 0);
    const ty = 6 + ((Math.random() * (H - 12)) | 0);
    if (isLand(tx, ty) && !nearestVillage(tx * TILE, ty * TILE, 18)) spawnMonster(tx, ty);
  }

  // 起始镜头
  if (world.villages[0]) {
    cam.zoom = 1.35;
    cam.x = world.villages[0].tx * TILE - window.innerWidth / (2 * cam.zoom);
    cam.y = world.villages[0].ty * TILE - window.innerHeight / (2 * cam.zoom);
    clampCamera();
  }

  log('尘埃落定，第一缕阳光照在海面上。');
  for (const v of world.villages) {
    log(`${FACTIONS[v.faction].name}部族建立了${v.name}。`, 'build');
  }
  if (world.villages.length === 0) log('这片土地还没有文明，使用村庄工具播下第一粒种子。');

  renderLog();
  updateHUD();
  setSpeed(1);
}

/* ---------------- boot ---------------- */

async function boot() {
  try {
    await loadAssets();
  } catch (err) {
    console.error(err);
  }

  setupUI();
  resize();
  newWorld((Math.random() * 1e9) | 0);

  window.addEventListener('resize', resize);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', () => { state.mouse.inside = false; });
  canvas.addEventListener('wheel', onWheel, { passive: false });

  requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min(0.06, (now - lastTime) / 1000 || 0);
  lastTime = now;

  if (state.speed > 0) {
    acc += dt * state.speed;
    let guard = 0;
    while (acc >= 0.1 && guard < 12) {
      simTick(0.1);
      acc -= 0.1;
      guard++;
    }
    if (guard >= 12) acc = 0;
  }

  render(now);

  if (now - lastHud > 160) {
    lastHud = now;
    updateHUD();
  }

  requestAnimationFrame(loop);
}

boot();
