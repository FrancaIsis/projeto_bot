// Importa a biblioteca para manipular arquivos Excel
const xlsx = require('xlsx');
// Módulo para lidar com caminhos de arquivos
const path = require('path');

function buscarDados(codigoBusca) {
  const caminhoArquivo = path.resolve(__dirname, 'dados.xlsx');
  const workbook = xlsx.readFile(caminhoArquivo);
  const planilha = workbook.Sheets[workbook.SheetNames[0]];
  const dados = xlsx.utils.sheet_to_json(planilha);

  // ✅ ADICIONE AQUI:
  console.log("🔎 Primeira linha lida:", dados[0]);
  console.log("📌 Colunas disponíveis:", Object.keys(dados[0]));

  const resultado = dados.filter((linha) => {
    return linha['AGHU']?.toString() === codigoBusca;
  });

  return resultado;
}

module.exports = { buscarDados };
