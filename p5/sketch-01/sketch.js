/**
 * sketch-01 — Controller Demo
 * ─────────────────────────────────────────────────────────────────────────────
 * Controls:
 *   Joystick  → move the ball
 *   Slider    → ball size (0.5× … 2.5×)
 *   Gyro γ    → hue shift of the trail colour
 *   Button A  → burst of particles
 *   Button B  → toggle trail on/off
 */

// ── Editable constants ────────────────────────────────────────────────────────
const ROOM_ID      = "111"; // ← change to match your controller
const SPEED        = 5;          // base pixels per frame at full joystick
const BASE_RADIUS  = 28;
const TRAIL_LENGTH = 60;         // frames to keep trail
const PARTICLE_COUNT = 18;

// ── State ─────────────────────────────────────────────────────────────────────
let pos, vel;
let trail       = [];
let particles   = [];
let showTrail   = true;
let hud;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();
  hud = document.getElementById("hud");

  pos = createVector(width / 2, height / 2);
  vel = createVector(0, 0);

  // ── Connect bridge ──────────────────────────────────────────────────────────
  bridge.connect(ROOM_ID);

  // React to events (fires once per event, not every frame)
  bridge.on("peer_joined", () => {
    hud.classList.add("live");
    hud.innerHTML = `<span class="dot"></span>controller connected  room: ${ROOM_ID}`;
  });

  bridge.on("peer_left", () => {
    hud.classList.remove("live");
    hud.innerHTML = `<span class="dot"></span>controller disconnected`;
  });

  // Button A → burst
  bridge.on("btn-a", (e) => {
    if (e.values === true) spawnBurst();
  });

  // Button B → toggle trail
  bridge.on("btn-b", (e) => {
    if (e.values === true) {
      showTrail = !showTrail;
      if (!showTrail) trail = [];
    }
  });
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function draw() {
  // Subtle dark fade instead of clear — gives motion blur effect
  background(240, 20, 5, showTrail ? 18 : 100);

  // ── Read controller state ─────────────────────────────────────────────────
  const joy    = bridge.joystick("joystick-left");  // { x, y } -1..1
  const spd    = bridge.slider("slider-main");       // 0..1
  const g      = bridge.gyro();                      // { alpha, beta, gamma }
  const btnA   = bridge.button("btn-a");

  // Derived values
  const radius = BASE_RADIUS * (0.5 + spd * 2);    // 0.5× … 2.5× base
  const hue    = (map(g.gamma ?? 0, -90, 90, 0, 360) + frameCount) % 360;
  const speed  = SPEED * (0.4 + spd * 1.6);         // faster with slider

  // ── Physics ───────────────────────────────────────────────────────────────
  vel.x = joy.x * speed;
  vel.y = -joy.y * speed; // canvas Y is flipped
  pos.add(vel);

  // Soft wrap at edges
  pos.x = ((pos.x % width)  + width)  % width;
  pos.y = ((pos.y % height) + height) % height;

  // ── Trail ─────────────────────────────────────────────────────────────────
  if (showTrail && (joy.x !== 0 || joy.y !== 0)) {
    trail.push({ x: pos.x, y: pos.y, hue, r: radius });
    if (trail.length > TRAIL_LENGTH) trail.shift();
  }

  for (let i = 0; i < trail.length; i++) {
    const t   = i / trail.length;          // 0 (oldest) … 1 (newest)
    const pt  = trail[i];
    const age = 1 - t;
    fill(pt.hue, 80, 90, t * 60);
    circle(pt.x, pt.y, pt.r * t * 1.2);
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.12; // gravity
    p.life--;
    fill(p.hue, 90, 100, map(p.life, 0, p.maxLife, 0, 90));
    circle(p.x, p.y, p.r * (p.life / p.maxLife));
    if (p.life <= 0) particles.splice(i, 1);
  }

  // ── Ball ──────────────────────────────────────────────────────────────────
  // Outer glow ring
  fill(hue, 70, 100, 20);
  circle(pos.x, pos.y, radius * 2.8);

  // Pulsing ring when A is held
  if (btnA) {
    fill(hue, 40, 100, 40 + 20 * sin(frameCount * 0.3));
    circle(pos.x, pos.y, radius * 3.6);
  }

  // Core
  fill(hue, 85, 100, 95);
  circle(pos.x, pos.y, radius * 1.6);

  // Specular
  fill(0, 0, 100, 40);
  circle(pos.x - radius * 0.22, pos.y - radius * 0.22, radius * 0.55);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function spawnBurst() {
  const g   = bridge.gyro();
  const hue = map(g.gamma ?? 0, -90, 90, 0, 360);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = random(TWO_PI);
    const speed = random(2, 9);
    particles.push({
      x: pos.x, y: pos.y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      hue,
      r: random(6, 18),
      life: random(30, 70),
      maxLife: 70,
    });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pos = createVector(width / 2, height / 2);
}
