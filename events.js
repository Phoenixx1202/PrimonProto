var database = require("./database.json");
var PREFIX = database.handlers;
var fs = require("fs");
var commands = [];
const axios = require("axios");

/**
 * Monitora o arquivo database.json em busca de mudanças e atualiza o estado global de acordo.
 * Esta função é responsável por monitorar o arquivo database.json para quaisquer alterações
 * e, em seguida, atualizar as variáveis de estado globais como `handlers`, `commands` e `database`
 * para refletir essas mudanças. Também tenta recarregar os módulos no diretório `./modules`.
 */
function watchDatabase() {
  try {
    fs.watch("./database.json", function (event, filename) {
      try { delete require.cache[require.resolve("./database.json")]; } catch {}
      try { database = require("./database.json"); } catch {}
      try { PREFIX = database.handlers; } catch {}
      try { global.handlers = PREFIX; } catch {}
      try { global.commands = commands; } catch {}
      try { global.database = database; } catch {}
      commands = [];
      try { global.loadModules(__dirname + "/modules", false, true); } catch {}
    });
  } catch {
    // Em caso de erro, tenta reiniciar a função de monitoramento
    return watchDatabase()
  }
}
watchDatabase()
  
/**
 * Adiciona um novo comando à lista de comandos.
 *
 * @param {Object} commandInfo - As informações sobre o comando a ser adicionado.
 * @param {Function} callback - A função de callback a ser executada quando o comando for invocado.
 */
function addCommand(commandInfo, callback) {
  commands.push({ commandInfo, callback });
}

 
/**
 * Processa uma mensagem para determinar se ela corresponde a algum padrão de comando registrado
 * e executa o callback correspondente se uma correspondência for encontrada. A função primeiro
 * verifica se a mensagem começa com um prefixo válido e depois verifica se ela
 * corresponde a algum padrão de comando. Ela lida com verificações de permissão para comandos
 * com base no nível de acesso do usuário e no modo de operação do bot (ex: privado, grupo).
 * Se o comando estiver associado a um plugin, garante que o plugin esteja instalado
 * e atualizado antes de executar o callback.
 *
 * @param {object} msg - O objeto de mensagem recebido do socket do WhatsApp.
 * @param {object} sock - A conexão socket do WhatsApp.
 * @param {object} rawMessage - O objeto de mensagem bruta (raw).
 * @returns {Promise<void>} - Uma promessa que resolve quando o comando for processado.
 */

