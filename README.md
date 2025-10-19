# PrimonProto - Bot de WhatsApp

PrimonProto é um bot de WhatsApp versátil, construído com Node.js e a biblioteca Baileys. Ele oferece uma gama de funcionalidades para automação e gerenciamento aprimorado de grupos, tornando sua experiência no WhatsApp mais eficiente e agradável.

## Funcionalidades

### Mídia e Entretenimento:

* **Downloader do Instagram:** Baixa fotos e vídeos a partir de links do Instagram.
* **Downloader do TikTok:** Baixa vídeos do TikTok com um comando simples.
* **Downloader do YouTube:** Baixa vídeos e músicas do YouTube em alta qualidade.
* **Busca de Letras:** Obtém rapidamente letras de músicas usando a API Genius.
* **Criador de Figurinhas (Sticker Creator):** Converte imagens e figurinhas para diferentes formatos.
* **Visualizador de Mensagens de Visualização Única (View Once):** Revela e baixa mensagens de "visualização única".

### Administração de Grupo:

* **Silenciar/Dessilenciar Grupo:** Controla a atividade do chat do grupo silenciando e dessilenciando.
* **Banir/Adicionar Membros:** Adiciona e remove usuários dos seus grupos facilmente.
* **Promover/Rebaixar Administradores:** Gerencia os administradores do grupo de forma eficiente.
* **Tag All/Admins:** Marca rapidamente todos os membros ou apenas os administradores em um grupo.
* **Silenciamento Global:** Silencia usuários específicos em todos os grupos em que o bot está presente.

### Automação e Utilidades:

* **Filtros Personalizados:** Cria respostas automáticas para palavras-chave ou expressões regulares específicas.
* **Verificação de Status (Alive Check):** Confirma se o bot está online e responsivo.
* **Tipo de Trabalho (Público/Privado):** Configura o bot para responder a todos os usuários ou apenas a usuários autorizados.
* **Usuários Sudo:** Concede permissões elevadas a usuários específicos.
* **Lista Negra (Blacklist):** Bloqueia grupos específicos de usar o bot.
* **Menu:** Visualiza os comandos disponíveis e seus usos.
* **Editar Configurações:** Personaliza as mensagens de boas-vindas, despedida e status diretamente dentro do WhatsApp.
* **Auto-Atualizador:** Mantém o bot atualizado com as últimas funcionalidades e melhorias.


## Instalação

Estas instruções assumem que você tem o Node.js (versão 16 ou superior) e npm (ou yarn) instalados.

1. **Clone o repositório:**

    ```bash
    git clone https://github.com/Phoenixx1202/PrimonProto.git
    cd PrimonProto
    ```

2. **Instale as dependências:**

    ```bash
    npm install
    ```

3. **Gere o Código QR e Autentique:**

    ```bash
    node qr.js
    ```

    Siga as instruções na tela para escanear o código QR com sua conta do WhatsApp. Este passo é necessário apenas para a configuração inicial.

4. **Inicie o bot:**

    ```bash
    pm2 start main.js
    ```

    Isso fará com que o bot seja executado em segundo plano usando o pm2.

## Comandos de Gerenciamento (Usando PM2)

* **Visualizar Logs:** ``pm2 logs`` (Útil para depuração)
* **Encerrar (Parada Forçada):** ``pm2 kill``

## Uso

O PrimonProto utiliza *handlers* (prefixos) para acionar comandos. Os *handlers* padrão são ".", "/", e "!". Você pode customizá-los no arquivo ``database.json``. Por exemplo, para usar o comando ``!alive``, envie ``!alive`` em um chat do WhatsApp onde o bot estiver presente.

**Lista de Comandos:** Use ``!menu`` (ou seu *handler* escolhido + "menu") para ver uma lista completa dos comandos disponíveis e suas descrições dentro do WhatsApp. Você também pode usar ``!menu <comando>`` para obter ajuda específica para um único comando.

**Todos os Comandos:**

### Mídia e Entretenimento:

