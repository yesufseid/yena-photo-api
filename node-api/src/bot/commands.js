const svc = require("./services");
const pool = require("../db");

const states = new Map();

function setState(chatId, step, data = {}) {
  states.set(chatId, { step, data });
}

function getState(chatId) {
  return states.get(chatId);
}

function clearState(chatId) {
  states.delete(chatId);
}

function registerCommands(bot) {
  bot.start(async (ctx) => {
    await svc.getOrCreateUser(
      ctx.from.id,
      ctx.from.username,
      ctx.from.first_name
    );
    clearState(ctx.chat.id);

    const baseUrl = (process.env.FRONTEND_URL || process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
    const waUrl = baseUrl + "/" + ctx.from.id;

    const keyboard = {
      keyboard: [
        [{ text: "Open MiniWeb", web_app: { url: waUrl } }],
        [{ text: "Upload" }],
      ],
      resize_keyboard: true,
    };

    ctx.reply("Welcome! Choose an option below:", {
      reply_markup: keyboard,
    });
  });

  bot.hears("Upload", async (ctx) => {
    const user = await svc.getOrCreateUser(
      ctx.from.id,
      ctx.from.username,
      ctx.from.first_name
    );
    clearState(ctx.chat.id);
    setState(ctx.chat.id, "UPLOAD_PHOTO", { userId: user.telegram_id });
    ctx.reply("Send your photo here.");
  });

  bot.on("photo", async (ctx) => {
    const state = getState(ctx.chat.id);
    if (!state || state.step !== "UPLOAD_PHOTO") return;

    const photo = ctx.message.photo;
    const fileId = photo[photo.length - 1].file_id;

    try {
      await pool.query(
        `INSERT INTO user_photos (user_id, telegram_file_id) VALUES ($1, $2)`,
        [state.data.userId, fileId]
      );
      clearState(ctx.chat.id);
      ctx.reply("Photo saved! ✅");
    } catch (e) {
      console.error("Upload error:", e.message);
      ctx.reply("Failed to save photo. Try again.");
    }
  });
}

module.exports = { registerCommands };
