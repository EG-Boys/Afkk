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

  // ─── PACKET-LEVEL ERROR GUARD (fixes chat disconnect) ─────────────────────

  // Paper + ViaVersion + Essentials produce complex chat packets that mineflayer

  // sometimes chokes on. This catches the error at socket level before it can

  // kill the connection.

  bot._client.on('error', (err) => {

    console.error(`📦 Packet error (connection kept): ${err.message}`);

  });

  // ──────────────────────────────────────────────────────────────────────────

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

        const actions = ['forward', 'back', 'left', 'right', 'jump', 'sneak'];

        actions.forEach(a => bot.setControlState(a, false));

        bot.setControlState(actions[range(0, actions.length - 1)], true);

        bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.6, false);

      } catch (e) {}

    }

    setTimeout(movementLoop, range(1000, 3000));

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

    alive = false; // Stops all loops on their next tick

    console.log(`⛔ Disconnected. Reason: ${reason || 'unknown'}`);

    // ── MEMORY CLEANUP ──────────────────────────────────────────────────────

    // Remove all event listeners from the dead bot so Node's garbage collector

    // can fully release it from memory. Without this, every reconnect leaks the

    // old bot object because listeners keep a reference to it alive.

    try {

      bot.removeAllListeners();       // Remove all mineflayer-level listeners

      bot._client.removeAllListeners(); // Remove all packet-level listeners

    } catch (e) {}

    // Null out the bot reference so the GC can collect it immediately

    bot = null;

    // Suggest garbage collection if running with --expose-gc flag (optional)

    if (global.gc) {

      global.gc();

      console.log('🗑️  Garbage collection triggered.');

    }

    // ────────────────────────────────────────────────────────────────────────

    console.log('🔄 Reconnecting in 10 seconds...');

    setTimeout(createBot, 10000);

  });

}

createBot();

