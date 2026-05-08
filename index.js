const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const axios = require('axios')
const yts = require('yt-search')
const pino = require('pino')
const os = require('os')

// --- Configuration ---
const OWNER_NAME = "KING DULA BOT"; 
const PHONE_NUMBER = "94787535242"; 
const BASE_API = "https://api.giftedtech.my.id/api"; 
const API_KEY = "gifted"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["KING DULA BOT", "Chrome", "3.0"] 
    })

    // --- Pairing Code Logic ---
    if (!sock.authState.creds.registered) {
        console.log("🚀 KING DULA BOT: Connecting to WhatsApp...");
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(PHONE_NUMBER.replace('+', ''));
                console.log(`\n👉 YOUR LOGIN CODE: ${code}\n`);
            } catch (err) { console.log("❌ Error fetching code"); }
        }, 8000); 
    }

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('✅ KING DULA BOT IS ONLINE!');
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return
        const chatID = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        const lowText = text.toLowerCase().trim();

        // Commands List
        const commands = ['.menu', '.alive', '.song', '.video', '.fb', '.ig', '.tk', '.ai', '.img', '.sticker', '.lyrics', '.removebg'];
        const isCommand = commands.some(cmd => lowText.startsWith(cmd));

        // --- 1. PREMIUM MENU ---
        if (!isCommand && lowText !== "") {
            const menu = `*╭━「 ⚡ KING DULA BOT ⚡ 」━╮*
*┃*
*┃  👤 OWNER: ${OWNER_NAME}*
*┃  🎨 DESIGN: Premium Suite*
*┃*
*┣━「 📥 DOWNLOAD CENTER 」━*
*┃* 💠 _.song_ <name>
*┃* 💠 _.video_ <name>
*┃* 💠 _.fb / .ig / .tk_ <link>
*┃*
*┣━「 🎨 CREATIVE TOOLS 」━*
*┃* 💠 _.sticker_ (Reply to Image)
*┃* 💠 _.removebg_ (Reply to Image)
*┃* 💠 _.img_ <creative prompt>
*┃*
*┣━「 🧠 ADVANCED AI 」━*
*┃* 💠 _.ai_ <any question>
*┃* 💠 _.lyrics_ <song name>
*┃*
*┣━「 ⚙️ SYSTEM 」━*
*┃* 💠 _.alive_ (Check Status)
*┃*
*╰━━━━━━━━━━━━━━━━━━━━╯*
*© 2026 WHITEDEVIL PRODUCTION*`;

            return await sock.sendMessage(chatID, { 
                text: menu,
                contextInfo: {
                    externalAdReply: {
                        title: "WHITEDEVIL-TM v5.0: ACTIVE",
                        body: "Graphic Design & Automation",
                        thumbnailUrl: "https://pollinations.ai/p/luxury_devil_emblem_white_gold_black_background",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });
        }

        try {
            // --- 2. COMMAND LOGIC ---

            // DOWNLOADS
            if (lowText.startsWith('.song') || lowText.startsWith('.video')) {
                const isVid = lowText.startsWith('.video');
                const v = (await yts(text.split(' ').slice(1).join(' '))).videos[0];
                const res = await axios.get(`${BASE_API}/download/yt${isVid ? 'mp4' : 'mp3'}?url=${v.url}&apikey=${API_KEY}`);
                await sock.sendMessage(chatID, { [isVid ? 'video' : 'audio']: { url: res.data.result.download_url }, caption: v.title }, { quoted: msg });
            }

            // STICKER
            if (lowText.startsWith('.sticker')) {
                const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMsg?.imageMessage) {
                    const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
                    let buffer = Buffer.from([]);
                    for await(const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    await sock.sendMessage(chatID, { sticker: buffer }, { quoted: msg });
                }
            }

            // REMOVE BACKGROUND (Professional for Designers)
            if (lowText.startsWith('.removebg')) {
                const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMsg?.imageMessage) {
                    await sock.sendMessage(chatID, { text: "⏳ Processing your image..." });
                    // Note: Here you'd normally upload to a BG removal API. Using a placeholder logic:
                    await sock.sendMessage(chatID, { text: "⚠️ Please link a Remove.bg API key for this feature to be fully automated." });
                }
            }

            // AI CHAT
            if (lowText.startsWith('.ai')) {
                const res = await axios.get(`${BASE_API}/ai/gpt?q=${encodeURIComponent(text.slice(4))}&apikey=${API_KEY}`);
                await sock.sendMessage(chatID, { text: `*🤖 WHITEDEVIL AI:* \n\n${res.data.result}` }, { quoted: msg });
            }

            // IMAGE GENERATION
            if (lowText.startsWith('.img')) {
                const imgUrl = `https://pollinations.ai/p/${encodeURIComponent(text.slice(5))}?width=1080&height=1080&seed=2026`;
                await sock.sendMessage(chatID, { image: { url: imgUrl }, caption: `🎨 *Masterpiece by KING DULA BOT*` }, { quoted: msg });
            }

            // ALIVE
            if (lowText === '.alive') {
                const aliveBody = `*KING DULA BOT: STATUS REPORT* 🛡️\n\n*🚀 Uptime:* ${(process.uptime() / 60).toFixed(1)}m\n*📟 RAM:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB\n*👤 Lead:* KING DULA\n\n*Status: Online & Optimized*`;
                await sock.sendMessage(chatID, { 
                    text: aliveBody,
                    contextInfo: {
                        externalAdReply: {
                            title: "KING DULA BOT: ALL SYSTEMS GO",
                            thumbnailUrl: "https://pollinations.ai/p/neon_devil_mask_design_4k",
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: msg });
            }

        } catch (e) {
            console.error(e);
        }
    })
}

startBot();
