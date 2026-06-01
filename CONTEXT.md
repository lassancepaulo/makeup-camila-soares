# MAKEUP CAMILA SOARES — Contexto do Projeto
> Atualizado: 2026-06-01 | Para uso em novas sessões Claude

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
│   ├── logo-brand.jpg          # Logo original JPG (não usada ativamente)
│   ├── favicon.svg             # Fallback favicon SVG (coral "cS")
│   ├── logo.svg / logo-white.svg  # SVGs gerados (substituídos pelas PNGs reais)
│   └── logo-white.PNG / logo.JPG  # Originais do usuário (maiúsculas — não referenciar)
├── css/
│   ├── style.css               # Site público
│   └── admin.css               # Painel admin
├── js/
│   ├── admin.js                # Core do admin (auth, formatMoney/formatBRL, initEstoqueBadge, toast)
│   ├── agenda.js               # Agenda visual semanal
│   ├── pipeline.js             # Kanban de prospects
│   ├── estoque.js              # Controle de estoque
│   ├── faturamento.js          # Gráficos de faturamento (Chart.js)
│   ├── custos.js               # Custos/deslocamento por atendimento
│   ├── booking.js              # Agendamento público
│   ├── bookingAdmin.js         # Agendamentos no admin
│   ├── dataService.js          # Serviço de dados (localStorage)
│   ├── main.js                 # JS do site público
│   ├── services-config.js      # Configuração de serviços
│   └── siteConfig.js           # Config do site
└── admin/
    ├── index.html              # Dashboard
    ├── agenda.html             # Agenda semanal visual
    ├── agendamentos.html       # Lista de agendamentos
    ├── clientes.html           # CRM de clientes
    ├── orcamentos.html         # Lista de orçamentos
    ├── orcamento-novo.html     # Criar/editar orçamento
    ├── pipeline.html           # Kanban de prospects
    ├── faturamento.html        # Relatórios financeiros
    ├── estoque.html            # Controle de estoque
    └── site-editor.html        # Editor de conteúdo do site
