const dotenv = require("dotenv");
dotenv.config();

var express = require("express");
var app = express();

app.use(express.static("public"));
const listener = app.listen(process.env.PORT || 8080, function() {
  console.log(`App listening on port ${listener.address().port}`);
});

var cron = require("node-cron");
const tg = require("telegraf");
const request = require("request");
const { Extra, Markup, session } = require("telegraf");

const bot = new tg(process.env.BOT_TOKEN);
bot.use(session());
const aboutMsg =
  "This bot was created by @gorserg\nSource code can be found at https://github.com/serhii-horobets82/coin-master-bot";

const TIMEOUT_UPGRADE = 10; // in min
const TIMEOUT_SPIN = 10; // in min

// bot.use(async (ctx, next) => {
//   const start = new Date()
//   await next()
//   const ms = new Date() - start
//   cron.schedule("*/2 * * * * *", () => {
//     ctx.replyWithMarkdown(`ms`);
//   });
// })

function userString(ctx) {
  return JSON.stringify(
    ctx.from.id == ctx.chat.id
      ? ctx.from
      : {
          from: ctx.from,
          chat: ctx.chat
        }
  );
}

function logMsg(ctx) {
  var from = userString(ctx);
  console.log("<", ctx.message.text, from);
}

const processBalance = (ctx, body) => {
  const {
    coins,
    spins,
    seq,
    name,
    shields,
    lastName,
    village,
    Ship,
    Farm,
    Crop,
    Statue,
    House
  } = body;
  ctx.session.seq = +seq;
  ctx.session.spins = +spins;
  ctx.session.coins = +coins;
  ctx.session.Ship = +Ship;
  ctx.session.Farm = +Farm;
  ctx.session.Crop = +Crop;
  ctx.session.Statue = +Statue;
  ctx.session.House = +House;

  ctx.replyWithMarkdown(
    `👤* ${lastName} ${name}*\n💰 *${coins}*\n🌀 *${spins}*\n🏙️ *${village}*🛡️ *${shields}*\n🏠 *${House}* 🗿*${Statue}* 🌾 *${Crop}* 🚜 *${Farm}* 🚢 *${Ship}*`
  );
};

function logOutMsg(ctx, text) {
  console.log(">", { id: ctx.chat.id }, text);
}

const items = ["Ship", "Crop", "Statue", "House", "Farm"];

bot.command("about", ctx => {
  logMsg(ctx);
  logOutMsg(ctx, aboutMsg);
  ctx.reply(aboutMsg);
});

bot.command(["/", "/start", "/menu"], ({ reply }) =>
  reply(
    "menu",
    Markup.keyboard([
      ["💰 /Balance", "🎲 /SpinX1", "🎲 /SpinX3", "🎲 /SpinX♾️"],
      ["⚒️ /All"],
      ["⚒️ /Ship", "⚒️ /Crop", "⚒️ /Statue", "⚒️ /House", "⚒️ /Farm"]
    ])
      .oneTime()
      .resize()
      .extra()
  )
);

const formData = {
  "Device[udid]": "f74fd7ea-303e-4569-a519-99a6ee1f8049",
  API_KEY: "viki",
  API_SECRET: "coin",
  "Device[change]": "20200220_3",
  locale: "en",
  "Device[os]": "Android",
  "Client[version]": "3.5_fband",
  "Device[version]": "5.1.1"
};

bot.hears(["/init", "🔑 Init"], ctx => {
  var options = {
    method: "POST",
    url: "https://vik-game.moonactive.net/api/v1/users/login",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CLIENT-VERSION": "3.5.49",
      Authorization: `Bearer ${process.env.DEVICE_TOKEN}`
    },
    form: { ...formData }
  };
  request(options, function(error, response) {
    if (error) throw new Error(error);
    let { userId, sessionToken } = JSON.parse(response.body);
    ctx.session.isInitialized = true;
    ctx.session.sessionToken = sessionToken;
    ctx.session.userId = userId;
    ctx.replyWithMarkdown(`userId: *${userId}*`);
  });

  logMsg(ctx);
  logOutMsg(ctx, "init done");
});

const initSession = ctx => {
  return new Promise((resolve, reject) => {
    if (ctx.session.isInitialized) {
      resolve(ctx.session.userId);
      return;
    }
    var options = {
      method: "POST",
      url: "https://vik-game.moonactive.net/api/v1/users/login",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CLIENT-VERSION": "3.5.49",
        Authorization: `Bearer ${process.env.DEVICE_TOKEN}`
      },
      form: { ...formData }
    };
    request(options, function(error, response) {
      if (error) throw new Error(error);
      let { userId, sessionToken } = JSON.parse(response.body);
      ctx.session.isInitialized = true;
      ctx.session.sessionToken = sessionToken;
      ctx.session.userId = userId;

      resolve(userId);
    });
  });
};

const getBalance = ctx => {
  return new Promise((resolve, reject) => {
    initSession(ctx).then(() => {
      var options = {
        method: "POST",
        url: `https://vik-game.moonactive.net/api/v1/users/${ctx.session.userId}/balance`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CLIENT-VERSION": "3.5.49",
          Authorization: `Bearer ${ctx.session.sessionToken}`
        },
        form: {
          ...formData,
          extended: "true",
          segmented: "true"
        }
      };
      request(options, function(error, response) {
        if (error) {
          reject(error);
          return;
        }
        const body = JSON.parse(response.body);
        processBalance(ctx, body);
        resolve();
        logMsg(ctx);
      });
    });
  });
};

