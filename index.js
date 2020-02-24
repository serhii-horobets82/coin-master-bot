const dotenv = require("dotenv");
dotenv.config();

const tg = require("telegraf");
const request = require("request");
const { Extra, Markup, session } = require("telegraf");

const bot = new tg(process.env.BOT_TOKEN);
bot.use(session());
const aboutMsg =
  "This bot was created by @gorserg\nSource code can be found at https://github.com/serhii-horobets82/coin-master-bot";

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

function logOutMsg(ctx, text) {
  console.log(">", { id: ctx.chat.id }, text);
}

const keyboard = Markup.inlineKeyboard([
  Markup.urlButton("❤️", "http://telegraf.js.org"),
  Markup.callbackButton("Delete", "delete")
]);

bot.action("delete", ({ deleteMessage }) => deleteMessage());

bot.command("about", ctx => {
  logMsg(ctx);
  logOutMsg(ctx, aboutMsg);
  ctx.reply(aboutMsg);
});

bot.command("/menu", ({ reply }) =>
  reply(
    "menu",
    Markup.keyboard(["🔑 Init", "💰 Balance", "🎲 Spin"])
      .oneTime()
      .resize()
      .extra()
  )
);

bot.hears(["/init", "🔑 Init"], ctx => {
  var options = {
    method: "POST",
    url: "https://vik-game.moonactive.net/api/v1/users/login",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CLIENT-VERSION": "3.5.49",
      Authorization: `Bearer ${process.env.DEVICE_TOKEN}`
    },
    form: {
      "Device[udid]": "f74fd7ea-303e-4569-a519-99a6ee1f8049",
      API_KEY: "viki",
      API_SECRET: "coin",
      "Device[change]": "20200220_3",
      locale: "en",
      "Device[os]": "Android",
      "Client[version]": "3.5_fband",
      "Device[version]": "5.1.1"
    }
  };
  request(options, function(error, response) {
    if (error) throw new Error(error);
    let { userId, sessionToken } = JSON.parse(response.body);
    ctx.session.sessionToken = sessionToken;
    ctx.session.userId = userId;
    ctx.reply(`${userId}`);
  });

  logMsg(ctx);
  logOutMsg(ctx, "init done");
});

bot.hears(["/balance", "💰 Balance"], ctx => {
  var options = {
    method: "POST",
    url: `https://vik-game.moonactive.net/api/v1/users/${ctx.session.userId}/balance`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CLIENT-VERSION": "3.5.49",
      Authorization: `Bearer ${ctx.session.sessionToken}`
    },
    form: {
      "Device[udid]": "f74fd7ea-303e-4569-a519-99a6ee1f8049",
      API_KEY: "viki",
      API_SECRET: "coin",
      "Device[change]": "20200223_4",
      fbToken: "",
      locale: "en",
      "Device[os]": "Android",
      "Client[version]": "3.5.49",
      extended: "true",
      segmented: "true"
    }
  };
  request(options, function(error, response) {
    if (error) throw new Error(error);
    const { coins, spins, seq } = JSON.parse(response.body);
    ctx.session.seq = seq;
    ctx.reply(`coins: ${coins}\nspins: ${spins}\nseq: ${seq}`);
  });
  logMsg(ctx);
});

bot.hears(["/spin", "🎲 Spin"], ctx => {
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
      seq: +ctx.session.seq + 1,
      auto_spin: "False",
      bet: "1",
      "Client[version]": "3.5.49_fband"
    }
  };
  request(options, function(error, response) {
    if (error) throw new Error(error);
    const { coins, spins, seq } = JSON.parse(response.body);
    ctx.session.seq = seq;
    ctx.reply(`coins: ${coins}\nspins: ${spins}\nseq: ${seq}`);
  });
  logMsg(ctx);
});

bot.launch();
