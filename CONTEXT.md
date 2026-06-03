# MAKEUP CAMILA SOARES — Contexto do Projeto
> Atualizado: 2026-06-03 | Para uso em novas sessões Claude

---

## 🌐 Projeto Online
- **URL pública:** https://makeupcamilasoares.com
- **Admin:** https://makeupcamilasoares.com/admin-login.html
- **Usuário:** `camila` | **Senha:** `makeup2024`
- **GitHub:** https://github.com/lassancepaulo/makeup-camila-soares
- **Railway:** https://railway.app (projeto: makeup-camila-soares)
- **Domínio:** Cloudflare (DNS only — proxy desligado, Railway cuida do SSL)
- **Deploy:** automático a cada `git push origin master`

---

## 🗄 Supabase (integrado em 2026-06-03)
- **Projeto:** "PROJETOS LANCA DEV" (id: `tnbrntnycifdoknxuouo`, região: sa-east-1)
- **URL:** https://tnbrntnycifdoknxuouo.supabase.co
- **Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYnJudG55Y2lmZG9rbnh1b3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NDI2MTcsImV4cCI6MjA4ODUxODYxN30.wAdg-z8F8bHMA4PuLfWXnTKpfeF2nF0232m7W5Sv9Ik`

### Tabelas criadas (todas com RLS `allow_anon_all`):
| Tabela | Conteúdo |
|---|---|
| `makeup_orcamentos` | Orçamentos |
| `makeup_agendamentos` | Agendamentos |
| `makeup_clientes` | Clientes/CRM |
| `makeup_custos` | Custos/deslocamento |
| `makeup_estoque` | Estoque de produtos |
| `makeup_pipeline` | Cards do Kanban |
| `makeup_config` | Configurações (meta, studioAddress, fuelPrefs) |

### Schema padrão:
```sql
(id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW())
```
- `makeup_config`: `(key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ)`

### Arquivo de integração: `js/supabase-client.js`
Expõe `window.DB` com:
- `DB.prefetch(lsKey)` — carrega do Supabase → localStorage
- `DB.sync(lsKey, items)` — sincroniza array completo → Supabase
- `DB.getConfig(key)` / `DB.setConfig(key, value)` — chave-valor na `makeup_config`
- `DB.prefetchAll(keys)` — prefetch de múltiplas entidades em paralelo

### Padrão de uso:
- **Leitura:** cada função `loadXxx()` é `async` e faz `await DB.prefetch(key)` antes de ler localStorage
- **Escrita:** cada `saveXxx(data)` faz `localStorage.setItem(key, data)` + `DB.sync(key, data)` (fire-and-forget)

---

## 🐛 BUG CRÍTICO ENCONTRADO E CORRIGIDO (ainda NÃO deployado)

### Causa raiz: conflito `const` vs `function` no mesmo escopo global
- `services-config.js` declara `function formatBRL(value) { ... }` (global)
- `admin.js` tinha `const formatBRL = formatMoney` — em strict mode isso gera `SyntaxError: Identifier 'formatBRL' has already been declared`
- **Resultado:** admin.js inteiro falhava silenciosamente. Nenhuma função era definida (`requireAuth`, `addItemRow`, `initOrcamentoForm`, etc.)
- **Páginas afetadas:** qualquer página que carregue AMBOS `services-config.js` + `admin.js`:
  - `admin/orcamento-novo.html` ← principal reclamação do usuário
  - `admin/clientes.html`
  - `admin/agendamentos.html`
  - `admin/site-editor.html`

### Fix aplicado (em `js/admin.js`, linha ~98):
```javascript
// ANTES (quebrado):
const formatBRL = formatMoney;

// DEPOIS (corrigido):
var formatBRL = formatMoney;
```
**Status: corrigido localmente, ainda NÃO commitado/deployado.**

---

## 🗂 Estrutura de Arquivos

```
Makeup Camila Soares/
├── index.html                  # Site público (single-page)
├── admin-login.html            # Tela de login do painel
├── server.js                   # Servidor Node.js estático (porta process.env.PORT || 3300)
├── package.json                # scripts.start = "node server.js"
├── Procfile                    # web: node server.js (Railway)
├── railway.json                # startCommand: node server.js
├── .gitignore
├── assets/
│   ├── logo-black.png          # Logo escura (navbar scrolled, login, favicon)
│   ├── logo-brand-white.png    # Logo branca (navbar hero, footer, sidebar admin)
│   └── favicon.svg             # Fallback favicon SVG
├── css/
│   ├── style.css               # Site público
│   └── admin.css               # Painel admin
└── js/
    ├── supabase-client.js      # ★ NOVO — cliente Supabase (window.DB)
    ├── admin.js                # Core do admin (auth, storage, dashboard, orçamentos, PDF)
    ├── agenda.js               # Agenda visual semanal
    ├── pipeline.js             # Kanban de prospects
    ├── estoque.js              # Controle de estoque
    ├── faturamento.js          # Gráficos de faturamento (Chart.js)
    ├── custos.js               # Custos/deslocamento por atendimento
    ├── booking.js              # Agendamento público
    ├── bookingAdmin.js         # Agendamentos no admin
    ├── dataService.js          # Serviço de dados (localStorage + Supabase sync)
    ├── main.js                 # JS do site público
    ├── services-config.js      # Configuração de serviços (DEFINE formatBRL globalmente!)
    └── siteConfig.js           # Config do site
