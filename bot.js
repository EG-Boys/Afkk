const mineflayer = require('mineflayer');
const config = require('./config.json');

const range = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const rangeF = (min, max) => Math.random() * (max - min) + min;

// ─── CRASH GUARD ─────────────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error(`💥 Uncaught exception: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error(`💥 Unhandled rejection: ${reason}`);
});

// ─────────────────────────────────────────────────────────────────────────────

function createBot() {

  let bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botUsername,
    auth: 'offline',
    version: '1.21.1',
    checkTimeoutInterval: 60000,
    physicsEnabled: false,
  });

  let alive   = true;
  let spawned = false;

  let currentYaw   = 0;
  let currentPitch = 0;
  let targetYaw    = 0;
  let targetPitch  = 0;

  // ─── PACKET ERROR GUARD ───────────────────────────────────────────────────

  bot._client.on('error', (err) => {
    console.error(`📦 Packet error: ${err.message}`);
  });

  // ─── SPAWN + LOGIN ────────────────────────────────────────────────────────

  bot.on('spawn', () => {
    if (spawned) return;
    spawned = true;

    currentYaw   = bot.entity.yaw;
    currentPitch = bot.entity.pitch;
    targetYaw    = currentYaw;
    targetPitch  = currentPitch;

    console.log(`⚔️  ${config.botUsername} joined!`);

    setTimeout(() => {
      if (!alive) return;
      bot.chat(`/login ${config.botPassword}`);
      console.log('🔑 Login sent.');
    }, 3000);

    setTimeout(() => {
      if (!alive) return;
      console.log('✅ Starting loops...');
      smoothLookLoop();
      smoothSwingLoop();
      sprintCrouchLoop();
      jumpLoop();
      combatLoop();
    }, 7000);
  });

  // ─── SMOOTH LOOK LOOP ─────────────────────────────────────────────────────

  function smoothLookLoop() {
    if (!alive) return;

    if (bot && bot.entity) {
      try {
        const yawDiff   = targetYaw   - currentYaw;
        const pitchDiff = targetPitch - currentPitch;

        currentYaw   += yawDiff   * 0.08;
        currentPitch += pitchDiff * 0.08;

        bot.look(currentYaw, currentPitch, true);

        if (Math.abs(yawDiff) < 0.01 && Math.abs(pitchDiff) < 0.01) {
          targetYaw   = currentYaw + rangeF(-Math.PI / 2, Math.PI / 2);
          targetPitch = rangeF(-0.3, 0.3);
        }

      } catch (e) {}
    }

    setTimeout(smoothLookLoop, 50);
  }

  // ─── SMOOTH SWING LOOP ────────────────────────────────────────────────────

  function smoothSwingLoop() {
    if (!alive) return;

    if (bot && bot.entity) {
      try {
        const hand = Math.random() > 0.85 ? 'left' : 'right';
        bot.swingArm(hand);
      } catch (e) {}
    }

    setTimeout(smoothSwingLoop, range(4000, 10000));
  }

  // ─── SPRINT + CROUCH LOOP ─────────────────────────────────────────────────

  function sprintCrouchLoop() {
    if (!alive) return;

    if (bot && bot.entity) {
      try {
        const action = Math.random();

        if (action < 0.4) {
          bot.setControlState('sprint', true);
          setTimeout(() => {
            try { if (alive && bot) bot.setControlState('sprint', false); } catch(e) {}
          }, range(300, 800));

        } else if (action < 0.7) {
          bot.setControlState('sneak', true);
          setTimeout(() => {
            try { if (alive && bot) bot.setControlState('sneak', false); } catch(e) {}
          }, range(500, 1500));

        } else if (action < 0.85) {
          bot.setControlState('sprint', true);
          setTimeout(() => {
            try {
              if (alive && bot) {
                bot.setControlState('sprint', false);
                bot.setControlState('sneak', true);
              }
            } catch(e) {}
            setTimeout(() => {
              try { if (alive && bot) bot.setControlState('sneak', false); } catch(e) {}
            }, range(300, 700));
          }, range(200, 500));
        }

      } catch (e) {}
    }

    setTimeout(sprintCrouchLoop, range(8000, 20000));
  }

  // ─── JUMP LOOP ────────────────────────────────────────────────────────────

  function jumpLoop() {
    if (!alive) return;

    if (bot && bot.entity) {
      try {
        bot.setControlState('jump', true);
        setTimeout(() => {
          try { if (alive && bot) bot.setControlState('jump', false); } catch(e) {}
        }, 200);
      } catch (e) {}
    }

    setTimeout(jumpLoop, range(25000, 50000));
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
          bot.swingArm('right');
        }
      } catch (e) {}
    }

    setTimeout(combatLoop, range(800, 1500));
  }

  // ─── KICKED ───────────────────────────────────────────────────────────────

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

  // ─── ERROR ────────────────────────────────────────────────────────────────

  bot.on('error', (err) => {
    console.error(`❌ Bot error: ${err.message}`);
  });

  // ─── DISCONNECT + CLEANUP + RECONNECT ─────────────────────────────────────

  bot.on('end', (reason) => {
    alive = false;

    console.log(`⛔ Disconnected: ${reason || 'unknown'}`);

    try {
      bot.removeAllListeners();
      bot._client.removeAllListeners();
    } catch (e) {}

    bot = null;

    if (global.gc) {
      global.gc();
      console.log('🗑️  GC triggered.');
    }

    console.log('🔄 Reconnecting in 60 seconds...');
    setTimeout(createBot, 60000);
  });

}

createBot();
