
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

    setTimeout(() => {
      if (!alive) return;
      movementLoop();
      combatLoop();
      interactionLoop();
    }, 3500);
  });

  // ─── MOVEMENT LOOP ────────────────────────────────────────────────────────

  function movementLoop() {
    if (!alive) return;

    if (bot && bot.entity) {
      try {
        const allActions = ['forward', 'back', 'left', 'right', 'jump', 'sneak'];
        const safeActions = ['forward', 'back', 'left', 'right'];

        // Clear all states first
        allActions.forEach(a => bot.setControlState(a, false));

        const chosen = safeActions[range(0, safeActions.length - 1)];
        bot.setControlState(chosen, true);

        // Short burst then stop
        setTimeout(() => {
          try {
            if (alive && bot && bot.entity) {
              allActions.forEach(a => bot.setControlState(a, false));
            }
          } catch (e) {}
        }, 400);

        // Smooth look, flat pitch only
        bot.look(Math.random() * Math.PI * 2, 0, true);

      } catch (e) {}
    }

    // Longer gap to reduce packet spam
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

  bot.on('kicked', (reason) => {
    let readable = reason;
    try { readable = JSON.parse(reason)?.text || reason; } catch (_) {}
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
    setTimeout(createBot, 60000); // ✅ 1 minute reconnect
  });

}

createBot();
