function rotacionarDadosMensal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaOrigem = ss.getSheetByName("Respostas ao formulário 1"); 
  // --- CONFIGURAÇÃO ---
  var idFormulario = "177fbLmoI7HewaNow_YkosgwZhiBuAQ4td1RTty0Csk8"; 
  // CONFIGURAÇÃO VISUAL
  const COLUNA_ALINHAMENTO = 11; 
  const LARGURA = 600;
  const ALTURA = 350;
  const LINHA_GRAFICO_1 = 2;
  const LINHA_GRAFICO_2 = 21;
  const LINHA_GRAFICO_3 = 40;
  // --------------------
  // 1. Definição de Datas e Nome do Arquivo
  var dataHoje = new Date();
  var dataMesAnterior = new Date(dataHoje.getFullYear(), dataHoje.getMonth() - 1, 1);
  var meses = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var nomeMes = meses[dataMesAnterior.getMonth()];
  var ano = dataMesAnterior.getFullYear();
  // Nome do NOVO ARQUIVO
  var nomeNovoArquivo = "Relatório IoT - " + nomeMes + "/" + ano;
  // 2. Verifica se há dados para mover
  var ultimaLinha = abaOrigem.getLastRow();
  if (ultimaLinha > 1) {
    // Cria uma NOVA PLANILHA (Arquivo separado no Google Drive)
    var novaPlanilha = SpreadsheetApp.create(nomeNovoArquivo);
    var abaDestino = novaPlanilha.getSheets()[0]; // Pega a primeira aba do novo arquivo
    abaDestino.setName("Dados Consolidados");
    // Copia o Cabeçalho
    var cabecalho = abaOrigem.getRange(1, 1, 1, abaOrigem.getLastColumn()).getValues();
    abaDestino.getRange(1, 1, 1, abaOrigem.getLastColumn()).setValues(cabecalho);
    // Pega e move dados brutos para o NOVO ARQUIVO
    var dadosRange = abaOrigem.getRange(2, 1, ultimaLinha - 1, abaOrigem.getLastColumn());
    var valores = dadosRange.getValues();
    abaDestino.getRange(2, 1, valores.length, valores[0].length).setValues(valores);
    // ---------------------------------------------------------
    // 3. PROCESSAMENTO (TABELA DE RESUMO NO NOVO ARQUIVO)
    // ---------------------------------------------------------
    var resumoDiario = {};
    var fusoHorario = ss.getSpreadsheetTimeZone();
    for (var i = 0; i < valores.length; i++) {
      var dataObj = new Date(valores[i][0]);
      var diaChave = Utilities.formatDate(dataObj, fusoHorario, "dd/MM");
      if (!resumoDiario[diaChave]) {
        resumoDiario[diaChave] = {qtd: 0, somaUmidade: 0, somaTemp: 0};
      }
      resumoDiario[diaChave].qtd++;
      resumoDiario[diaChave].somaUmidade += valores[i][1];
      resumoDiario[diaChave].somaTemp += valores[i][3];
    }
    var matrizResumo = [["Dia", "Média Umidade", "Média Temperatura"]];
    for (var dia in resumoDiario) {
      var mediaUmidade = resumoDiario[dia].somaUmidade / resumoDiario[dia].qtd;
      var mediaTemp = resumoDiario[dia].somaTemp / resumoDiario[dia].qtd;
      matrizResumo.push([dia, mediaUmidade, mediaTemp]);
    }
    // Escreve Resumo nas colunas G, H, I do NOVO ARQUIVO
    abaDestino.getRange(1, 7, matrizResumo.length, 3).setValues(matrizResumo);

    // ---------------------------------------------------------
    // 4. CRIAÇÃO DOS GRÁFICOS (NO NOVO ARQUIVO)
    // ---------------------------------------------------------

    // Substituí apenas os blocos de gráficos por versões com legendas e cores explícitas.

    // Gráfico 1: Monitoramento Bruto — Umidade (azul) e Temperatura (vermelho)
    var graficoLinha = abaDestino.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(abaDestino.getRange(2, 1, valores.length, 1)) // Data/hora
      .addRange(abaDestino.getRange(2, 2, valores.length, 1)) // Umidade
      .addRange(abaDestino.getRange(2, 4, valores.length, 1)) // Temperatura
      .setPosition(LINHA_GRAFICO_1, COLUNA_ALINHAMENTO, 0, 0)
      .setOption('title', 'Monitoramento Bruto — Umidade (azul) | Temperatura (vermelho)')
      .setOption('colors', ['#2b9cff', '#ef4444'])
      .setOption('legend', { position: 'right' })
      .setOption('hAxis', { title: 'Tempo' })
      .setOption('vAxis', { title: 'Valor' })
      .setOption('width', LARGURA).setOption('height', ALTURA)
      .build();
    abaDestino.insertChart(graficoLinha);

    // Gráfico 2: Evolução — Luz (amarelo) e Temperatura (vermelho) em linha com eixo 0..100
    var graficoLuzTemp = abaDestino.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(abaDestino.getRange(2, 1, valores.length, 1)) // Data/hora
      .addRange(abaDestino.getRange(2, 3, valores.length, 1)) // Luz
      .addRange(abaDestino.getRange(2, 4, valores.length, 1)) // Temperatura
      .setPosition(LINHA_GRAFICO_2, COLUNA_ALINHAMENTO, 0, 0)
      .setOption('title', 'Evolução: Luz (amarelo) | Temperatura (vermelho)')
      .setOption('colors', ['#f59e0b', '#ef4444'])
      .setOption('legend', { position: 'right' })
      .setOption('hAxis', { title: 'Tempo' })
      .setOption('vAxis', { viewWindow: { min: 0, max: 100 }, title: 'Valor (0–100)' })
      .setOption('width', LARGURA).setOption('height', ALTURA)
      .build();
    abaDestino.insertChart(graficoLuzTemp);

    // Gráfico 3: Médias Diárias — Umidade (azul) / Temperatura (vermelho)
    var graficoColunas = abaDestino.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(abaDestino.getRange(1, 7, matrizResumo.length, 3))
      .setPosition(LINHA_GRAFICO_3, COLUNA_ALINHAMENTO, 0, 0)
      .setOption('title', 'Médias Diárias — Umidade (azul) / Temperatura (vermelho)')
      .setOption('colors', ['#2b9cff', '#ef4444'])
      .setOption('hAxis', { title: 'Dia' })
      .setOption('vAxis', { title: 'Valor Médio' })
      .setOption('legend', { position: 'right' })
      .setOption('width', LARGURA).setOption('height', ALTURA)
      .build();
    abaDestino.insertChart(graficoColunas);

    // ---------------------------------------------------------
    // 5. Limpeza e Notificação
    // Pega a URL do NOVO arquivo criado
    var urlNovoArquivo = novaPlanilha.getUrl();
    try {
      var form = FormApp.openById(idFormulario);
      form.deleteAllResponses();
    } catch (e) {
      Logger.log("Erro ao limpar form: " + e.message);
    }
    MailApp.sendEmail({
      to: "frssm@cesar.school",
      subject: "Relatório IoT Mensal: " + nomeMes + "/" + ano,
      htmlBody: "O relatório foi gerado e arquivado em uma nova planilha.<br>" +
                "Acesse aqui: <a href='" + urlNovoArquivo + "'>Abrir Relatório de " + nomeMes + "</a>"
    });
    // Limpa a planilha original para receber o próximo mês
    //abaOrigem.deleteRows(2, ultimaLinha - 1);
    safeDeleteWithRetry(abaOrigem, 2, ultimaLinha - 1, 12, 4 * 60 * 1000);
  }
}