* ``!insta <url_instagram>`` - Baixa mídia do Instagram.
* ``!tiktok <url_tiktok>`` - Baixa vídeos do TikTok.
* ``!video <busca ou url>`` - Baixa vídeos do YouTube.
* ``!music <busca ou url>`` - Baixa músicas do YouTube.
* ``!lyrics <nome da música>`` - Busca letras de músicas.
* ``!sticker`` (responda a uma imagem ou figurinha) - Converte imagens para figurinhas ou figurinhas para imagens.
* ``!show`` (responda a uma mensagem de visualização única) - Revela mensagens de visualização única.

### Administração de Grupo:

* ``!add <número>`` - Adiciona um usuário ao grupo.
* ``!ban <número ou resposta>`` - Remove um usuário do grupo.
* ``!promote <número ou resposta>`` - Promove um usuário a administrador.
* ``!demote <número ou resposta>`` - Rebaixa um usuário de administrador.
* ``!mute <duração(opcional)>`` - Silencia o grupo. Forneça a duração como ``!mute 1h`` para 1 hora.
* ``!unmute`` - Dessilencia o grupo.
* ``!tagall <mensagem(opcional)>`` - Marca todos os membros do grupo. Se fornecer uma mensagem, ela será incluída após as marcações.
* ``!tagadmin <mensagem(opcional)>`` - Marca todos os administradores do grupo. Se fornecer uma mensagem, ela será incluída após as marcações.
* ``!gmute`` (responda a um usuário) - Silencia globalmente um usuário em todos os grupos onde o bot está presente.
* ``!ungmute`` (responda a um usuário) - Dessilencia globalmente um usuário.

### Automação e Utilidades:

* ``!filter add <mensagem de entrada> <mensagem de saída>`` - Adiciona um novo filtro.
* ``!filter delete <mensagem de entrada>`` - Exclui um filtro.
* ``!filter`` - Lista todos os filtros no chat atual.
* ``!filter <on|off>`` - Ativa ou desativa filtros no chat atual.
* ``!alive`` - Verifica se o bot está ativo.
* ``!worktype <public ou private>`` - Altera o tipo de trabalho do bot (apenas sudo).
* ``!sudo add <número>`` - Adiciona um usuário à lista sudo (apenas sudo).
* ``!sudo delete <número>`` - Remove um usuário da lista sudo (apenas sudo).
* ``!blacklist`` - Adiciona ou remove o grupo atual da lista negra (apenas sudo).
* ``!menu`` - Exibe o menu de comandos.
* ``!edit <alive|welcome|goodbye>`` (responda a uma mensagem) - Edita as mensagens de boas-vindas/despedida ou status (apenas sudo).
* ``!update`` - Verifica por atualizações do bot (apenas sudo).
* ``!update now`` - Atualiza o bot para a versão mais recente (apenas sudo).
* ``!plugin <busca>`` - Procura por plugins.
* ``!plugin top`` - Mostra os plugins mais populares.
* ``!pinstall <id_plugin>`` - Instala um plugin (apenas sudo).
* ``!pldelete <id_plugin>`` - Exclui um plugin (apenas sudo).
* ``!ping`` - Verifica o tempo de resposta do bot.

## Configuração

O arquivo ``database.json`` armazena a configuração do bot. Você pode editar este arquivo para personalizar várias configurações, incluindo:

* **Handlers:** Os prefixos usados para acionar comandos.
* **Alive Message:** A mensagem exibida quando o comando ``!alive`` é usado.
* **Welcome/Goodbye Messages:** Mensagens enviadas quando usuários entram ou saem de um grupo.
* **Sudo Users:** Números de telefone (com código do país) de usuários com acesso sudo.
* **Work Type:** Define como "public" (público) ou "private" (privado) para controlar quem pode usar o bot.


## Contribuições

Contribuições são bem-vindas! Crie um fork do repositório, faça suas alterações e envie um pull request.


## Licença

Licença MIT. Consulte o arquivo [LICENSE](LICENSE) para detalhes.