```

---

## 🗄 Armazenamento
> **Arquitetura híbrida:** localStorage como cache + Supabase como persistência real.

| Chave localStorage | Tabela Supabase | Conteúdo |
|---|---|---|
| `camilaOrcamentos` | `makeup_orcamentos` | Array de orçamentos |
| `camilaAgendamentos` | `makeup_agendamentos` | Array de agendamentos |
| `camilaClientes` | `makeup_clientes` | Array de clientes |
| `camilaCustos` | `makeup_custos` | Custos e deslocamentos |
| `camilaPipeline` | `makeup_pipeline` | Cards do Kanban |
| `camilaEstoque` | `makeup_estoque` | Produtos do estoque |
| `camilaMeta` | `makeup_config` key=`meta` | Meta mensal de faturamento |
| `camilaStudioAddress` | `makeup_config` key=`studioAddress` | Endereço do estúdio |
| `camilaFuelPrefs` | `makeup_config` key=`fuelPrefs` | Preferências de combustível |
| `sessionStorage.camilaAdmin` | — | `'true'` quando logado |

---

## 🎨 Identidade Visual

```css
--coral: #F07272 | --coral-dark: #D85A5A | --gradient: linear-gradient(135deg, #F07272, #D85A5A)
--dark: #2A1414 | --sidebar-bg: #1F0C0C | --cream: #FEE8E8
```

Logo escura: `assets/logo-black.png` — Logo branca: `assets/logo-brand-white.png`

---

## 📋 Módulos do Painel Admin

### Carregamento de scripts por página (IMPORTANTE para evitar conflitos):
| Página | Scripts carregados | Notas |
|---|---|---|
| `orcamento-novo.html` | jsPDF + services-config + **supabase** + admin | services-config define formatBRL! |
| `clientes.html` | services-config + **supabase** + admin | services-config define formatBRL! |
| `agendamentos.html` | services-config + **supabase** + custos + admin + bookingAdmin | services-config define formatBRL! |
| `site-editor.html` | services-config + **supabase** + admin | services-config define formatBRL! |
| `orcamentos.html` | **supabase** + admin | OK |
| `pipeline.html` | **supabase** + admin + pipeline | OK |
| `estoque.html` | **supabase** + admin + estoque | OK |
| `agenda.html` | **supabase** + admin + agenda | OK |
| `faturamento.html` | Chart.js + **supabase** + admin + faturamento | OK |
| `index.html` (admin) | Chart.js + **supabase** + admin | OK |

---

## 🚀 Deploy

```bash
git add -A
git commit -m "descrição"
git push origin master
# Railway redesploya automaticamente em ~1 min
```

---

## ⚠️ Notas Importantes
1. **`server.js` escuta em `0.0.0.0`** — obrigatório para Railway
2. **Logo filenames são case-sensitive no Linux** — sempre lowercase
3. **`var formatBRL = formatMoney`** em admin.js — NÃO mudar para `const`! services-config.js já declara `function formatBRL()` e causaria SyntaxError em strict mode
4. **`initOrcamentoForm` e `loadOrcamentosPage`** são async — listeners de UI ficam ANTES do `await`
5. **Supabase CDN** carregado em todas as páginas admin: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`

---

## 📌 O QUE FALTA FAZER (próxima sessão)

### ✅ FEITO:
- [x] Criadas 7 tabelas no Supabase
- [x] Criado `js/supabase-client.js` com `window.DB`
- [x] Todos os `loadXxx()` são async com prefetch
- [x] Todos os `saveXxx()` fazem sync para Supabase
- [x] Supabase CDN adicionado em todos os HTML admin + index.html público
- [x] Fix de race condition em `initOrcamentoForm` e `loadOrcamentosPage` (listeners antes do await)
- [x] Fix do bug crítico: `var formatBRL` em vez de `const formatBRL` no admin.js

### ❌ PENDENTE (começar aqui na próxima sessão):
1. **DEPLOY do fix `var formatBRL`** — está corrigido localmente mas NÃO commitado/pushado
   - Arquivo: `js/admin.js`, linha ~98: `var formatBRL = formatMoney;` ← já está no arquivo, só precisa de commit+push
   
2. **Editor de Site (`admin/site-editor.html`)** — usuário disse que não consegue salvar dados de contato
   - O bug do `formatBRL` provavelmente causava isso também (mesmo fix)
   - Verificar se há algo específico no save do site-editor após o deploy

3. **Testar no Railway** (após deploy):
   - Orcamento-novo: adicionar item, preencher valores, salvar
   - Site-editor: salvar dados de contato
   - Dashboard: verificar se KPIs carregam do Supabase

4. **Itens futuros:**
   - Instagram API para postagens no site público
   - Fotos reais de portfólio
   - Senha admin mais segura
