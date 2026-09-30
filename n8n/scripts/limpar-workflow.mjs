// Gera a versão pública de um workflow exportado do n8n, sem tokens, telefones, e-mails e IDs internos.
// Uso: node n8n/scripts/limpar-workflow.mjs <entrada.json> <saida.json>
// Termina com erro se, depois da limpeza, ainda encontrar algo com cara de segredo.
import fs from "node:fs";

const [entrada, saida] = process.argv.slice(2);
const workflow = JSON.parse(fs.readFileSync(entrada, "utf8"));

// Metadados da instância e do versionamento não fazem sentido fora do n8n de origem
for (const chave of ["id", "versionId", "meta", "pinData", "active", "shared", "tags", "nodeGroups"]) delete workflow[chave];

const substituicoes = [
  [/api\.z-api\.io\/instances\/[A-Za-z0-9]+\/token\/[A-Za-z0-9]+/g, "api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN"],
  [/\b55\d{10,11}\b/g, "55DDDNUMERO"],
  [/[\w.+-]+@(?:gmail|hotmail|outlook|yahoo|icloud)\.[\w.]+/gi, "seu-calendario@exemplo.com"],
  [/https:\/\/[a-z0-9]+\.supabase\.co/gi, "https://SEU-PROJETO.supabase.co"],
  [/https:\/\/n8n\.[\w.-]+/gi, "https://SEU-N8N"],
];

function limpar(valor) {
  if (typeof valor === "string") return substituicoes.reduce((s, [re, novo]) => s.replace(re, novo), valor);
  if (Array.isArray(valor)) return valor.map(limpar);
  if (valor && typeof valor === "object") return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, limpar(v)]));
  return valor;
}

for (const no of workflow.nodes) {
  no.parameters = limpar(no.parameters);
  // Credenciais: mantém só o nome, o ID é da instância de origem
  for (const cred of Object.values(no.credentials || {})) delete cred.id;
  // Cabeçalhos com token da Z-API
  for (const h of no.parameters.headerParameters?.parameters || [])
    if (/token|authorization|apikey/i.test(h.name)) h.value = "SEU_CLIENT_TOKEN";
  // Webhook sem autenticação: o caminho funciona como segredo (quem sabe o endereço consegue chamar)
  if (no.type === "n8n-nodes-base.webhook" && (no.parameters.authentication || "none") === "none") {
    no.parameters.path = "SEU-CAMINHO-DE-WEBHOOK";
    delete no.webhookId;
  }
  // ID fixo da empresa no Supabase
  for (const campo of no.parameters.fieldsUi?.fieldValues || [])
    if (campo.fieldId === "empresa_id" && !String(campo.fieldValue).startsWith("=")) campo.fieldValue = "ID_DA_EMPRESA";
}

// Conferência final: nada com cara de token, telefone ou e-mail pessoal
const texto = JSON.stringify(workflow);
const suspeitos = [
  ...(texto.match(/instances\/(?!SUA_INSTANCIA)[A-Za-z0-9]{10,}/g) || []),
  ...(texto.match(/\b55\d{10,11}\b/g) || []),
  ...(texto.match(/[\w.+-]+@(?:gmail|hotmail|outlook|yahoo|icloud)\.[\w.]+/gi) || []),
  ...(texto.match(/"(?:value|token|apiKey|password)":"(?!SEU_|=)[A-Za-z0-9]{20,}"/g) || []),
  ...(texto.match(/eyJ[\w-]{10,}\.[\w-]{10,}/g) || []),
];
if (suspeitos.length) {
  console.error("Ainda há dados sensíveis:", [...new Set(suspeitos)]);
  process.exit(1);
}
fs.writeFileSync(saida, JSON.stringify(workflow, null, 2) + "\n");
console.log(`OK: ${saida} limpo (${workflow.nodes.length} nós)`);