bot.hears(["/Balance", "💰 /Balance"], ctx => {
  getBalance(ctx);
});

/*
  Spin
*/

const singleSpin = async (seq, xbet, ctx) => {
  return new Promise((resolve, reject) => {
    var options = {
      method: "POST",
      url: `https://vik-game.moonactive.net/api/v1/users/${ctx.session.userId}/spin`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CLIENT-VERSION": "3.5.49",
        "X-Unity-Version": "2018.4.0f1",
        "X-PLATFORM": "Android",
        Authorization: `Bearer ${ctx.session.sessionToken}`
      },
      form: {
        "Device[udid]": "f74fd7ea-303e-4569-a519-99a6ee1f8049",
        API_KEY: "viki",
        API_SECRET: "coin",
        "Device[change]": "20200223_4",
        fbToken: "10e48028ae753424bf67",
        locale: "en",
        seq: seq + 1,
        auto_spin: "False",
        bet: xbet,
        "Client[version]": "3.5.49_fband"
      }
    };
    request(options, function(error, response) {
      if (error) throw new Error(error);
      const body = JSON.parse(response.body);
      const win = +body.coins - ctx.session.coins;
      ctx.replyWithMarkdown(`🏆 *${win}*`);

      setTimeout(function() {
        resolve(win);
      }, 1000);
    });
  });
};

bot.hears([/\/SpinX/gi, /🎲 \/SpinX/gi], ctx => {
  getBalance(ctx).then(async () => {
    let xbet = ctx.message.text
      .replace(/🎲 \/SpinX/gi, "")
      .replace(/\/SpinX/gi, "")
      .trim();
      console.log("xbet", xbet);
    if (!ctx.session.isInitialized) {
      ctx.replyWithMarkdown("Not initialized session!");
      return;
    }
    if (xbet === "♾️") {
      let spins = ctx.session.spins;
      for (let index = 0; index < spins; index++) {
        await singleSpin(ctx.session.seq + index, 1, ctx);
      }
      let task = ctx.session.autoSpinCronTask;
      if (!task) {
        ctx.session.autoSpinCronTask = cron.schedule(
          `*/${TIMEOUT_SPIN} * * * *`,
          async () => {
            ctx.replyWithMarkdown(`Start spin ...`);
            getBalance(ctx).then(async () => {
              let spins = ctx.session.spins;
              for (let index = 0; index < spins; index++) {
                await singleSpin(ctx.session.seq + index, 1, ctx);
              }
            });
            ctx.replyWithMarkdown(`Finish spin ...`);
          }
        );
      }
    } else {
      xbet = +xbet;
      singleSpin(ctx.session.seq, xbet, ctx);
    }
  });
});

/*
    Upgrade
  */
const upgradeItem = async (item, ctx) => {
  return new Promise((resolve, reject) => {
    let itemCount = ctx.session[item];

    var options = {
      method: "POST",
      url: `https://vik-game.moonactive.net/api/v1/users/${ctx.session.userId}/upgrade`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CLIENT-VERSION": "3.5.49",
        "X-Unity-Version": "2018.4.0f1",
        "X-PLATFORM": "Android",
        Authorization: `Bearer ${ctx.session.sessionToken}`
      },
      form: {
        "Device[udid]": "f74fd7ea-303e-4569-a519-99a6ee1f8049",
        API_KEY: "viki",
        API_SECRET: "coin",
        "Device[change]": "20200224_3",
        fbToken: "10e48028ae753424bf67",
        locale: "en",
        item,
        state: itemCount,
        "include[0]": "pets"
      }
    };
    request(options, function(error, response) {
      if (error) throw new Error(error);
      const body = JSON.parse(response.body);
      const { ok } = body;
      ctx.replyWithMarkdown(
        `${ok ? "👍" : "👎 "} *${item}* at level *${body[item]}*`
      );
      setTimeout(function() {
        resolve(ok);
      }, 100);
      //.then(() => processBalance(ctx, body));
    });
  });
};

let upgradeCronTask;

bot.hears([/⚒️ /gi, "/All", ...items.map(i => "/" + i)], ctx => {
  let item = ctx.message.text.replace(/⚒️ /gi, "").replace(/\//gi, "");
  initSession(ctx).then(async () => {
    if (item === "All") {
      for (let i of items) {
        await upgradeItem(i, ctx);
      }

      let task = ctx.session.upgradeCronTask;
      if (!task) {
        ctx.session.upgradeCronTask = cron.schedule(
          `*/${TIMEOUT_UPGRADE} * * * *`,
          async () => {
            ctx.replyWithMarkdown(`Start upgrading ...`);
            for (let i of items) {
              await upgradeItem(i, ctx);
            }
            ctx.replyWithMarkdown(`finish upgrading ...`);
          }
        );
      }
    } else await upgradeItem(item, ctx);
  });
});

bot.launch();
