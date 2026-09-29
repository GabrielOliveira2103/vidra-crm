import { test, expect } from "@playwright/test";
import { dayKey, shiftDay } from "../../src/utils/format.js";
const user = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  aud: "authenticated",
  role: "authenticated",
  email: "teste@example.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
function fixtures() {
  const today = dayKey();
  const now = new Date().toISOString();
  const servicos = [
    "Fechamento de sacada",
    "Box de banheiro",
    "Espelho",
    "Janela",
    "Porta automática",
    "Película de privacidade",
  ].map((nome, i) => ({
    id: `s${i}`,
    nome,
    ativo: true,
    descricao: "Serviço sob medida",
    created_at: now,
  }));
  const statuses = [
    "orcamento_enviado",
    "fechado",
    "negociacao",
    "novo",
    "qualificando",
    "aguardando_visita",
    "visita_agendada",
    "visita_realizada",
    "orcamento_pendente",
    "perdido",
  ];
  const names = [
    "Carlos Almeida",
    "Maria Souza",
    "João Santos",
    "Ana Oliveira",
    "Pedro Costa",
    "Luciana Lima",
    "Ricardo Mendes",
    "Fernanda Alves",
    "Roberto Dias",
    "Camila Rocha",
  ];
  const clientes = names.map((nome, i) => ({
    id: `c${i}`,
    nome,
    telefone: `+55119999900${String(i).padStart(2, "0")}`,
    cidade: ["Taboão da Serra", "São Paulo", "Osasco"][i % 3],
    bairro: "Centro",
    endereco: "Rua de Teste",
    numero: "100",
    demonstracao: true,
    created_at: `${shiftDay(today, -i * 2)}T12:00:00Z`,
  }));
  const leads = clientes.map((c, i) => ({
    id: `l${i}`,
    cliente_id: c.id,
    servico: `s${i % 6}`,
    origem: ["WhatsApp", "Google", "Instagram"][i % 3],
    status: statuses[i],
    created_at: c.created_at,
    etapa_desde: c.created_at,
    fechado_em: i === 1 ? now : null,
    necessita_visita: true,
    descricao: "Instalação sob medida para residência.",
    medidas: "3 m x 2 m",
    tipo_vidro: "Temperado",
  }));
  const orcamentos = leads
    .filter((_, i) => i < 3)
    .map((l, i) => ({
      id: `q${i}`,
      lead_id: l.id,
      numero_orcamento: `TESTE-00${i}`,
      valor: [5800, 1450, 2200][i],
      desconto: 0,
      valor_final: [5800, 1450, 2200][i],
      status: i === 1 ? "aceito" : "enviado",
      data_envio: l.created_at,
      validade: shiftDay(today, 3),
      created_at: l.created_at,
    }));
  return {
    clientes,
    leads,
    servicos,
    orcamentos,
    visitas: [
      {
        id: "v1",
        lead_id: "l6",
        data_visita: today,
        horario_visita: "14:00:00",
        endereco: "Rua de Teste, 100",
        responsavel: "Equipe técnica",
        status: "agendada",
        created_at: now,
      },
    ],
    interacoes: [
      {
        id: "i1",
        cliente_id: "c0",
        lead_id: "l0",
        tipo: "mensagem",
        origem: "cliente",
        mensagem: "Gostaria de solicitar um orçamento.",
        created_at: now,
      },
    ],
    arquivos: [],
    lead_historico: leads.map((l, i) => ({
      id: `h${i}`,
      lead_id: l.id,
      status_novo: l.status,
      status_anterior: null,
      created_at: l.created_at,
    })),
  };
}
async function mockAPI(page) {
  const data = fixtures();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Fontes externas não são parte do contrato funcional do teste.
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ body: "", contentType: "text/css" }),
  );
  await page.route("https://crm-test.supabase.co/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    if (req.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
        },
      });
    const respond = (json, status = 200) => route.fulfill({ json, status });
    if (path.includes("/auth/v1/logout")) return respond({});
    if (path.includes("/auth/v1/token"))
      return respond({
        access_token: "test-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "test-refresh-token",
        user,
      });
    if (path.includes("/auth/v1/user")) return respond(user);
    if (path.endsWith("/rpc/crm_autorizado")) return respond(true);
    if (path.includes("/storage/v1/object/sign/") && req.method() === "POST")
      return respond({
        signedURL: `/object/sign/lead-arquivos/test.png?token=synthetic`,
      });
    if (path.includes("/storage/v1/object/sign/") && req.method() === "GET")
      return route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    if (path.includes("/storage/v1/object/"))
      return respond(
        req.method() === "DELETE" ? [] : { Key: path.split("/object/")[1] },
      );
    const table = path.split("/").at(-1);
    if (!data[table])
      return respond({ message: `Unexpected endpoint ${path}` }, 400);
    if (req.method() === "GET") return respond(data[table]);
    if (req.method() === "POST") {
      const row = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...req.postDataJSON(),
      };
      if (table === "leads") row.etapa_desde = row.created_at;
      if (table === "orcamentos")
        Object.assign(row, {
          valor_final: row.valor - row.desconto,
          numero_orcamento: "TESTE-NOVO",
        });
      data[table].push(row);
      return respond(row, 201);
    }
    if (req.method() === "PATCH") {
      const id = url.searchParams.get("id").slice(3);
      const row = data[table].find((r) => r.id === id);
      Object.assign(row, req.postDataJSON());
      return respond(row);
    }
    if (req.method() === "DELETE") {
      const id = url.searchParams.get("id").slice(3);
      data[table] = data[table].filter((r) => r.id !== id);
      return respond({});
    }
    return respond({}, 400);
  });
  return { data, errors };
}
async function login(page) {
  await page.goto("/");
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email", { exact: true }).fill("teste@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar no CRM" }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
}
test("proteção, login persistente, páginas e logout", async ({ page }) => {
  const { errors } = await mockAPI(page);
  await page.goto("/leads/l0");
  await expect(page).toHaveURL(/login/);
  await login(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  for (const [path, title] of [
    ["/leads", "Leads"],
    ["/pipeline", "Pipeline comercial"],
    ["/clientes", "Clientes"],
    ["/orcamentos", "Orçamentos"],
    ["/visitas", "Visitas técnicas"],
    ["/servicos", "Serviços"],
    ["/relatorios", "Relatórios"],
    ["/configuracoes", "Configurações"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  await page.goto("/leads/l0");
  await expect(
    page.getByRole("heading", { name: "Carlos Almeida" }),
  ).toBeVisible();
  await expect(
    page.getByText("Gostaria de solicitar um orçamento."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver histórico do cliente" }).click();
  await expect(page).toHaveURL(/clientes\/c0/);
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/login/);
  expect(errors).toEqual([]);
});
test("criar cliente, lead, orçamento, visita e interação; alterar pipeline", async ({
  page,
}) => {
  const { data, errors } = await mockAPI(page);
  await login(page);
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Adicionar cliente" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: false }).fill("Cliente Teste");
  await dialog.getByLabel("Telefone com DDD").fill("(11) 98888-7777");
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(dialog).not.toBeVisible();
  expect(data.clientes.at(-1).telefone).toBe("+5511988887777");
  await page.goto("/leads");
  await page.getByRole("button", { name: "Novo lead" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cliente").selectOption(data.clientes.at(-1).id);
  await dialog.getByLabel("Serviço", { exact: false }).selectOption("s0");
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(
    page.getByRole("heading", { name: "Cliente Teste" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Novo orçamento" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Valor (R$)").fill("6000");
  await dialog.getByLabel("Desconto em reais").fill("200");
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(dialog).not.toBeVisible();
  expect(data.orcamentos.at(-1).valor_final).toBe(5800);
  await page.getByRole("button", { name: "Agendar visita" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Data", { exact: false }).fill(dayKey());
  await dialog.getByLabel("Horário").fill("15:30");
  await dialog.getByLabel("Endereço completo").fill("Rua do Teste, 200");
  await dialog.getByLabel("Responsável").fill("Rafael");
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(dialog).not.toBeVisible();
  expect(data.visitas.at(-1).responsavel).toBe("Rafael");
  await page.getByRole("button", { name: "Registrar interação" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Registro da interação")
    .fill("Cliente confirmou medidas.");
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByText("Cliente confirmou medidas.")).toBeVisible();
  await page.getByLabel("Alterar etapa").selectOption("negociacao");
  await expect(page.getByRole("status")).toContainText("salvas");
  expect(data.leads.at(-1).status).toBe("negociacao");
  await page.goto("/pipeline");
  await page
    .getByLabel("Etapa de Cliente Teste", { exact: true })
    .selectOption("orcamento_enviado");
  await expect.poll(() => data.leads.at(-1).status).toBe("orcamento_enviado");
  expect(errors).toEqual([]);
});
test("busca, filtros, status de visita e orçamento, catálogo", async ({
  page,
}) => {
  const { data, errors } = await mockAPI(page);
  await login(page);
  await page.goto("/leads");
  await page
    .getByRole("textbox", { name: "Buscar cliente, telefone ou serviço…" })
    .fill("Carlos");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Buscar cliente, telefone ou serviço…" })
    .fill("");
  await page.getByLabel("Status", { exact: true }).selectOption("novo");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto("/visitas");
  await page.getByRole("button", { name: "Editar visita" }).click();
  await page.getByRole("dialog").getByLabel("Status").selectOption("realizada");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(data.visitas[0].status).toBe("realizada");
  await page.goto("/orcamentos");
  await page.getByRole("button", { name: "Editar orçamento" }).first().click();
  await page.getByRole("dialog").getByLabel("Status").selectOption("aceito");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/servicos");
  await page.getByRole("button", { name: "Ativo • desativar" }).first().click();
  await expect(
    page.getByRole("button", { name: "Inativo • ativar" }),
  ).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("desktop, tablet e celular sem overflow global; menu acessível", async ({
  page,
}) => {
  const { errors } = await mockAPI(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await page.screenshot({
    path: "docs/screenshots/dashboard-desktop.png",
    fullPage: true,
  });
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/leads",
      "/pipeline",
      "/leads/l0",
      "/relatorios",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
    }
  }
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("link", { name: "Visão Geral" })).toBeVisible();
  await page.getByRole("link", { name: "Visão Geral" }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/dashboard-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("upload privado, miniatura e exclusão confirmada", async ({ page }) => {
  const { data, errors } = await mockAPI(page);
  await login(page);
  await page.goto("/leads/l0");
  await page
    .getByLabel("Arquivo (até 10 MB)")
    .setInputFiles({
      name: "local.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByRole("img", { name: "local.png" })).toBeVisible();
  expect(data.arquivos[0].url).toMatch(/^l0\//);
  expect(data.arquivos[0].url).not.toContain("https:");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir local.png" }).click();
  await expect(page.getByText("Nenhum arquivo anexado")).toBeVisible();
  expect(data.arquivos).toHaveLength(0);
  expect(errors).toEqual([]);
});
test("base vazia, erro ao salvar e acesso não autorizado", async ({ page }) => {
  const { data, errors } = await mockAPI(page);
  data.clientes = [];
  data.leads = [];
  data.orcamentos = [];
  data.interacoes = [];
  data.visitas = [];
  data.lead_historico = [];
  await login(page);
  await page.goto("/clientes");
  await expect(page.getByText("Nenhum registro encontrado")).toBeVisible();
  await page.route(
    "https://crm-test.supabase.co/rest/v1/clientes**",
    async (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 409,
            json: { code: "23505", message: "duplicate key" },
          })
        : route.fallback(),
  );
  await page.getByRole("button", { name: "Adicionar cliente" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill("Duplicado");
  await dialog.getByLabel("Telefone com DDD").fill("11999998888");
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Já existe");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.route(
    "https://crm-test.supabase.co/rest/v1/rpc/crm_autorizado",
    (route) => route.fulfill({ json: false }),
  );
  await page.getByRole("button", { name: "Atualizar dados" }).click();
  await expect(page.getByRole("alert")).toContainText("Usuário sem acesso");
  expect(errors).toEqual([]);
});
