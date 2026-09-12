# Vyra CRM — Front-end

Interface do Vyra CRM: dashboard, funil kanban, gestão de leads, equipe e
templates de comunicação.

## Stack

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack) | Padrão atual do ecossistema React |
| Linguagem | **TypeScript** | Contratos da API tipados de ponta a ponta |
| Estilo | **Tailwind CSS v4** | Tokens em OKLCH, tema claro/escuro nativo |
| Componentes | Primitivos **Radix UI** no padrão shadcn | Acessibilidade (foco, teclado, ARIA) de graça |
| Dados | **TanStack Query** | Cache, revalidação e atualização otimista |
| Sessão | **Zustand** (+ persist) | Estado de auth simples e persistente |
| Drag & drop | **dnd-kit** | Kanban acessível, com suporte a teclado |
| Gráficos | **Recharts** | Área, barra e rosca no dashboard |
| Animação | **Motion** | Transições discretas de entrada |
| Notificações | **Sonner** | Toasts seguindo o tema |

## Rodando

```bash
npm install
npm run dev
```

Abre em <http://localhost:3000>.

> A API Fastify também usa a porta 3000. Se for rodar as duas ao mesmo tempo,
> suba o front em outra porta: `npm run dev -- --port 3100`.

## Modo demonstração

Por padrão o front roda **sem backend**: `src/lib/mock-data.ts` gera 64 leads,
7 usuários, 2 pipelines e 6 templates de forma determinística, e
`src/lib/api.ts` opera sobre um store em memória. Arrastar cartões, fechar
oportunidades e criar usuários funcionam de verdade — as mudanças persistem
enquanto a aba estiver aberta.

Na tela de login, os botões **Administrador / Gerente / Consultor** preenchem o
formulário. Qualquer senha com 6+ caracteres é aceita.

### Conectando na API real

Em `.env.local`:

```bash
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Nenhuma outra mudança é necessária — `src/lib/api.ts` troca o transporte e passa
a enviar o `Authorization: Bearer <accessToken>` em cada requisição.

> **Estado atual da API:** `api/src/server.js` importa `crmRoutes` e `commsRoutes`
> mas não as registra, e importa `modules/logs/` e `modules/logs/admin.routes.js`,
> que não existem no repositório. Enquanto isso não for resolvido, a API não sobe
> e o modo demonstração é o caminho para desenvolver o front.

## Estrutura

```
src/
├── app/
│   ├── layout.tsx              # fontes, tema, providers
│   ├── page.tsx                # redireciona p/ dashboard ou login
│   ├── login/                  # split screen com painel de marca
│   └── (app)/                  # rotas autenticadas (shell com sidebar)
│       ├── dashboard/          # KPIs, séries, ranking, funil
│       ├── kanban/             # funil drag & drop
│       ├── leads/              # lista com filtros + paginação
│       │   └── [id]/           # perfil, timeline e ações do CRM
│       ├── ociosos/            # leads parados, por faixa de urgência
│       ├── usuarios/           # equipe e perfis de IA
│       ├── pipelines/          # etapas de cada funil
│       └── templates/          # modelos de e-mail e WhatsApp
├── components/
│   ├── ui/                     # design system (Button, Card, Dialog...)
│   ├── layout/                 # sidebar, topbar, busca global
│   ├── leads/                  # badges, cartão do funil, timeline
│   └── dashboard/              # cartões de métrica e gráficos
├── lib/
│   ├── api.ts                  # cliente único (mock ↔ API real)
│   ├── types.ts                # espelha o schema.prisma
│   ├── mock-data.ts            # base simulada
│   └── utils.ts                # formatação pt-BR, cn(), wa.me
└── stores/auth-store.ts        # sessão + permissões por papel
```

## Design system

Tokens definidos em `src/app/globals.css` com `@theme inline`. Cada cor existe
nas duas variantes; a classe `.dark` no `<html>` troca o conjunto inteiro.

- **Marca:** violeta/índigo (`--primary`), com `.bg-brand-gradient` para o logo,
  o painel de login e botões de destaque.
- **Semânticas:** `success`, `warning`, `destructive`, `info`.
- **Domínio:** `--frio`, `--morno`, `--quente` para a temperatura do lead.
- **Gráficos:** `--chart-1` a `--chart-5`, lidos direto pelo Recharts.

O tema é aplicado antes da primeira pintura por um script inline
(`themeScript`), o que elimina o flash de tema claro.

## Acessibilidade

- Navegação por teclado em todos os menus, diálogos e no kanban (dnd-kit).
- `aria-current` na rota ativa, `aria-invalid` nos campos com erro,
  `aria-label` nos botões só de ícone.
- Anéis de foco visíveis (`focus-visible:ring`) em todos os controles.
- `prefers-reduced-motion` desliga as animações.

## Atalhos

| Atalho | Ação |
| --- | --- |
| `Ctrl/Cmd + K` | Busca global de leads |
| `↑` `↓` | Navegar nos resultados |
| `Enter` | Abrir lead selecionado |
| `Esc` | Fechar |

## Scripts

```bash
npm run dev     # desenvolvimento (Turbopack)
npm run build   # build de produção
npm start       # servir o build
npm run lint    # ESLint
```
