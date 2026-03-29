const mineflayer = require('mineflayer');
const config = require('./config.json');

const range = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// ─── PROCESS-LEVEL CRASH GUARD ───────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error(`💥 Uncaught exception (kept alive): ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error(`💥 Unhandled rejection (kept alive): ${reason}`);
});

// ─────────────────────────────────────────────────────────────────────────────

function createBot() {

  let bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botUsername,
    auth: 'offline',
    version: false,
  });

  let alive   = true;
  let spawned = false;

  // ─── PACKET-LEVEL ERROR GUARD ─────────────────────────────────────────────

  bot._client.on('error', (err) => {
    console.error(`📦 Packet error (connection kept): ${err.message}`);
  });

  // ─── LOGIN ────────────────────────────────────────────────────────────────

  bot.on('spawn', () => {
    if (spawned) return;
    spawned = true;

    console.log(`⚔️  ${config.botUsername} joined the server!`);

    setTimeout(() => {
      if (!alive) return;
      bot.chat('/login fuck69');
      console.log('🔑 Login sent.');
    }, 2000);

    // ✅ Increased to 6000ms — gives server time to fully position the bot
    setTimeout(() => {
      if (!alive) return;
      movementLoop();
      combatLoop();
      interactionLoop();
    }, 6000);
  });

  // ─── MOVEMENT LOOP ────────────────────────────────────────────────────────

  function movementLoop() {
  if (!alive) return;

  if (bot && bot.entity) {
    try {
      // Only rotate — zero movement packets sent, Paper can't flag it
      bot.look(Math.random() * Math.PI * 2, 0, true);
    } catch (e) {}
  }

  setTimeout(movementLoop, range(4000, 7000));
    }

  // ─── COMBAT LOOP ──────────────────────────────────────────────────────────

  function combatLoop() {
    if (!alive) return;

    if (bot && bot.entity) {
      try {
        const entity = bot.nearestEntity(
          e => (e.type === 'mob' || e.type === 'player') && e.username !== bot.username
        );

        if (entity && bot.entity.position.distanceTo(entity.position) < 4) {
          bot.lookAt(entity.position.offset(0, entity.height, 0));
          bot.attack(entity);
        } else {
          bot.swingArm('right');
        }

      } catch (e) {}
    }

    setTimeout(combatLoop, range(600, 1500));
  }

  // ─── INTERACTION LOOP ─────────────────────────────────────────────────────

  let lastInteraction = 0;

  function interactionLoop() {
    if (!alive) return;

    const now = Date.now();

    if (bot && bot.entity && Math.random() > 0.8 && (now - lastInteraction) > 15000) {
      try {
        lastInteraction = now;
        bot.activateItem();
        setTimeout(() => { if (alive && bot) bot.deactivateItem(); }, 300);
      } catch (e) {}
    }

    setTimeout(interactionLoop, range(15000, 40000));
  }

  // ─── DISCONNECT HANDLING + MEMORY CLEANUP ─────────────────────────────────

  // ✅ Fixed [object Object] kick message
  bot.on('kicked', (reason) => {
    let readable = reason;
    try {
      if (typeof reason === 'object') {
        readable = reason?.text || reason?.extra?.[0]?.text || JSON.stringify(reason);
      } else {
        readable = JSON.parse(reason)?.text || reason;
      }
    } catch (_) { readable = String(reason); }
    console.log(`⚠️  Kicked: ${readable}`);
  });

  bot.on('error', (err) => {
    console.error(`❌ Bot error: ${err.message}`);
  });

  bot.on('end', (reason) => {
    alive = false;

    console.log(`⛔ Disconnected. Reason: ${reason || 'unknown'}`);

    // ── MEMORY CLEANUP ──────────────────────────────────────────────────────
    try {
      bot.removeAllListeners();
      bot._client.removeAllListeners();
    } catch (e) {}

    bot = null;

    if (global.gc) {
      global.gc();
      console.log('🗑️  Garbage collection triggered.');
    }

    console.log('🔄 Reconnecting in 60 seconds...');
    setTimeout(createBot, 60000);
  });

}

createBot();