// ===== Substituir a linha de exclusão por este bloco com retry =====
function safeDeleteWithRetry(sheet, startRow, howMany, maxAttempts, maxMillis) {
  maxAttempts = (typeof maxAttempts === 'number') ? maxAttempts : 8;
  maxMillis = (typeof maxMillis === 'number') ? maxMillis : 4 * 60 * 1000; // 4 minutos por padrão

  var attempt = 0;
  var backoff = 1000; // 1s inicial
  var t0 = new Date().getTime();

  while (true) {
    attempt++;
    try {
      // Tentar deletar linhas (modo "físico").
      // Se preferir apenas limpar conteúdo, substitua pela chamada clearContent abaixo.
      var frozen = sheet.getFrozenRows();
      var maxRows = sheet.getMaxRows();
      var nonFrozenRows = maxRows - frozen;

      // Evita pedir para deletar todas as linhas não congeladas
      var toDelete = howMany;
      if (toDelete >= nonFrozenRows) {
        toDelete = nonFrozenRows - 1;
      }

      if (toDelete > 0) {
        sheet.deleteRows(startRow, toDelete);
      } else {
        // nada a deletar (ou impossível); apenas limpa conteúdo como alternativa
        if (howMany > 0) {
          sheet.getRange(startRow, 1, howMany, sheet.getLastColumn()).clearContent();
        }
      }

      // Se chegou aqui, funcionou
      return;
    } catch (err) {
      // Se já passou muito tempo, aborta lançando o erro
      var elapsed = new Date().getTime() - t0;
      if (elapsed >= maxMillis) {
        throw new Error('Falha ao apagar linhas após ' + attempt + ' tentativas e ' + Math.round(elapsed/1000) + 's: ' + err.message);
      }

      // Se atingiu número máximo de tentativas, também aborta
      if (attempt >= maxAttempts) {
        // ao invés de abortar imediatamente, espera um pouco mais e tenta novamente até maxMillis
        Utilities.sleep(backoff);
        backoff = Math.min(backoff * 2, 30000); // cap 30s
        continue;
      }

      // Espera e tenta novamente (exponential backoff)
      Utilities.sleep(backoff);
      backoff = Math.min(backoff * 2, 30000);
      // loop recomeça
    }
  }
}