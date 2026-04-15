/**
 * sketch-01 — Controller Demo
 * ─────────────────────────────────────────────────────────────────────────────
 * Controls:
 *   Joystick  → move the ball (direct velocity)
 *   Gyro      → also moves the ball (tilt phone to steer) — adds to joystick
 *   Slider    → ball size (0.5× … 2.5×) + overall speed multiplier
 *   Button A  → burst of particles
 *   Button B  → toggle trail on/off
 */

// ── Editable constants ────────────────────────────────────────────────────────
const ROOM_ID        = "111"; // ← change to match your controller
const SPEED          = 5;     // base pixels per frame at full joystick deflection
const GYRO_SPEED     = 2;     // max pixels per frame at full phone tilt (lower = less sensitive)
const GYRO_DEADZONE  = 5;     // degrees of tilt to ignore (avoids drift at rest)
const BASE_RADIUS    = 28;
const TRAIL_LENGTH   = 60;
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
  const hue    = (frameCount * 0.4) % 360;          // slow auto-cycling hue
  const speed  = SPEED * (0.4 + spd * 1.6);         // faster with slider

  // ── Gyro → velocity (gamma = left/right tilt, beta = forward/back tilt) ──
  const rawGx = g.gamma ?? 0;  // -90 … 90  (tilt left/right)
  const rawGy = g.beta  ?? 0;  // -90 … 90  (tilt forward/back, clamped)

  // Apply deadzone so the ball stays still when phone is roughly flat
  const gx = abs(rawGx) > GYRO_DEADZONE ? rawGx : 0;
  const gy = abs(rawGy) > GYRO_DEADZONE ? rawGy : 0;

  // Map tilt angle to -1..1, then scale by GYRO_SPEED
  const gyroVx =  map(constrain(gx, -45, 45), -45, 45, -1, 1) * GYRO_SPEED;
  const gyroVy =  map(constrain(gy, -45, 45), -45, 45, -1, 1) * GYRO_SPEED;

  // ── Physics — joystick + gyro are additive ────────────────────────────────
  vel.x = joy.x * speed + gyroVx;
  vel.y = -joy.y * speed + gyroVy; // canvas Y is inverted vs joystick
  pos.add(vel);

  // Soft wrap at edges
  pos.x = ((pos.x % width)  + width)  % width;
  pos.y = ((pos.y % height) + height) % height;

  // ── Trail — records whenever the ball actually moves (joystick OR gyro) ──
  const isMoving = vel.magSq() > 0.05;
  if (showTrail && isMoving) {
    trail.push({ x: pos.x, y: pos.y, hue, r: radius });
    if (trail.length > TRAIL_LENGTH) trail.shift();
  }

  for (let i = 0; i < trail.length; i++) {
    const t  = i / trail.length; // 0 (oldest) … 1 (newest)
    const pt = trail[i];
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

  // ── Gyro tilt indicator (top-right corner) ───────────────────────────────
  {
    const cx = width - 48, cy = 48, r = 30;
    // outer ring
    noFill(); stroke(255, 15); strokeWeight(1);
    circle(cx, cy, r * 2);
    // dot showing tilt direction
    const tx = map(constrain(gx, -45, 45), -45, 45, -r, r);
    const ty = map(constrain(gy, -45, 45), -45, 45, -r, r);
    noStroke(); fill(hue, 70, 100, 70);
    circle(cx + tx, cy + ty, 10);
    noStroke();
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
  const hue = (frameCount * 0.4) % 360;
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
