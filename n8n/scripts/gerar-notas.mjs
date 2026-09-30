// Reorganiza um workflow por etapas e adiciona uma nota (sticky note) para cada etapa.
// Uso: node n8n/scripts/gerar-notas.mjs <config> <entrada.json> <saida.json> [previa.svg]
// <config> é um arquivo de n8n/scripts/notas/ com as etapas, a ordem no canvas e, se houver,
// renomes de nós e correções de fluxo. Nós, parâmetros e ligações só mudam por essas duas listas.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const [arquivoConfig, entrada, saida, previa] = process.argv.slice(2);
const { grupos, visaoGeral, linhas, renomes = {}, corrigir, ramosAbaixo = false } = await import(pathToFileURL(path.resolve(arquivoConfig)).href);
const workflow = JSON.parse(fs.readFileSync(entrada, "utf8"));
workflow.nodes = workflow.nodes.filter((n) => n.type !== "n8n-nodes-base.stickyNote");

// Renomeia nós: nome, chaves das ligações, destinos e referências em expressões
for (const [antigo, novo] of Object.entries(renomes)) {
  const no = workflow.nodes.find((n) => n.name === antigo);
  if (!no) continue;
  no.name = novo;
  if (workflow.connections[antigo]) {
    workflow.connections[novo] = workflow.connections[antigo];
    delete workflow.connections[antigo];
  }
  for (const saidas of Object.values(workflow.connections))
    for (const lista of Object.values(saidas)) for (const ramo of lista) for (const alvo of ramo || []) if (alvo.node === antigo) alvo.node = novo;
  const texto = JSON.stringify(workflow.nodes).split(`$('${antigo}')`).join(`$('${novo}')`);
  workflow.nodes = JSON.parse(texto);
}

// Liga a saída de um nó a outro (sem duplicar), para as correções de fluxo da config
const liga = (de, saida, para) => {
  const lista = ((workflow.connections[de] ||= { main: [] }).main ||= []);
  while (lista.length <= saida) lista.push([]);
  if (!lista[saida].some((alvo) => alvo.node === para)) lista[saida].push({ node: para, type: "main", index: 0 });
};
corrigir?.({ workflow, liga, randomUUID });

const porNome = Object.fromEntries(workflow.nodes.map((n) => [n.name, n]));
const largura = (n) => (n.type.endsWith(".agent") ? 220 : 100);
const MARGEM = 60, DX = 240, DY = 200, ESPACO_ETAPAS = 160, ESPACO_LINHAS = 260, LARGURA_MIN = 360;

// Ligações principais (main) e de IA (modelo e memória do agente)
const principais = [], deIA = [];
for (const [de, saidas] of Object.entries(workflow.connections))
  for (const [tipo, lista] of Object.entries(saidas))
    lista.forEach((ramo, saida) => (ramo || []).forEach((alvo) => (tipo === "main" ? principais : deIA).push([de, alvo.node, saida])));

function cabecalho(g, larguraNota) {
  const porLinha = Math.max(20, Math.floor((larguraNota - 40) / 9));
  const qtd = g.texto.split("\n").reduce((t, l) => t + Math.max(1, Math.ceil(l.length / porLinha)), 0);
  return 70 + qtd * 26;
}

// Camadas dentro da etapa: cada nó fica uma coluna depois do seu antecessor na etapa
function organizar(g) {
  const nos = new Set(g.nos);
  const subnos = new Set(deIA.filter(([de, para]) => nos.has(de) && nos.has(para)).map(([de]) => de));
  const internas = principais.filter(([de, para]) => nos.has(de) && nos.has(para) && !subnos.has(de) && !subnos.has(para));
  const coluna = Object.fromEntries(g.nos.map((n) => [n, 0]));
  for (let i = 0; i < g.nos.length; i++) for (const [de, para] of internas) coluna[para] = Math.max(coluna[para], coluna[de] + 1);
  const posicoes = {};
  if (ramosAbaixo) {
    // O "não" de uma decisão desce uma linha; um nó que junta caminhos fica na linha mais alta que chega nele
    const linha = {};
    const entradas = g.nos.filter((n) => !subnos.has(n) && !internas.some(([, para]) => para === n));
    entradas.forEach((n) => (linha[n] = 0));
    for (let i = 0; i < g.nos.length; i++)
      for (const [de, para, saida] of internas)
        if (linha[de] !== undefined) linha[para] = Math.min(linha[para] ?? Infinity, linha[de] + (saida > 0 ? 1 : 0));
    const ocupado = new Set();
    for (const nome of g.nos.filter((n) => !subnos.has(n)).sort((a, b) => coluna[a] - coluna[b] || (linha[a] ?? 0) - (linha[b] ?? 0))) {
      let l = linha[nome] ?? 0;
      while (ocupado.has(`${coluna[nome]},${l}`)) l++;
      ocupado.add(`${coluna[nome]},${l}`);
      posicoes[nome] = [coluna[nome] * DX, l * DY];
    }
  } else {
    const camadas = [];
    for (const nome of g.nos.filter((n) => !subnos.has(n))) (camadas[coluna[nome]] ||= []).push(nome);
    camadas.forEach((camada, c) =>
      camada.sort((a, b) => porNome[a].position[1] - porNome[b].position[1]).forEach((nome, i) => (posicoes[nome] = [c * DX, i * DY])),
    );
  }
  // Modelo e memória ficam logo abaixo do agente, como no n8n
  for (const [de, para] of deIA.filter(([de]) => subnos.has(de))) {
    const irmaos = deIA.filter(([d, p]) => p === para && subnos.has(d)).map(([d]) => d);
    posicoes[de] = [posicoes[para][0] + irmaos.indexOf(de) * 130, posicoes[para][1] + 170];
  }
  const larguraConteudo = Math.max(...g.nos.map((n) => posicoes[n][0] + largura(porNome[n])));
  const alturaConteudo = Math.max(...g.nos.map((n) => posicoes[n][1] + 100));
  const larguraNota = Math.max(LARGURA_MIN, larguraConteudo + 2 * MARGEM);
  return { posicoes, larguraConteudo, alturaConteudo, larguraNota, topo: cabecalho(g, larguraNota) };
}

