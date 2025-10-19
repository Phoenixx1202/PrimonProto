const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
var socketAberto = false; // Variável para rastrear se o socket foi aberto
var chat_count = 0;
try { fs.rmSync('./session', { recursive: true, force: true }); } catch {}
try { fs.rmSync('./.started', { recursive: true, force: true }); } catch {}
var contagemRegressiva = Math.max(150, chat_count * 5); // O nome da variável também foi traduzido para manter a coerência interna do JS.

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


const rl = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

console.clear();
rl.question("Fazer login com código QR (1) ou Número de Telefone (2)\n\n⚠️ O login com número de telefone não é recomendado! :: ", async (resposta) => {
  console.clear();
  rl.question("Existe algum outro dispositivo conectado no WhatsApp? (s/n)\n\n >> ", async (resposta2) => {
    console.clear();
    if (resposta2.toLowerCase() == "s") {
      console.clear();
      console.log("Por favor, desconecte de todos os dispositivos antes de fazer login.");
      process.exit(1);
    } else if (resposta2.toLowerCase() == "n") {
      console.clear();
      if (resposta == "2") {
        rl.question("Digite seu número de telefone. Exemplo: 5511987654321\n\n >> ", async (numero) => {
          await loginWithPhone(numero);
        });
      } else if (resposta == "1") {
        genQR(true);
      } else {
        console.log("Opção inválida. Reinicie o script.");
        process.exit(1);
      }
    } else {
      console.log("Resposta inválida. Por favor, responda 's' ou 'n'.");
      process.exit(1);
    }
  });
  
});

async function genQR(qr) {
  let { version } = await fetchLatestBaileysVersion();
  let { state, saveCreds } = await useMultiFileAuthState('./session/');
  let sock = makeWASocket({
    logger,
    auth: state,
    version: version,
    getMessage: async (key) => {},
  });
  if (!qr && !sock.authState.creds.registered) {
    console.log("Você deve usar o código QR para fazer login.");
    process.exit(1);
  }
  
  sock.ev.on('connection.update', async (update) => {
    let { connection, qr: qrCode } = update;
    if (qrCode) {
      qrcode.generate(qrCode, { small: true });
    }
    if (connection === "connecting") {
      console.log("Conectando ao WhatsApp... Por favor, aguarde.");
    } else if (connection === 'open') {
      await delay(3000);
      console.clear();
      if (socketAberto == false) {
        socketAberto = true;
        try {
          const chats = await sock.groupFetchAllParticipating();
          chat_count = Object.keys(chats).length
        } catch {}
      }
      contagemRegressiva = Math.max(150, chat_count * 3.1);
      fs.writeFileSync('.started', '1');
    } else if (connection === 'close') {
      console.log("Conexão encerrada. Tentando reconectar...")
      await genQR(qr);
    }
  });
  sock.ev.on('creds.update', saveCreds);
}

async function loginWithPhone(phoneNumber) {
  let { version } = await fetchLatestBaileysVersion();
  let { state, saveCreds } = await useMultiFileAuthState('./session/');
  let sock = makeWASocket({
    logger,
    auth: state,
    version: version,
    getMessage: async (key) => {},
  });

  try {
    sock.ev.on('connection.update', async (update) => {
      let { connection } = update;
      if (connection === 'open') {
        console.log('Login realizado com sucesso!');
        await delay(3000);
        socketAberto = true;
        try {
          const chats = await sock.groupFetchAllParticipating();
          chat_count = Object.keys(chats).length
        } catch {}
        contagemRegressiva = Math.max(150, chat_count * 3.1);
        fs.writeFileSync('.started', '1');
      } else if (connection === 'close') {
        await loginWithPhone(phoneNumber);
      } else if (!connection && !sock.authState.creds.registered) {
        var pairingCode = await sock.requestPairingCode(phoneNumber);
        pairingCode = pairingCode.slice(0, 4) + "-" + pairingCode.slice(4);

        console.log(`Seu código de pareamento do WhatsApp: ${pairingCode}`);
        console.log('Insira este código no seu aplicativo WhatsApp em "Aparelhos Conectados".');
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.error('Falha no Login:', err);
    process.exit(1);
  }
}

setInterval(async () => {
  if (socketAberto == false || chat_count <= 0) {
    return;
  }
  if (!fs.existsSync('.started')) {
    return;
  }
  console.clear();
  console.log(`O bot está sincronizando mensagens... (${(contagemRegressiva / 10).toFixed(2)}s restantes. Conversas :: ${chat_count})`);
  contagemRegressiva--;
  
  if (contagemRegressiva < 0) {
    console.clear();
    console.log("Execute `pm2 start main.js` para iniciar o bot.");
    process.exit(1);
  }

}, 100);
