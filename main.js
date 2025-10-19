const Module = require('module');
const originalRequire = Module.prototype.require;
const execSync = require('child_process').execSync;
const fs = require('fs');

const installedPackages = new Set();
// Sobrescreve o 'require' para instalar pacotes automaticamente se não forem encontrados
Module.prototype.require = function (packageName) {
  try {
    return originalRequire.apply(this, arguments);
  } catch (err) {
    // Verifica se o erro é de módulo não encontrado e se não é um caminho relativo
    if (err.code === 'MODULE_NOT_FOUND' && !packageName.startsWith('.')) {
      if (!installedPackages.has(packageName)) {
        console.log(`O pacote ${packageName} não foi encontrado. Instalando...`);

        // Verifica se está rodando no Termux
        const isTermux = process?.env?.PREFIX === '/data/data/com.termux/files/usr';

        try {
          execSync(`npm install ${packageName}`, { stdio: 'ignore' });
          installedPackages.add(packageName);

          return originalRequire.apply(this, arguments);
        } catch (installError) {
          if (isTermux) {
            console.log('⚠️ Termux detectado. Pulando a instalação do módulo não suportado: ' + packageName + '. Algumas funcionalidades podem não funcionar.');
          } else {
            console.error(`Erro na instalação do pacote: ${installError.message}`);
          }
        }
      }
    }
    throw err;
  }
};

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const pino = require('pino');
require('./events');
var currentVersion = "", versionCheckInterval = 180
var sock;


setInterval(async () => {
  // Salva o banco de dados global a cada 5 segundos
  fs.writeFileSync("./database.json", JSON.stringify(global.database, null, 2));
  
  // Verifica a versão a cada 180 ciclos (aprox. 15 minutos)
  versionCheckInterval--
  if (versionCheckInterval <= 0) {
    var getLatestCommit = await axios.get("https://api.github.com/repos/phaticusthiccy/PrimonProto/commits")

    if (currentVersion == "") {
      currentVersion = getLatestCommit.data[0].sha
    } else {
      if (getLatestCommit.data[0].sha != currentVersion) {
        currentVersion = getLatestCommit.data[0].sha
        // Envia notificação de nova versão
        await sock.sendMessage(sock.user.id, { image: { url: "./src/new_version.png" }, caption: "*🆕 Nova Versão Disponível!*\n\n_Por favor, atualize seu bot via_ ```.update```" });
      }
    }
    versionCheckInterval = 180
  }
}, 5000);

/**
 * Configura o logger com as opções especificadas (definido como silencioso).
 */
const logger = pino({
  level: "silent",
  customLevels: {
    trace: 10000,
    debug: 10000,
    info: 10000,
    warn: 10000,
    error: 10000,
    fatal: 10000,
  },
});

