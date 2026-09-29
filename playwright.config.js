import { defineConfig } from "@playwright/test";
// Chave sintética exclusivamente para servidor de testes; não autentica em nenhum projeto.
const fakeKey = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ role: "anon", iss: "test" })).toString("base64url")}.test-signature`;
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: "http://127.0.0.1:5179",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5179 --strictPort",
    url: "http://127.0.0.1:5179",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      VITE_SUPABASE_URL: "https://crm-test.supabase.co",
      VITE_SUPABASE_ANON_KEY: fakeKey,
    },
  },
});
