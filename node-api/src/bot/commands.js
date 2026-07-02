const svc = require("./services");

const states = new Map();
const callbackStore = new Map();
let cbCounter = 0;

function setState(chatId, step, data = {}) {
  states.set(chatId, { step, data });
}

function getState(chatId) {
  return states.get(chatId);
}

function clearState(chatId) {
  states.delete(chatId);
}

const webAppUrl = () => {
  const base = process.env.BASE_URL?.replace(/\/+$/, "");
  if (!base || !base.startsWith("https://")) return null;
  return base + "/app";
};

function registerCommands(bot) {
  bot.start(async (ctx) => {
    const text = ctx.message.text.trim();
    const parts = text.split(/\s+/);
    const refCode = parts[1];

    await svc.getOrCreateUser(
      ctx.from.id,
      ctx.from.username,
      ctx.from.first_name
    );
    clearState(ctx.chat.id);

    if (refCode) {
      const event = await svc.getEventByCode(refCode.toUpperCase());
      if (event) {
        setState(ctx.chat.id, "FIND_SELFIE", {
          userId: ctx.from.id,
          eventId: event.id,
          eventName: event.name,
        });
        return ctx.reply(
          `Welcome to "${event.name}". Send your selfie to find your photos.`
        );
      }
    }

    const waUrl = webAppUrl();
    const baseUrl = process.env.BASE_URL || "";
    const menuKeyboard = {
      keyboard: [
        [{ text: "/find"}, { text: "/myphotos" }],
        [{ text: "/new"}, { text: "/register" }],
        [{ text: "/updateface"}, { text: "/menu" }],
      ],
      resize_keyboard: true,
    };

    const welcomeMsg =
      "Welcome to Yena Photo Bot! 📸\n\n" +
      "I find your photos from events using face recognition.\n\n" +
      "Tap a button below or type a command:\n" +
      "/new - Create a new event and upload photos\n" +
      "/find [code] - Find your photos (with event code)\n" +
      "/register - Register your face for quick access\n" +
      "/myphotos - View all photos of you\n" +
      "/updateface - Update your registered face\n" +
      "/menu - Open Yena Photo";

    ctx.reply(welcomeMsg, { reply_markup: menuKeyboard });

    if (waUrl) {
      ctx.reply("🔍 Find your photos:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔍 Open Yena Photo", web_app: { url: waUrl } }],
          ],
        },
      });
    } else if (baseUrl) {
      ctx.reply("🔍 Find your photos:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔍 Open Yena Photo", url: baseUrl}],
          ],
        },
      });
    }
  });

  bot.command("menu", async (ctx) => {
    const waUrl = webAppUrl();

    if (waUrl) {
      return ctx.reply("🔍 Find your photos:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔍 Open Yena Photo", web_app: { url: waUrl } }],
          ],
        },
      });
    }
    ctx.reply(
      "❌ BASE_URL environment variable is not configured or must use HTTPS for Mini App."
    );
  });

  bot.command("new", async (ctx) => {
    const user = await svc.getOrCreateUser(
      ctx.from.id,
      ctx.from.username,
      ctx.from.first_name
    );
    clearState(ctx.chat.id);
    setState(ctx.chat.id, "NEW_NAME", { userId: user.telegram_id });
    ctx.reply("What is the event name?");
  });

  bot.command("find", async (ctx) => {
    await svc.getOrCreateUser(
      ctx.from.id,
      ctx.from.username,
      ctx.from.first_name
    );
    const text = ctx.message.text.trim();
    const parts = text.split(/\s+/);
    const code = parts[1];

    if (code) {
      const event = await svc.getEventByCode(code.toUpperCase());
      if (!event) {
        return ctx.reply("Event not found. Check the code and try again.");
      }
      setState(ctx.chat.id, "FIND_SELFIE", {
        userId: ctx.from.id,
        eventId: event.id,
        eventName: event.name,
      });
      ctx.reply(`Searching in "${event.name}". Send your selfie.`);
    } else {
      setState(ctx.chat.id, "FIND_SELFIE", {
        userId: ctx.from.id,
        eventId: null,
        eventName: null,
      });
      ctx.reply("Send your selfie to search across all public events.");
    }
  });

  bot.command("register", async (ctx) => {
    const user = await svc.getOrCreateUser(
      ctx.from.id,
      ctx.from.username,
      ctx.from.first_name
    );
    clearState(ctx.chat.id);
    setState(ctx.chat.id, "REG_SELFIES", {
      userId: user.telegram_id,
      selfies: [],
    });
    ctx.reply(
      "Send me 2-3 clear selfies from different angles so I can recognize you."
    );
  });

  bot.command("updateface", async (ctx) => {
    clearState(ctx.chat.id);
    setState(ctx.chat.id, "REG_SELFIES", {
      userId: ctx.from.id,
      selfies: [],
    });
    ctx.reply(
      "Send me 2-3 clear selfies from different angles to update your face."
    );
  });

  bot.command("visibility", async (ctx) => {
    const text = ctx.message.text.trim();
    const parts = text.split(/\s+/);
    const code = parts[1];
    if (!code) return ctx.reply("Usage: /visibility EVENT_CODE");

    const event = await svc.getEventByCode(code.toUpperCase());
    if (!event) return ctx.reply("Event not found.");
    if (event.created_by !== ctx.from.id)
      return ctx.reply("Only the event creator can change visibility.");

    setState(ctx.chat.id, "SET_VISIBILITY", { eventId: event.id, eventName: event.name });
    ctx.reply(`Choose visibility for "${event.name}":`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Public", callback_data: `sv_public_${event.id}` },
            { text: "Private", callback_data: `sv_private_${event.id}` },
            { text: "Invite Only", callback_data: `sv_invite_${event.id}` },
          ],
        ],
      },
    });
  });

  bot.action(/sv_(.+)_(.+)/, async (ctx) => {
    const visibility = ctx.match[1];
    const eventId = ctx.match[2];
    const pool = require("../db");
    await pool.query(`UPDATE events SET visibility = $1 WHERE id = $2`, [visibility, eventId]);
    clearState(ctx.chat.id);
    await ctx.answerCbQuery(`Visibility changed to ${visibility}`);
    await ctx.reply(`Event visibility updated to ${visibility}.`);
  });

  bot.command("myphotos", async (ctx) => {
    const user = await svc.getOrCreateUser(
      ctx.from.id,
      ctx.from.username,
      ctx.from.first_name
    );

    if (user.registered_face) {
      const results = await svc.searchByRegisteredFace(user.telegram_id, 100);
      if (!results || !results.length) {
        return ctx.reply("No photos found.");
      }
      await showMyPhotos(ctx, user.telegram_id, results);
    } else {
      clearState(ctx.chat.id);
      setState(ctx.chat.id, "MYPHOTOS_SELFIE", { userId: user.telegram_id });
      ctx.reply("Send your selfie so I can find your photos.");
    }
  });

  bot.on("photo", async (ctx) => {
    const state = getState(ctx.chat.id);
    if (!state) return;

    const photo = ctx.message.photo;
    const fileId = photo[photo.length - 1].file_id;

    if (state.step === "NEW_NAME") {
      return;
    }

    if (state.step === "NEW_PHOTOS") {
      state.data.fileIds.push(fileId);
      const count = state.data.fileIds.length;
      if (count % 10 === 0) {
        await ctx.reply(
          `Received ${count} photos. Keep sending or type "done" when finished.`
        );
      } else {
        await ctx.react("👍");
      }
      return;
    }

    if (state.step === "REG_SELFIES") {
      state.data.selfies.push(fileId);
      if (state.data.selfies.length >= 3) {
        await ctx.reply("Processing your face...");
        await processRegistration(ctx, state.data);
      } else {
        ctx.reply(
          `Got ${state.data.selfies.length}/3. Send more or type "done".`
        );
      }
      return;
    }

    if (state.step === "FIND_SELFIE" || state.step === "MYPHOTOS_SELFIE") {
      await ctx.reply("Searching...");
      await processSearch(ctx, state.data, fileId);
      return;
    }
  });

  bot.on("text", async (ctx) => {
    const state = getState(ctx.chat.id);
    if (!state) return;

    const text = ctx.message.text.trim().toLowerCase();

    if (state.step === "NEW_NAME") {
      if (text === "cancel") {
        clearState(ctx.chat.id);
        return ctx.reply("Cancelled.");
      }
      state.data.eventName = ctx.message.text;
      state.data.fileIds = [];
      state.step = "NEW_VISIBILITY";
      return ctx.reply(
        `Choose visibility for "${state.data.eventName}":`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Public", callback_data: "vis_public" },
                { text: "Private", callback_data: "vis_private" },
                { text: "Invite Only", callback_data: "vis_invite" },
              ],
            ],
          },
        }
      );
    }

    if (state.step === "NEW_PHOTOS") {
      if (text === "done" || text === "/done") {
        state.step = "PROCESSING";
        const count = state.data.fileIds.length;
        await ctx.reply(`Processing ${count} photos...`);
        await processEvent(ctx, state.data);
        return;
      }
      if (text === "cancel") {
        clearState(ctx.chat.id);
        return ctx.reply("Cancelled.");
      }
      return;
    }

    if (state.step === "REG_SELFIES") {
      if (text === "done" && state.data.selfies.length >= 1) {
        await ctx.reply("Processing your face...");
        await processRegistration(ctx, state.data);
        return;
      }
      if (text === "cancel") {
        clearState(ctx.chat.id);
        return ctx.reply("Cancelled.");
      }
      return;
    }
  });

  bot.action(/vis_(.+)/, async (ctx) => {
    const state = getState(ctx.chat.id);
    if (!state || state.step !== "NEW_VISIBILITY") {
      return ctx.reply("Session expired. Try /new again.");
    }
    const visibility = ctx.match[1];
    state.data.visibility = visibility;
    state.step = "NEW_PHOTOS";
    await ctx.answerCbQuery(`Visibility set to ${visibility}`);
    await ctx.reply(
      `"${state.data.eventName}" (${visibility}). How do you want to upload photos?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📎 Upload in Chat", callback_data: "upload_chat" },
              { text: "🌐 Upload via Web", callback_data: "upload_web" },
            ],
          ],
        },
      }
    );
  });

  bot.action("upload_chat", async (ctx) => {
    const state = getState(ctx.chat.id);
    if (!state || state.step !== "NEW_PHOTOS") {
      return ctx.reply("Session expired. Try /new again.");
    }
    await ctx.answerCbQuery();
    await ctx.reply(
      `Send photos now. Type "done" when finished.`
    );
  });

  bot.action("upload_web", async (ctx) => {
    const state = getState(ctx.chat.id);
    if (!state || state.step !== "NEW_PHOTOS") {
      return ctx.reply("Session expired. Try /new again.");
    }
    await ctx.answerCbQuery();
    await ctx.reply("Creating event and preparing upload page...");

    try {
      const code = await svc.generateEventCode();
      const event = await svc.createEvent(
        state.data.eventName,
        code,
        state.data.userId,
        state.data.visibility || "public"
      );

      const { createSession } = require("../routes/upload");
      const token = createSession(ctx.chat.id, state.data.userId, event.id, state.data.eventName);

      const baseUrl = process.env.BASE_URL || "http://localhost:3001";
      const uploadUrl = `${baseUrl}/upload/${token}`;

      const botInfo = await ctx.telegram.getMe();
      const shareLink = `https://t.me/${botInfo.username}?start=${code}`;

      await ctx.reply(
        `🌐 Upload photos for "${state.data.eventName}"\n\n` +
        `Open the link below to upload multiple photos at once.\n` +
        `When you're done, you'll get a confirmation here.\n\n` +
        `Event Code: ${code}\nShare: ${shareLink}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🌐 Open Upload Page", url: uploadUrl }],
            ],
          },
        }
      );
    } catch (e) {
      console.error("Web upload setup error:", e);
      await ctx.reply("Something went wrong. Try /new again.");
    }

    clearState(ctx.chat.id);
  });

  bot.action(/cb_(.+)/, async (ctx) => {
    const token = ctx.match[1];
    const entry = callbackStore.get(token);
    if (!entry) {
      return ctx.reply("Session expired. Try /myphotos again.");
    }
    const { userId, results, eventId } = entry;
    const filtered = results.filter((r) => r.event_id === eventId);
    if (!filtered.length) {
      return ctx.reply("No photos found in this event.");
    }
    await ctx.answerCbQuery();
    await sendPhotoResults(ctx, filtered, userId);
  });

  bot.on("callback_query", async (ctx) => {
    await ctx.answerCbQuery();
  });

  bot.action(/deliver_(.+)/, async (ctx) => {
    const token = ctx.match[1];
    const { searchResults } = require("../services/search-store");
    const entry = searchResults.get(token);
    if (!entry || entry.delivered) {
      return ctx.reply("Results expired. Search again in the Mini App.");
    }

    entry.delivered = true;
    searchResults.delete(token);

    const { results } = entry;
    const total = results.length;

    await ctx.answerCbQuery(`Sending ${total} photos...`);
    await ctx.reply(`📸 Sending ${total} photos...`);

    let sent = 0;
    for (const photo of results.slice(0, 10)) {
      try {
        if (photo.telegram_file_id.startsWith("local::")) {
          const filename = photo.telegram_file_id.slice(7);
          const filepath = require("path").join(__dirname, "..", "..", "uploads", filename);
          await ctx.replyWithPhoto({ source: filepath });
        } else {
          await ctx.replyWithPhoto(photo.telegram_file_id);
        }
        sent++;
      } catch (e) {
        console.error("Failed to send photo:", e.message);
      }
    }

    if (total > 10) {
      await ctx.reply(`Showing ${sent} of ${total} photos.`);
    }

    const svc_ = require("./services");
    await svc_.markPhotosAsSeen(entry.telegramId, results.map((p) => p.id));
  });
}

async function processEvent(ctx, data) {
  const code = await svc.generateEventCode();
  const event = await svc.createEvent(data.eventName, code, data.userId, data.visibility || "public");

  let processed = 0;
  const newPhotoIds = [];
  for (const fileId of data.fileIds) {
    try {
      const result = await svc.processPhoto(fileId, event.id);
      processed++;
      if (result.photoId) newPhotoIds.push(result.photoId);
    } catch (e) {
      console.error(`Failed to process photo ${fileId}:`, e.message);
    }
  }

  svc.notifyRegisteredUsersOfNewPhotos(event.id, newPhotoIds).catch(e =>
    console.error("Notification error:", e)
  );

  clearState(ctx.chat.id);

  const botInfo = await ctx.telegram.getMe();
  const link = `https://t.me/${botInfo.username}?start=${code}`;

  await ctx.reply(
    `Event Ready! 🎉\n\n"${data.eventName}"\nPhotos: ${processed}\n\nShare this:\n\nEvent Code: ${code}\n${link}\n\nParticipants can use /find ${code} to find their photos.`
  );
}

async function processRegistration(ctx, data) {
  try {
    const embeddings = [];
    for (const fileId of data.selfies) {
      const buffer = await svc.downloadFromTelegram(fileId);
      const faceData = await svc.extractFaces(buffer);
      if (faceData.faces && faceData.faces.length > 0) {
        embeddings.push(faceData.faces[0].embedding);
      }
    }

    if (!embeddings.length) {
      clearState(ctx.chat.id);
      return ctx.reply("No face detected. Try again with clearer photos.");
    }

    const avgEmbedding = averageEmbeddings(embeddings);
    await svc.registerFace(data.userId, avgEmbedding);
    clearState(ctx.chat.id);
    ctx.reply(
      "Face registered! Now you can use /myphotos without sending a selfie each time."
    );
  } catch (e) {
    console.error("Registration error:", e);
    clearState(ctx.chat.id);
    ctx.reply("Something went wrong. Try again.");
  }
}

async function processSearch(ctx, data, fileId) {
  try {
    const buffer = await svc.downloadFromTelegram(fileId);
    const faceData = await svc.extractFaces(buffer);
    if (!faceData.faces || !faceData.faces.length) {
      return ctx.reply("No face detected. Try a clearer selfie.");
    }
    const embedding = faceData.faces[0].embedding;
    const results = await svc.searchPhotos(embedding, data.eventId, 20);
    clearState(ctx.chat.id);

    if (!results.length) {
      return ctx.reply("No matching photos found.");
    }

    await svc.markPhotosAsSeen(data.userId, results.map((p) => p.id));
    await sendPhotoResults(ctx, results, data.userId);
  } catch (e) {
    console.error("Search error:", e);
    clearState(ctx.chat.id);
    ctx.reply("Something went wrong. Try again.");
  }
}

async function showMyPhotos(ctx, userId, results) {
  const grouped = {};
  for (const r of results) {
    if (!grouped[r.event_id]) {
      grouped[r.event_id] = { name: "", photos: [] };
    }
    grouped[r.event_id].photos.push(r);
  }

  const pool = require("../db");
  const eventIds = Object.keys(grouped);
  const eventNames = await pool.query(
    `SELECT id, name FROM events WHERE id = ANY($1)`,
    [eventIds]
  );
  for (const e of eventNames.rows) {
    if (grouped[e.id]) grouped[e.id].name = e.name;
  }

  let msg = "Your photos by event:\n\n";
  const buttons = [];
  for (const [eid, g] of Object.entries(grouped)) {
    const name = g.name || "Unknown";
    msg += `${name} (${g.photos.length})\n`;
    const token = `cb_${++cbCounter}`;
    callbackStore.set(token, { userId, results, eventId: eid });
    buttons.push([
      {
        text: `${name} (${g.photos.length})`,
        callback_data: token,
      },
    ]);
  }

  await ctx.reply(msg, {
    reply_markup: { inline_keyboard: buttons },
  });
}

async function sendPhotoResults(ctx, results, userId) {
  const photoIds = results.map((p) => p.id);

  const pool = require("../db");
  const viewed = await pool.query(
    `SELECT photo_id FROM user_photo_views WHERE user_id = $1 AND photo_id = ANY($2::uuid[])`,
    [userId, photoIds]
  );
  const viewedSet = new Set(viewed.rows.map((v) => v.photo_id));
  const newPhotos = results.filter((p) => !viewedSet.has(p.id));

  if (newPhotos.length > 0) {
    await ctx.reply(`You have ${newPhotos.length} new photos!`);
  }

  for (const photo of results.slice(0, 10)) {
    try {
      await ctx.replyWithPhoto(photo.telegram_file_id);
    } catch (e) {
      console.error("Failed to send photo:", e.message);
    }
  }

  if (results.length > 10) {
    await ctx.reply(`Found ${results.length} photos. Showing 10.`);
  }

  await svc.markPhotosAsSeen(userId, photoIds);
}

function averageEmbeddings(embeddings) {
  const n = embeddings.length;
  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      avg[i] += emb[i] / n;
    }
  }
  return avg;
}

module.exports = { registerCommands };
