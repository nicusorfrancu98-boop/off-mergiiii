const path = require('path');
const fs = require('fs');

const settingsPath = path.resolve(__dirname, 'settings.json');

console.log('[DEBUG] Loading config from:', settingsPath);

let config;
try {
  config = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (err) {
  console.error('[ERROR] Failed to load settings.json! Error:', err);
  process.exit(1);
}

const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;
const antiafk = require("mineflayer-antiafk");
const pvp = require('mineflayer-pvp').plugin;

function createBot () {
  const bot = mineflayer.createBot({
      username: config.bot.username,
      password: config.bot.password,
      host: config.server.ip,
      port: config.server.port,
      version: config.server.version
  });

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);
  bot.loadPlugin(antiafk);

  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);

  bot.once("spawn", () => {
      console.log("\x1b[33m[BotLog] Bot joined the server\x1b[0m");

      if(config.utils["auto-auth"].enabled){
        console.log("[INFO] Started auto-auth module");

        let password = config.utils["auto-auth"].password;
        setTimeout(() => {
          bot.chat(`/register ${password} ${password}`);
          bot.chat(`/login ${password}`);
        }, 500);

        console.log(`[Auth] Authentication commands executed.`);
      }

      if(config.utils["chat-messages"].enabled){
        console.log("[INFO] Started chat-messages module");
        let messages = config.utils["chat-messages"].messages;

        if(config.utils["chat-messages"].repeat){
          let delay = config.utils["chat-messages"]["repeat-delay"];
          let i = 0;

          setInterval(() => {
              bot.chat(messages[i]);
              i = (i + 1) % messages.length;
          }, delay * 1000);
        } else {
          messages.forEach(msg => bot.chat(msg));
        }
      }

      if(config.position.enabled){
          let pos = config.position;
          console.log(`\x1b[32m[BotLog] Moving to target location (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`);
          bot.pathfinder.setMovements(defaultMove);
          bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
      }

      if(config.utils["anti-afk"].enabled){
        bot.setControlState('jump', true);
        if(config.utils["anti-afk"].sneak){
            bot.setControlState('sneak', true);
        }
      }
  });

  bot.on('chat', (username, message) => {
    if(message === 'fight me'){
      let player = bot.players[username];
      if(!player) return bot.chat("I can't see you.");
      bot.pvp.attack(player.entity);
    }
    if(message === 'stop'){
      bot.pvp.stop();
    }
  });

  bot.on('chat', (username, message) => {
    if(config.utils['chat-log']){
      console.log(`[ChatLog] <${username}> ${message}`);
    }
  });

  bot.on("goal_reached", () => {
      console.log("\x1b[32m[BotLog] Bot arrived to target location.\x1b[0m");
  });

  bot.on("death", () => {
      console.log("\x1b[33m[BotLog] Bot died and respawned\x1b[0m");
  });

  if(config.utils["auto-reconnect"]){
    bot.on('end', () => {
      createBot();
    });
  }

  bot.on('kicked', reason => {
    console.log('\x1b[33m',`[BotLog] Bot was kicked. Reason:\n${reason}`, '\x1b[0m');
  });

  bot.on('error', err => {
    console.error(`\x1b[31m[ERROR] ${err.message}\x1b[0m`);
  });
}

createBot();