async function Primon() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(__dirname + "/session/");

  sock = makeWASocket({
    logger,
    printQRInTerminal: true,
    markOnlineOnConnect: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    auth: state,
    version: version,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      // Tenta reconectar a menos que o erro seja 401 (desautorizado/QR não escaneado)
      const shouldReconnect = (lastDisconnect.error.output.statusCode !== 401);
      if (shouldReconnect) {
        console.log('Desconectado, reconectando...');
        Primon();
      } else {
        console.log('O código QR não foi escaneado ou a sessão expirou.');
      }
    } else if (connection === 'open') {
      console.log('A conexão está aberta.');
      const usrId = sock.user.id;
      const mappedId = usrId.split(':')[0] + `@s.whatsapp.net`;
      if (!global.similarity) global.similarity = await import('string-similarity-js');
      // Mensagem de online enviada para o bot
      await sock.sendMessage(mappedId, { text: "_Primon Online!_\n\n_Use_ ```" + global.handlers[0] + "menu``` _para ver a lista de comandos._" });;
    }
  });

  sock.ev.on("messages.upsert", async (msg) => {
    try {
      if (!msg.hasOwnProperty("messages") || msg.messages.length === 0) return;

      // Atualiza o nome de exibição (pushName) do usuário no banco de dados
      for (let {pushName, key} of msg.messages) {
        if (pushName) {
          const sender = key.participant ||(key.fromMe? sock.user.id.split(":")[0] + "@s.whatsapp.net": key.remoteJid);
          global.database.users[sender] = pushName;
        }
      }

      const rawMessage = structuredClone(msg);
      msg = msg.messages[0];
      const quotedMessage = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      msg.quotedMessage = quotedMessage;

      // Ignora mensagens de status e se a conversa estiver na blacklist
      if ((msg.key && msg.key.remoteJid === "status@broadcast")) return;
      if (global.database.blacklist.includes(msg.key.remoteJid) && !msg.key.fromMe) return;

      // Garante que o participant esteja sempre definido
      if (msg.key.participant == undefined) {
        if (msg.key.fromMe == false) {
          msg.key.participant = msg.key.remoteJid
        } else {
          msg.key.participant = sock.user.id.split(':')[0] + `@s.whatsapp.net`
        }
      }

      // Lógica de resposta AFK (Away From Keyboard)
      if (global.database.afkMessage.active && (!msg.key.fromMe && !global.database.sudo.includes(msg.key.participant.split('@')[0]))) {
        // Resposta AFK em conversas privadas (DM)
        if (msg.key.remoteJid.includes("@s.whatsapp.net")) {
          if (global.database.afkMessage.type == "text") {
            await sock.sendMessage(msg.key.remoteJid, { text: global.database.afkMessage.content });
          } else {
            var mediaPath = `./src/afk.${global.database.afkMessage.type}`;
            fs.writeFileSync(mediaPath, global.database.afkMessage.media, "base64");
            if (global.database.afkMessage.type == "video") {
              await sock.sendMessage(msg.key.remoteJid, { video: { url: mediaPath }, caption: global.database.afkMessage.content == "" ? undefined : global.database.afkMessage.content }, { quoted: rawMessage.messages[0] });
            } else {
              await sock.sendMessage(msg.key.remoteJid, { image: { url: mediaPath }, caption: global.database.afkMessage.content == "" ? undefined : global.database.afkMessage.content }, { quoted: rawMessage.messages[0] });
            }
            try { fs.unlinkSync(mediaPath) } catch {}
            return;
          }
        // Resposta AFK em grupos (apenas se for mencionado ou responder o bot)
        } else {
          // Se o bot foi marcado/mencionado
          if (rawMessage.messages[0]?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(sock.user.id.split(':')[0] + `@s.whatsapp.net`)) {
            if (global.database.afkMessage.type == "text") {
              await sock.sendMessage(msg.key.remoteJid, { text: global.database.afkMessage.content }, { quoted: rawMessage.messages[0] });
            } else {
              var mediaPath = `./src/afk.${global.database.afkMessage.type}`;
              fs.writeFileSync(mediaPath, global.database.afkMessage.media, "base64");
              if (global.database.afkMessage.type == "video") {
                await sock.sendMessage(msg.key.remoteJid, { video: { url: mediaPath }, caption: global.database.afkMessage.content == "" ? undefined : global.database.afkMessage.content }, { quoted: rawMessage.messages[0] });
              } else {
                await sock.sendMessage(msg.key.remoteJid, { image: { url: mediaPath }, caption: global.database.afkMessage.content == "" ? undefined : global.database.afkMessage.content }, { quoted: rawMessage.messages[0] });
              }
              try { fs.unlinkSync(mediaPath) } catch {}
              return;
            }
          }
          // Se a mensagem for uma resposta a uma mensagem do bot (enquanto AFK)
          if (rawMessage.messages[0]?.message?.extendedTextMessage?.contextInfo?.participant == sock.user.id.split(':')[0] + `@s.whatsapp.net`) {
            if (global.database.afkMessage.type == "text") {
              await sock.sendMessage(msg.key.remoteJid, { text: global.database.afkMessage.content });
            } else {
              var mediaPath = `./src/afk.${global.database.afkMessage.type}`;
              fs.writeFileSync(mediaPath, global.database.afkMessage.media, "base64");
              if (global.database.afkMessage.type == "video") {
                await sock.sendMessage(msg.key.remoteJid, { video: { url: mediaPath }, caption: global.database.afkMessage.content == "" ? undefined : global.database.afkMessage.content });
              } else {
                await sock.sendMessage(msg.key.remoteJid, { image: { url: mediaPath }, caption: global.database.afkMessage.content == "" ? undefined : global.database.afkMessage.content });
              }
              try { fs.unlinkSync(mediaPath) } catch {}
              return;
            }
          }
        }
        return;
      }

      // Inicia o processamento do comando
      await start_command(msg, sock, rawMessage);

    } catch (error) {
      console.log(error);
      // Envia a mensagem de erro para o número do bot (em caso de DM)
      await sock.sendMessage(sock.user.id, { text: `*⚠️ Erro do Primon:*\n${error}` });
    }
  });

  // Evento de atualização de participantes de grupo (adicionar/remover)
  sock.ev.on("group-participants.update", async (participant) => {
    if (global.database.blacklist.includes(participant.id)) return;
    
    // Lógica de boas-vindas
    if (participant.action === 'add') {
      const welcomeMessage = global.database.welcomeMessage.find(welcome => welcome.chat === participant.id);
      if (welcomeMessage) {
        const mediaPath = `./welcome.${welcomeMessage.type}`;
        if (['image', 'video'].includes(welcomeMessage.type)) {
          fs.writeFileSync(mediaPath, welcomeMessage.media, "base64");
          const messageOptions = {
            [welcomeMessage.type]: { url: mediaPath },
            caption: welcomeMessage.content || undefined,
            mentions: participant.participants
          };
          await sock.sendMessage(participant.id, messageOptions);
        } else {
          await sock.sendMessage(participant.id, { text: welcomeMessage.content, mentions: participant.participants });
        }
      }
    // Lógica de despedida
    } else if (participant.action === 'remove') {
      const goodbyeMessage = global.database.goodbyeMessage.find(goodbye => goodbye.chat === participant.id);
      if (goodbyeMessage) {
        const mediaPath = `./goodbye.${goodbyeMessage.type}`;
        if (['image', 'video'].includes(goodbyeMessage.type)) {
          fs.writeFileSync(mediaPath, goodbyeMessage.media, "base64");
          const messageOptions = {
            [goodbyeMessage.type]: { url: mediaPath },
            caption: goodbyeMessage.content || undefined,
            mentions: participant.participants
          };
          await sock.sendMessage(participant.id, messageOptions);
        } else {
          await sock.sendMessage(participant.id, { text: goodbyeMessage.content, mentions: participant.participants });
        }
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  loadModules(__dirname + "/modules");
}

/**
 * Carrega e executa todos os módulos JavaScript do caminho de diretório especificado.
 *
 * @param {string} modulePath - O caminho do diretório onde os módulos estão localizados.
 * @param {boolean} logger - Se deve registrar o carregamento no console (padrão: true).
 * @param {boolean} refresh - Se deve recarregar os módulos (padrão: false).
 */
function loadModules(modulePath, logger = true, refresh = false) {
  fs.readdirSync(modulePath).forEach((file) => {
    if (file.endsWith(".js")) {
      if (refresh) {
        delete require.cache[require.resolve(`${modulePath}/${file}`)];
        logger ? console.log(`Recarregando plugin: ${file}`) : null;
        require(`${modulePath}/${file}`);
      } else {
        logger ? console.log(`Carregando plugin: ${file}`) : null;
      }
    }
  });
}
global.loadModules = loadModules;
Primon();

/**
 * Baixa mídia de uma mensagem do WhatsApp e a salva no caminho de arquivo especificado.
 *
 * @param {Object} message - O objeto de mensagem do WhatsApp contendo a mídia.
 * @param {string} type - O tipo da mídia (ex: "image", "video", "document").
 * @param {string} filepath - O caminho do arquivo para salvar a mídia baixada.
 * @returns {Promise<void>} - Uma Promise que resolve quando a mídia for baixada e salva.
 */
global.downloadMedia = async (message, type, filepath) => {
  const stream = await downloadContentFromMessage(
    {
      url: message.url,
      directPath: message.directPath,
      mediaKey: message.mediaKey,
    },
    type
  );

  const writeStream = fs.createWriteStream(filepath);
  const { pipeline } = require("stream/promises");
  await pipeline(stream, writeStream);
};
/**
 * Verifica se o número é um administrador no grupo.
 *
 * @param {Object} msg - O objeto da mensagem.
 * @param {Object} sock - O objeto socket do WhatsApp.
 * @param {string} groupId - O ID do grupo a ser verificado.
 * @param {string|boolean} number - Número opcional. Se for 'false', o próprio número do bot é usado.
 * @returns {Promise<boolean>} - Retorna 'true' se o número for um administrador, caso contrário, 'false'.
 */

global.checkAdmin = async function (msg, sock, groupId, number = false) {
  try {
    const groupMetadata = await sock.groupMetadata(groupId);
    let Number = number ? number : sock.user.id.split(":")[0] + "@s.whatsapp.net";
    return groupMetadata.participants.some(participant =>
      participant.id === Number && participant.admin
    );
  } catch (error) {
    console.error("Ocorreu um erro ao verificar o status de administrador: ", error);
    return false;
  }
};

/**
 * Obtém a lista de administradores de um grupo.
 *
 * @param {string} groupId - O ID do grupo.
 * @returns {Promise<string[]>} - Uma Promise que resolve para um array de JIDs dos administradores.
 */
global.getAdmins = async function (groupId) {
  try {
    const groupMetadata = await sock.groupMetadata(groupId);
    const admins = groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
    return admins
  } catch (error) {
    console.error("Ocorreu um erro ao obter a lista de administradores: ", error);
    return [];
  }
};
/**
 * Baixa o conteúdo do URL fornecido como um arraybuffer.
 *
 * @param {string} url - O URL para baixar.
 * @returns {Promise<ArrayBuffer>} - Uma Promise que resolve para o arraybuffer, ou uma string vazia se o download falhar.
 */
global.downloadarraybuffer = async function (url) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return response.data;
  } catch (error) {
    return ""
  }
}

// Define o socket globalmente (getter/setter)
Object.defineProperty(global, "sock", {
  get: function () {
    return sock;
  },
  set: function (newSock) {
    sock = newSock;
  },
  configurable: true
});