```

---

## 🗄 Armazenamento (localStorage)
> **Não há banco de dados.** Todos os dados ficam no localStorage do browser da Camila.

| Chave localStorage        | Conteúdo |
|---------------------------|----------|
| `camilaOrcamentos`        | Array de orçamentos |
| `camilaAgendamentos`      | Array de agendamentos |
| `camilaClientes`          | Array de clientes |
| `camilaCustos`            | Custos e deslocamentos |
| `camilaPipeline`          | Cards do Kanban |
| `camilaEstoque`           | Produtos do estoque |
| `camilaMeta`              | Meta mensal de faturamento |
| `sessionStorage.camilaAdmin` | `'true'` quando logado |
| `sessionStorage.pipelineToQuote` | Handoff Pipeline → Orçamento Novo |

---

## 🎨 Identidade Visual

### Paleta coral (aplicada em admin.css e style.css)
```css
--coral:           #F07272
--coral-dark:      #D85A5A
--coral-light:     #F9ABAB
--gradient:        linear-gradient(135deg, #F07272, #D85A5A)
--dark:            #2A1414
--dark-soft:       #3D1E1E
--sidebar-bg:      #1F0C0C   (admin)
--cream:           #FEE8E8
--cream-light:     #FFF8F8
```

### Logo real (marca Makeup Camila Soares)
- **Escura:** `assets/logo-black.png` — navbar ao rolar, login, favicon
- **Branca:** `assets/logo-brand-white.png` — navbar hero, rodapé, sidebar admin
- **Altura no navbar:** `128px` (CSS `.nav-logo-img { height: 128px }`)
- **Transição:** opacity fade (sem salto de layout)

---

## 📋 Módulos do Painel Admin

### 1. Dashboard (`admin/index.html`)
- KPIs: Total Orçamentos, Faturamento do Mês, Pendentes, Pagos, Agendamentos
- **Meta mensal:** card com barra de progresso — `localStorage.camilaMeta`
- Função `loadMetaCard()` + `openMetaEdit()` inline no HTML
- Orçamentos recentes + Agendamentos pendentes

### 2. Agenda Visual Semanal (`admin/agenda.html` + `js/agenda.js`)
- Grid semanal 07:00–21:00 (slots de 30min)
- Navega por semana com prev/next/hoje
- Preenche com `camilaAgendamentos` + orçamentos aprovados/pagos
- Detecção de conflitos (mesmo dia/hora → borda vermelha)
- Modal de detalhe com link WhatsApp direto
- Hoje destacado em coral

### 3. Agendamentos (`admin/agendamentos.html`)
- Lista com filtros, modal de custos/deslocamento
- `js/bookingAdmin.js` + `js/custos.js`

### 4. Clientes (`admin/clientes.html`)
- CRM com busca, histórico, botão WhatsApp

### 5. Orçamentos (`admin/orcamentos.html` + `admin/orcamento-novo.html`)
- Filtros por status/serviço/mês
- Gerador de mensagem WhatsApp
- Pre-fill via `sessionStorage.pipelineToQuote` (vindo do Pipeline)

### 6. Pipeline Kanban (`admin/pipeline.html` + `js/pipeline.js`)
- 6 colunas: Lead → Em Contato → Orçamento Enviado → Negociando → Fechado → Perdido
- Drag & drop nativo (HTML5)
- KPIs: Total, Ativos, Taxa de Fechamento, Valor em Pipeline
- Botão "Converter em Orçamento" → preenche orcamento-novo.html

### 7. Faturamento (`admin/faturamento.html` + `js/faturamento.js`)
- Chart.js 4.x: receita×despesas×lucro, serviços, forma de pagamento, funil de conversão
- Filtro por ano
- KPIs: Bruto, Despesas, Lucro, Margem, Mês Atual, Média, Conversão, Melhor Mês

### 8. Estoque (`admin/estoque.html` + `js/estoque.js`)
- 13 categorias de produtos de makeup
- Controles ±1 inline na tabela
- Badge vermelho no sidebar quando qty ≤ minQty (`initEstoqueBadge()` em admin.js)
- `localStorage.camilaEstoque`

### 9. Editor do Site (`admin/site-editor.html`)
- Edita conteúdo do site público (textos, contatos, horários)

---

## 🔧 Funções Globais (admin.js)
```javascript
requireAuth()          // Redireciona para login se não autenticado
logout()               // Limpa sessionStorage e redireciona
formatMoney(v)         // R$ 1.234,56
const formatBRL = formatMoney   // Alias usado por pipeline.js e estoque.js
initEstoqueBadge()     // Atualiza badge vermelho de estoque baixo no sidebar
showToast(msg)         // Toast de confirmação
openModal() / closeModal()
```

---

## 🚀 Deploy

### Fluxo de atualização
```bash
# Na pasta do projeto:
git add -A
git commit -m "descrição"
git push origin master
# Railway redesploya automaticamente em ~1 min
```

### Configuração Railway
- Build: Nixpacks (auto-detecta Node.js)
- Start: `node server.js`
- PORT: injetado automaticamente via env var
- Domínio custom: `makeupcamilasoares.com` (DNS only no Cloudflare)

### Cloudflare
- DNS **sem proxy** (nuvem cinza ⬜) — Railway cuida do SSL
- SSL "Full" configurado
- CNAME raiz aponta para `makeup-camila-soares-production.up.railway.app`

---

## 📌 Pendências / Próximos Passos
- [ ] **Instagram API** — vincular Instagram para puxar postagens no site público
- [ ] Cloudflare proxy (CDN) — reativar com Origin Certificate se quiser performance extra
- [ ] Adicionar fotos reais de portfólio
- [ ] Configurar senha admin mais segura (atualmente em admin-login.html hardcoded)
- [ ] Considerar migrar dados de localStorage para Supabase no futuro

---

## ⚠️ Notas Importantes
1. **Server.js escuta em `0.0.0.0`** (obrigatório para Railway — não mudar para 127.0.0.1)
2. **Logo filenames são case-sensitive no Linux** — sempre usar lowercase: `logo-black.png`, `logo-brand-white.png`
3. **Admin auth** é via `sessionStorage.camilaAdmin = 'true'` — simples, sem JWT
4. **Não há API backend** — tudo é estático + localStorage
5. **Sidebar badge de estoque** (`#estoqueBadge`) funciona em todas as páginas via `initEstoqueBadge()` em admin.js — não precisa carregar estoque.js
6. **Pipeline → Orçamento** usa `sessionStorage.pipelineToQuote` como bridge