const porTitulo = Object.fromEntries(grupos.map((g) => [g.titulo, g]));
const notas = [];
const nota = (g, x, y, w, h) =>
  notas.push({
    parameters: { content: `## ${g.titulo}\n${g.texto}`, width: Math.round(w), height: Math.round(h), color: g.cor },
    type: "n8n-nodes-base.stickyNote",
    typeVersion: 1,
    position: [Math.round(x), Math.round(y)],
    id: randomUUID(),
    name: `Nota ${notas.length}`,
  });

nota(visaoGeral, 0, -460, 900, 380);
let y = 0;
for (const linha of linhas) {
  let x = 0, alturaLinha = 0;
  for (const item of linha) {
    // Etapas empilhadas dividem a coluna, com a mesma largura de nota
    const pilha = [item].flat().map((titulo) => ({ g: porTitulo[titulo], o: organizar(porTitulo[titulo]) }));
    const larguraColuna = Math.max(...pilha.map(({ o }) => o.larguraNota));
    let yEtapa = y;
    for (const { g, o } of pilha) {
      const altura = o.topo + o.alturaConteudo + 2 * MARGEM;
      const deslocamento = (larguraColuna - o.larguraConteudo) / 2;
      for (const nome of g.nos) porNome[nome].position = [Math.round(x + deslocamento + o.posicoes[nome][0]), Math.round(yEtapa + o.topo + MARGEM + o.posicoes[nome][1])];
      nota(g, x, yEtapa, larguraColuna, altura);
      yEtapa += altura + ESPACO_ETAPAS;
    }
    x += larguraColuna + ESPACO_ETAPAS;
    alturaLinha = Math.max(alturaLinha, yEtapa - ESPACO_ETAPAS - y);
  }
  y += alturaLinha + ESPACO_LINHAS;
}

// Conferência: toda etapa entrou em uma linha, todo nó tem nota e nenhuma nota cobre nó alheio
const semLinha = grupos.filter((g) => !linhas.flat(2).includes(g.titulo)).map((g) => g.titulo);
const semNota = workflow.nodes.map((n) => n.name).filter((n) => !grupos.some((g) => g.nos.includes(n)));
const invasoes = [];
notas.slice(1).forEach((s) => {
  const g = grupos.find((gr) => s.parameters.content.startsWith(`## ${gr.titulo}\n`));
  const [x1, y1] = s.position, x2 = x1 + s.parameters.width, y2 = y1 + s.parameters.height;
  workflow.nodes.filter((n) => !g.nos.includes(n.name) && n.position[0] < x2 && n.position[0] + largura(n) > x1 && n.position[1] < y2 && n.position[1] + 100 > y1)
    .forEach((n) => invasoes.push(`${g.titulo} cobre ${n.name}`));
});
if (semLinha.length || semNota.length || invasoes.length) {
  console.error({ semLinha, semNota, invasoes });
  process.exit(1);
}
workflow.nodes = [...notas, ...workflow.nodes];
fs.writeFileSync(saida, JSON.stringify(workflow, null, 2));
console.log(`OK: ${notas.length} notas, ${workflow.nodes.length - notas.length} nós reorganizados`);

if (previa) {
  const cores = { 1: "#fff5c2", 2: "#fde2c4", 3: "#fbd0d0", 4: "#d4f1d9", 5: "#d3e6fb", 6: "#e6dafb", 7: "#e8e8e8" };
  const reais = workflow.nodes.filter((n) => n.type !== "n8n-nodes-base.stickyNote");
  const xs = workflow.nodes.map((n) => n.position[0] + (n.parameters.width || 100)), ys = workflow.nodes.map((n) => n.position[1] + (n.parameters.height || 100));
  const minX = -100, minY = -560, W = Math.max(...xs) - minX + 100, H = Math.max(...ys) - minY + 100;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${W} ${H}" width="2000" height="${Math.round((2000 * H) / W)}" style="background:#fafafa;font-family:sans-serif">`;
  for (const n of notas) {
    const p = n.parameters;
    svg += `<rect x="${n.position[0]}" y="${n.position[1]}" width="${p.width}" height="${p.height}" fill="${cores[p.color]}" stroke="#aaa" rx="14"/>`;
    svg += `<text x="${n.position[0] + 20}" y="${n.position[1] + 50}" font-size="40" font-weight="bold">${p.content.split("\n")[0].replace("## ", "")}</text>`;
  }
  const pos = Object.fromEntries(reais.map((n) => [n.name, n]));
  for (const [de, para] of [...principais, ...deIA])
    if (pos[de] && pos[para]) svg += `<line x1="${pos[de].position[0] + largura(pos[de])}" y1="${pos[de].position[1] + 50}" x2="${pos[para].position[0]}" y2="${pos[para].position[1] + 50}" stroke="#666" stroke-width="4"/>`;
  for (const n of reais) svg += `<rect x="${n.position[0]}" y="${n.position[1]}" width="${largura(n)}" height="100" fill="#fff" stroke="#333" stroke-width="4" rx="12"/>`;
  fs.writeFileSync(previa, svg + "</svg>");
}
