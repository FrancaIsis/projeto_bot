// Importa bibliotecas necessárias
const { readFile, utils } = require("xlsx"); // Para ler a planilha Excel
const qrcode = require("qrcode-terminal"); // Gera QR Code no terminal
const { Client, LocalAuth } = require("whatsapp-web.js"); // API do WhatsApp

// Cria o cliente do WhatsApp com autenticação local
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true },
});

// Gera QR code para login
client.on("qr", (qr) => qrcode.generate(qr, { small: true }));

// Confirma que o bot está pronto
client.on("ready", () => console.log("✅ Bot está pronto!"));

// Armazena se o usuário já viu o menu
const usuariosComMenu = new Map();

// Armazena em que "estado" o usuário está (ex: aguardando um código AGHU)
const estadoUsuario = new Map();

// Define o menu principal
const menu = `
🤖 *Menu do Chatbot*:
1️⃣ Consultar status do item no Relatório de Desabastecimento  
2️⃣ Consultar empenhos de materiais médicos  
3️⃣ Consultar empenhos de medicamentos  
4️⃣ Consultar empenhos de insumos laboratoriais  
👋 Digite 0 (zero) para sair

Digite o número da opção desejada:
`;

// Função que envia o menu para o usuário
async function exibirMenu(chat) {
  await chat.sendMessage(menu);
  usuariosComMenu.set(chat.id._serialized, true); // Marca que esse usuário já viu o menu
}

// Função para remover acentos e normalizar textos para busca
function normalizarTexto(t) {
  return String(t)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Quando o bot receber uma mensagem
client.on("message", async (msg) => {
  const texto = msg.body.trim(); // Texto da mensagem enviada
  const contato = msg.from; // Número do usuário
  const chat = await msg.getChat(); // Objeto do chat

  // Se o usuário está esperando digitar um código AGHU:
  if (estadoUsuario.get(contato) === "aguardando_codigo_aghu") {
    const busca = texto;

    // Lê os dados da planilha
    const workbook = readFile("./dados.xlsx");
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const dados = utils.sheet_to_json(sheet);

    const textoNormalizado = normalizarTexto(busca);

    // Filtra os dados conforme o código ou a descrição do item
    const resultados = dados.filter((item) => {
      const cod = String(item["CODIGO AGHU"] || "").replace(/\D/g, "").trim();
      const desc = normalizarTexto(item["DESCRICAO DO ITEM"] || "");
      const palavras = textoNormalizado.split(/\s+/);
      const contemTodasPalavras = palavras.every((p) => desc.includes(p));
      return textoNormalizado === cod || contemTodasPalavras;
    });

    // Se nada foi encontrado
    if (resultados.length === 0) {
      await msg.reply("❌ Nenhum item encontrado com esse código ou descrição.");
    } else {
      const MAX_RESULTADOS = 10;

      // Alerta se houver muitos resultados
      if (resultados.length > MAX_RESULTADOS) {
        await msg.reply(
          `⚠️ Foram encontrados ${resultados.length} itens. Exibindo os primeiros ${MAX_RESULTADOS}:`
        );
      }

      // Monta as mensagens para cada item encontrado
      const respostas = resultados.slice(0, MAX_RESULTADOS).map((item) => {
        return `
📦 *${item["DESCRICAO DO ITEM"]}*
🔢 Código AGHU: ${item["CODIGO AGHU"]}
📍 Almoxarifado: ${item["ALMOXARIFADO"]}
📊 Estoque: ${item["ESTOQUE"] != null ? Number(item["ESTOQUE"]).toFixed(1) : "Não informado"}
📈 Consumo Médio: ${item["CONSUMO MEDIO PONDERADO"]}
📆 Cobertura (dias): ${item["COBERTURA (EM DIAS)"] !=null ? Number(item["COBERTURA (EM DIAS)"]).toFixed(2) : "Não informado"}
🟢 Situação: ${item["SITUACAO DO ITEM"]}
📅 Previsão de Regularização: ${item["PREVISAO DE REGULARIZACAO"]}`;
      });

      // Envia os resultados
      await msg.reply(respostas.join("\n\n"));
    }

    estadoUsuario.delete(contato); // Limpa o estado
    setTimeout(() => exibirMenu(chat), 2000); // Mostra o menu de novo depois de 2 segundos
    return;
  }

  // Se o usuário ainda não viu o menu
  if (!usuariosComMenu.get(contato)) {
    await exibirMenu(chat);
    return;
  }

  // Processa as opções do menu
  switch (texto) {
    case "1":
      await msg.reply(
        "🔍 Digite o código AGHU ou parte da descrição do item que deseja buscar."
      );
      estadoUsuario.set(contato, "aguardando_codigo_aghu"); // Marca o estado
      break;

    case "2":
      await msg.reply("📦 Em breve: consulta de materiais médicos.");
      setTimeout(() => exibirMenu(chat), 2000); // Mostra o menu novamente
      break;

    case "3":
      await msg.reply("💊 Em breve: consulta de medicamentos.");
      setTimeout(() => exibirMenu(chat), 2000);
      break;

    case "4":
      await msg.reply("🧪 Em breve: consulta de insumos laboratoriais.");
      setTimeout(() => exibirMenu(chat), 2000);
      break;

    case "0":
      await msg.reply("👋 Atendimento encerrado.");
      usuariosComMenu.delete(contato); // Limpa o controle
      estadoUsuario.delete(contato);
      break;

    default:
      await msg.reply("❗ Opção inválida. Digite um número de 0 a 4.");
      setTimeout(() => exibirMenu(chat), 2000);
  }
});

// Inicializa o cliente do bot
client.initialize();
