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
      movementLoop();
      jumpLoop();
      combatLoop();
    }, 12000);
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
          targetPitch = rangeF(-0.25, 0.25);
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

    setTimeout(smoothSwingLoop, range(3000, 8000));
  }

  // ─── MOVEMENT LOOP ────────────────────────────────────────────────────────

  function movementLoop() {
    if (!alive) return;

    if (bot && bot.entity) {
      try {
        const allControls = ['forward', 'back', 'left', 'right', 'sprint', 'sneak'];

        allControls.forEach(a => {
          try { bot.setControlState(a, false); } catch(e) {}
        });

        const action = Math.random();

        if (action < 0.25) {
          // Normal walk forward
          bot.setControlState('forward', true);
          setTimeout(() => {
            try { if (alive && bot) bot.setControlState('forward', false); } catch(e) {}
          }, range(600, 1200));

        } else if (action < 0.50) {
          // Sprint forward
          bot.setControlState('forward', true);
          bot.setControlState('sprint', true);
          setTimeout(() => {
            try {
              if (alive && bot) {
                bot.setControlState('forward', false);
                bot.setControlState('sprint', false);
              }
            } catch(e) {}
          }, range(500, 1000));

        } else if (action < 0.65) {
          // Strafe left or right
          const dir = Math.random() > 0.5 ? 'left' : 'right';
          bot.setControlState(dir, true);
          setTimeout(() => {
            try { if (alive && bot) bot.setControlState(dir, false); } catch(e) {}
          }, range(400, 900));

        } else if (action < 0.78) {
          // Crouch
          bot.setControlState('sneak', true);
          setTimeout(() => {
            try { if (alive && bot) bot.setControlState('sneak', false); } catch(e) {}
          }, range(600, 1800));

        } else if (action < 0.88) {
          // Sprint + crouch combo
          bot.setControlState('forward', true);
          bot.setControlState('sprint', true);
          setTimeout(() => {
            try {
              if (alive && bot) {
                bot.setControlState('sprint', false);
                bot.setControlState('sneak', true);
              }
            } catch(e) {}
            setTimeout(() => {
              try {
                if (alive && bot) {
                  bot.setControlState('forward', false);
                  bot.setControlState('sneak', false);
                }
              } catch(e) {}
            }, range(400, 800));
          }, range(300, 600));

        }
        // else: idle this cycle

      } catch (e) {}
    }

    setTimeout(movementLoop, range(6000, 14000));
  }

  // ─── JUMP LOOP ────────────────────────────────────────────────────────────

  function jumpLoop() {
    if (!alive) return;

    if (bot && bot.entity) {
      try {
        if (Math.random() > 0.5) {
          bot.setControlState('forward', true);
          bot.setControlState('sprint', true);
        }
        bot.setControlState('jump', true);
        setTimeout(() => {
          try {
            if (alive && bot) {
              bot.setControlState('jump', false);
              bot.setControlState('forward', false);
              bot.setControlState('sprint', false);
            }
          } catch(e) {}
        }, 250);
      } catch (e) {}
    }

    setTimeout(jumpLoop, range(20000, 45000));
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

    // ✅ 30 seconds, retries forever until it connects
    console.log('🔄 Reconnecting in 30 seconds...');
    setTimeout(createBot, 30000);
  });

}

createBot();