async function start_command(msg, sock, rawMessage) {
  const text =
    msg?.message?.conversation || msg?.message?.extendedTextMessage?.text;
  
  let matchedPrefix = false;
  let validText = text;
  
  // 1. Verifica se o texto começa com um dos prefixos
  for (const prefix of PREFIX) {
    if (text?.trimStart().startsWith(prefix)) {
      matchedPrefix = true;
      validText = text.slice(prefix.length).trim();
      break;
    }
  }
  
  let isCommand = false;
  // Ordena comandos pela extensão do padrão (útil para padrões mais específicos)
  var sortedCommands = commands.sort((a, b) => b.commandInfo.pattern.length - a.commandInfo.pattern.length);
  // 2. Verifica se a mensagem é um comando para evitar a execução de 'onMessage' antes de comandos
  for (const { commandInfo } of sortedCommands) {
    if (validText?.match(new RegExp(commandInfo.pattern, "im"))) {
      isCommand = true;
      break;
    }
  }
  
  // 3. Se não for um comando (não tem prefixo + padrão), executa 'onMessage' e retorna
  if (!isCommand) {
    for (const { commandInfo, callback } of commands) {
      if (commandInfo.pattern === "onMessage" && commandInfo.fromMe !== msg.key.fromMe) {
        msg.text = text ? text : "";
        await callback(msg, null, sock, rawMessage);
      }
    }
    return;
  }
  
  // 4. Processa o comando se for um comando válido
  for (const { commandInfo, callback } of sortedCommands) {
    const match = validText?.match(new RegExp(commandInfo.pattern, "im"));
    if (match && matchedPrefix) {
      const groupCheck = msg.key.remoteJid.endsWith('@g.us');
      let userId = groupCheck ? msg.key.participant : msg.key.remoteJid;
      let permission = false;
      
      // Verifica permissão (se é o bot ou um sudo)
      if (msg.key.fromMe) permission = true;
      else {
        for (var i of database.sudo) {
          if (i+"@s.whatsapp.net" == userId) {
            permission = true
            break;
          }
        }
      }
      
      // Checa condições de acesso
      if (!commandInfo.access && commandInfo.fromMe !== msg.key.fromMe) return; // Se fromMe é diferente e access é false, retorna
      if (!permission && database.worktype === "private") return; // Se worktype é 'private' e não tem permissão sudo, retorna
      if (commandInfo.access === "sudo" && !permission) return; // Se requer sudo e não tem permissão, retorna
      if (commandInfo.notAvaliablePersonelChat && msg.key.remoteJid === sock.user.id.split(':')[0] + "@s.whatsapp.net") return; // Se não disponível no chat pessoal, retorna
      if (commandInfo.onlyInGroups && !groupCheck) return; // Se é apenas para grupos e não está em um, retorna
        
      // Lógica para instalar plugins ausentes
      if (commandInfo.pluginId && (global.database.plugins.findIndex(plugin => plugin.id === commandInfo.pluginId) === -1)) {
        global.loadModules(__dirname + "/modules", false, true);
        var getExitingPluginData = await axios.get("https://create.thena.workers.dev/pluginMarket?id=" + commandInfo.pluginId);
        getExitingPluginData = getExitingPluginData.data;
        global.database.plugins.push({
          name: getExitingPluginData.pluginName,
          version: commandInfo.pluginVersion,
          description: getExitingPluginData.description,
          author: getExitingPluginData.author,
          id: getExitingPluginData.pluginId,
          path: "./modules/" + getExitingPluginData.pluginFileName
        });
      }

      // Lógica para verificar e aplicar atualização de plugins
      if (commandInfo.pluginVersion && commandInfo.pluginId) {
        var getPluginUpdate = await axios.get("https://create.thena.workers.dev/pluginMarket");
        getPluginUpdate = getPluginUpdate.data;
        getPluginUpdate = getPluginUpdate.find(plugin => plugin.pluginId === commandInfo.pluginId);
        if (!getPluginUpdate) {
          return; // Não executa se o plugin não for encontrado no market.
        }
        getPluginUpdate = { data: getPluginUpdate };
        
        // Se a versão do plugin for diferente da versão no market, atualiza
        if (getPluginUpdate.data.pluginVersion !== commandInfo.pluginVersion) {
          const editedPl = {
            name: getPluginUpdate.data.pluginName,
            version: getPluginUpdate.data.pluginVersion,
            description: getPluginUpdate.data.description,
            author: getPluginUpdate.data.author,
            id: getPluginUpdate.data.pluginId,
            path: "./modules/" + getPluginUpdate.data.pluginFileName
          }
          // Atualiza o registro no banco de dados e salva o novo arquivo
          global.database.plugins[global.database.plugins.findIndex(plugin => plugin.id === commandInfo.pluginId)] = editedPl;
          fs.writeFileSync("./modules/" + getPluginUpdate.data.pluginFileName, getPluginUpdate.data.context);
          global.loadModules(__dirname + "/modules", false, true);
          
          // Notifica o usuário sobre a atualização
          const updateMessage = `_🆕 Plugin ${getPluginUpdate.data.pluginName} atualizado para a versão ${getPluginUpdate.data.pluginVersion}._\n\n_Por favor, tente novamente._`;
          if (msg.key.fromMe) {
            await sock.sendMessage(msg.key.remoteJid, { text: updateMessage, edit: msg.key });
          } else {
            await sock.sendMessage(msg.key.remoteJid, { text: updateMessage }, { quoted: rawMessage.messages[0]});
          }
          return;
        }
      }
      
      // Executa o callback do comando
      await callback(msg, match, sock, rawMessage);
      return;
    }
  }
}
  
global.addCommand = addCommand;
global.start_command = start_command;
global.commands = commands;
global.handlers = PREFIX;
global.database = database;
