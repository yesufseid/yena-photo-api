const { Telegraf } = require("telegraf");
const { registerCommands } = require("./commands");
const pool = require("../db");

const bot = new Telegraf(process.env.BOT_TOKEN);

registerCommands(bot);

async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id BIGINT NOT NULL REFERENCES users(telegram_id),
        telegram_file_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("user_photos table ready");
  } catch (e) {
    console.error("Failed to create user_photos table:", e.message);
  }
}

function startBot() {
  ensureTables().then(() => {
    bot.launch();
    console.log("Bot started");
  });
}

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

module.exports = { bot, startBot };
