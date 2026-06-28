const { Telegraf } = require("telegraf");
const { registerCommands } = require("./commands");

const bot = new Telegraf(process.env.BOT_TOKEN);

registerCommands(bot);

function startBot() {
  bot.launch();
  console.log("Bot started");
}

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

module.exports = { bot, startBot };
