import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Senha só dos usuários CRIADOS agora (quem já existe mantém a sua).
// Em produção, passe SEED_SENHA para os novos não nascerem com a senha padrão.
const SENHA_PADRAO = process.env.SEED_SENHA || 'admin123'

/**
 * Gera o vetor de perfil do consultor via Gemini.
 *
 * Sem GEMINI_API_KEY o seed continua, mas os consultores ficam sem vetor — e
 * o worker passa a marcar todo lead como `semCriterio` (leads.worker.js:41-47).
 * Depois de configurar a chave, rode `npm run db:seed` de novo para preencher.
 */
async function gerarVetor(descricao) {
  if (!process.env.GEMINI_API_KEY) return []

  try {
    const { gerarEmbedding } = await import('../src/modules/leads/leads.ia.js')
    return await gerarEmbedding(descricao)
  } catch (err) {
    console.warn(`   ⚠️  Falha ao gerar embedding: ${err.message}`)
    return []
  }
}

// Empresa fictícia: distribuidora de produtos médico-hospitalares (Vyra Med).
// Cada consultor cuida de uma linha de produtos. Os textos são os mesmos de
// experimento/leads-medico.json, porque a linha de base de palavras-chave usa esses perfis.
const equipe = [
  {
    nome: 'Marina Albuquerque',
    email: 'marina@vyra.com',
    role: 'GERENTE',
    perfil: 'Gerente comercial da equipe de produtos médico-hospitalares.',
  },
  {
    nome: 'Ana Paula Souza',
    email: 'ana@vyra.com',
    role: 'CONSULTOR',
    perfil:
      'Atende hospitais, clínicas de imagem e consultórios médicos na compra de equipamentos de diagnóstico por imagem. Trabalha com ultrassom, raio-X digital, densitometria óssea, mamógrafos, tomógrafos, transdutores e sistemas de laudo.',
  },
  {
    nome: 'Bruno Tavares',
    email: 'bruno@vyra.com',
    role: 'CONSULTOR',
    perfil:
      'Atende UTIs, prontos-socorros e centros de terapia intensiva de hospitais públicos e privados. Trabalha com monitores multiparamétricos, ventiladores pulmonares, bombas de infusão, desfibriladores, oxímetros e capnografia.',
  },
  {
    nome: 'Carla Mendes',
    email: 'carla@vyra.com',
    role: 'CONSULTOR',
    perfil:
      'Atende centros cirúrgicos de hospitais, maternidades e clínicas de cirurgia ambulatorial. Trabalha com instrumentais cirúrgicos, mesas cirúrgicas, focos de luz, bisturi elétrico, aspiradores cirúrgicos, carrinhos de anestesia e caixas de instrumental.',
  },
  {
    nome: 'Diego Nakamura',
    email: 'diego@vyra.com',
    role: 'CONSULTOR',
    perfil:
      'Atende laboratórios de análises clínicas, bancos de sangue e hospitais com laboratório próprio. Trabalha com analisadores bioquímicos e hematológicos, reagentes, centrífugas, microscópios, controle de qualidade e automação laboratorial.',
  },
  {
    nome: 'Eduardo Lima',
    email: 'eduardo@vyra.com',
    role: 'CONSULTOR',
    perfil:
      'Atende dentistas, consultórios odontológicos, clínicas de odontologia e faculdades da área. Trabalha com cadeiras odontológicas, autoclaves, raio-X odontológico, compressores, fotopolimerizadores, canetas de alta rotação e equipos.',
  },
  {
    nome: 'Fernanda Rocha',
    email: 'fernanda@vyra.com',
    role: 'CONSULTOR',
    perfil:
      'Atende hospitais, clínicas, prontos-socorros e casas de repouso na reposição de material de consumo hospitalar. Trabalha com seringas, agulhas, cateteres, luvas de procedimento, EPIs, máscaras, aventais descartáveis, curativos e sondas.',
  },
  {
    nome: 'Gabriel Costa',
    email: 'gabriel@vyra.com',
    role: 'CONSULTOR',
    perfil:
      'Atende famílias, cuidadores e clínicas de reabilitação no cuidado domiciliar. Trabalha com camas hospitalares, cadeiras de rodas e de banho, andadores, colchões pneumáticos, concentradores de oxigênio e locação.',
  },
  {
    nome: 'Helena Martins',
    email: 'helena@vyra.com',
    role: 'CONSULTOR',
    perfil:
      'Atende hospitais, clínicas e laboratórios que precisam manter seus equipamentos médicos funcionando. Trabalha com manutenção preventiva e corretiva, calibração, testes de segurança elétrica, peças de reposição e contratos de assistência técnica.',
  },
]

const etapasPadrao = [
  { nome: 'Novo contato', ordem: 1, cor: '#8B5CF6' },
  { nome: 'Qualificação', ordem: 2, cor: '#6366F1' },
  { nome: 'Diagnóstico', ordem: 3, cor: '#0EA5E9' },
  { nome: 'Proposta enviada', ordem: 4, cor: '#14B8A6' },
  { nome: 'Negociação', ordem: 5, cor: '#F59E0B' },
  { nome: 'Ganhou', ordem: 9998, cor: '#22C55E', obrigatoria: true },
  { nome: 'Perdeu', ordem: 9999, cor: '#EF4444', obrigatoria: true },
]

const aquisicoes = [
  'Meta Ads',
  'Google Ads',
  'Landing page',
  'Indicação',
  'WhatsApp',
  'Evento',
]

const termosBloqueados = ['lorem ipsum', 'asdasd']


const leadsExemplo = [
  ['Fernanda Lima', 'Precisamos unificar o estoque de 3 filiais. Hoje cada uma usa uma planilha diferente.', 'meta_ads', 48000, 'QUENTE'],
  ['Ricardo Prado', 'Nosso ERP não integra com o marketplace. Perdemos vendas por erro de estoque.', 'google_ads', 32000, 'QUENTE'],
  ['Juliana Castro', 'Quero uma demonstração antes de levar para a diretoria.', 'landing_page', 75000, 'MORNO'],
  ['Marcelo Andrade', 'Time de vendas com 12 pessoas, perdemos muito lead por falta de acompanhamento.', 'indicacao', 26000, 'QUENTE'],
  ['Patrícia Nogueira', 'Preciso de emissão de NF-e e integração com a contabilidade.', 'google_ads', 18000, 'MORNO'],
  ['Thiago Barros', 'Temos problema de conformidade com a LGPD e precisamos de apoio técnico.', 'evento', 95000, 'QUENTE'],
  ['Camila Duarte', 'Qual o custo mensal para e-commerce com 5 mil pedidos/mês?', 'landing_page', 41000, 'MORNO'],
  ['Rodrigo Siqueira', 'Estamos comparando fornecedores. Vocês atendem o setor de saúde?', 'meta_ads', 60000, 'FRIO'],
  ['Beatriz Fontes', 'Migrar da planilha para um sistema de verdade. Por onde começo?', 'whatsapp', 12000, 'MORNO'],
  ['Gustavo Rezende', 'Queremos migrar toda a infraestrutura para a AWS este semestre.', 'indicacao', 120000, 'QUENTE'],
  ['Larissa Pires', 'Recebi indicação de um cliente de vocês. Podemos conversar?', 'indicacao', 35000, 'MORNO'],
  ['André Vasconcelos', 'Orçamento para 25 usuários. Temos urgência para fechar este mês.', 'google_ads', 55000, 'QUENTE'],
  ['Natália Moreira', 'Nosso PDV trava no horário de pico. Precisamos de algo mais robusto.', 'meta_ads', 28000, 'MORNO'],
  ['Felipe Cardoso', 'Como funciona a implantação e qual o prazo médio?', 'landing_page', 22000, 'FRIO'],
  ['Vanessa Ramos', 'Precisamos de backup e alta disponibilidade. Hoje não temos nada.', 'evento', 68000, 'QUENTE'],
  ['Leonardo Braga', 'Integração com Mercado Livre e Shopee é possível?', 'whatsapp', 30000, 'MORNO'],
  ['Sabrina Teixeira', 'Quero entender melhor os planos antes de decidir.', 'landing_page', 15000, 'FRIO'],
  ['Otávio Marques', 'Automação de marketing integrada ao CRM — vocês fazem?', 'google_ads', 44000, 'MORNO'],
]

async function main() {
  console.log('🌱 Iniciando seed...\n')

  // ── Usuários ──────────────────────────────────────────────────────────────
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10)

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@vyra.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@vyra.com',
      senha: senhaHash,
      role: 'ADMIN',
    },
  })
  console.log(`✅ Admin: ${admin.email}`)

  const temChave = Boolean(process.env.GEMINI_API_KEY)
  if (!temChave) {
    console.warn('⚠️  GEMINI_API_KEY ausente — consultores ficarão sem vetor de perfil.')
    console.warn('   Configure a chave em api/.env e rode `npm run db:seed` de novo.\n')
  }

  let gerenteId = null
  const consultores = []

  for (const membro of equipe) {
    const consultor = membro.role === 'CONSULTOR'
    const vetorPerfil = consultor ? await gerarVetor(membro.perfil) : []

    // Quem já existe tem o perfil e o vetor atualizados juntos. Se o Gemini falhar, nada muda,
    // para o consultor não ficar com o texto novo e o vetor antigo. Nome, senha e equipe não mudam.
    let atualizacao = {}
    if (!consultor) atualizacao = { perfilDescricao: membro.perfil }
    else if (vetorPerfil.length > 0) atualizacao = { vetorPerfil, perfilDescricao: membro.perfil }

    const usuario = await prisma.usuario.upsert({
      where: { email: membro.email },
      update: atualizacao,
      create: {
        nome: membro.nome,
        email: membro.email,
        senha: senhaHash,
        role: membro.role,
        vetorPerfil,
        perfilDescricao: membro.perfil,
        gerenteId: membro.role === 'CONSULTOR' ? gerenteId : null,
      },
    })

    if (membro.role === 'GERENTE') gerenteId = usuario.id
    else consultores.push(usuario)

    if (consultor && vetorPerfil.length === 0) {
      console.warn(`⚠️  CONSULTOR: ${usuario.email} — perfil NÃO atualizado (sem vetor). Rode o seed de novo.`)
    } else {
      const marca = consultor ? `perfil e vetor de ${vetorPerfil.length}d` : 'perfil'
      console.log(`✅ ${membro.role}: ${usuario.email} (${marca})`)
    }
  }

  // ── Pipeline e etapas ─────────────────────────────────────────────────────
  let pipeline = await prisma.pipeline.findFirst({ where: { nome: 'Comercial padrão' } })

  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        nome: 'Comercial padrão',
        ordem: 1,
        etapas: {
          create: etapasPadrao.map((e) => ({
            nome: e.nome,
            ordem: e.ordem,
            cor: e.cor,
            obrigatoria: e.obrigatoria ?? false,
          })),
        },
      },
    })
    console.log(`\n✅ Pipeline "Comercial padrão" com ${etapasPadrao.length} etapas`)
  } else {
    console.log('\n✅ Pipeline já existe')
  }

  const etapas = await prisma.etapa.findMany({
    where: { pipelineId: pipeline.id },
    orderBy: { ordem: 'asc' },
  })
  const abertas = etapas.filter((e) => !e.obrigatoria)
  const ganhou = etapas.find((e) => e.nome === 'Ganhou')
  const perdeu = etapas.find((e) => e.nome === 'Perdeu')

  // ── Configurações ─────────────────────────────────────────────────────────
  for (const nome of aquisicoes) {
    const existe = await prisma.aquisicao.findFirst({ where: { nome } })
    if (!existe) await prisma.aquisicao.create({ data: { nome } })
  }
  console.log(`✅ ${aquisicoes.length} canais de aquisição`)

  for (const termo of termosBloqueados) {
    await prisma.termoBloqueado.upsert({
      where: { termo },
      update: {},
      create: { termo },
    })
  }
  console.log(`✅ ${termosBloqueados.length} termos bloqueados`)

  // ── Leads de exemplo ──────────────────────────────────────────────────────
  const jaTemLeads = await prisma.lead.count()

  if (jaTemLeads > 0) {
    console.log(`\n✅ ${jaTemLeads} leads já existem — pulando exemplos.`)
  } else {
    const agora = Date.now()

    for (const [i, [nome, mensagem, origem, valor, marcador]] of leadsExemplo.entries()) {
      // Distribui pelo funil: a maioria em aberto, alguns já fechados.
      let status = 'EM_ANDAMENTO'
      let etapaId = abertas[i % abertas.length].id

      if (i % 6 === 0) {
        status = 'NOVO'
        etapaId = abertas[0].id
      } else if (i % 7 === 3) {
        status = 'GANHOU'
        etapaId = ganhou.id
      } else if (i % 9 === 5) {
        status = 'PERDEU'
        etapaId = perdeu.id
      }

      const diasAtras = (i * 3) % 40
      const criadoEm = new Date(agora - diasAtras * 86400000)
      // Alguns ficam parados de propósito, para a régua de ociosidade ter o que mostrar.
      const paradoHa = i % 4 === 0 ? (i % 11) + 3 : 0

      await prisma.lead.create({
        data: {
          nome,
          email: `${nome.split(' ')[0].toLowerCase()}@exemplo.com.br`,
          telefone: `119${String(80000000 + i * 137).slice(0, 8)}`,
          mensagem,
          origem,
          status,
          marcador,
          valorEstimado: valor,
          motivoPerda: status === 'PERDEU' ? 'Preço acima do orçamento' : null,
          consultorId: consultores[i % consultores.length]?.id ?? null,
          pipelineId: pipeline.id,
          etapaId,
          createdAt: criadoEm,
          ultimaMovimentacao: new Date(agora - paradoHa * 86400000),
        },
      })
    }
    console.log(`✅ ${leadsExemplo.length} leads de exemplo`)
  }

  if (process.env.SEED_SENHA) {
    console.log('\n🔑 Usuários criados agora usam a senha passada em SEED_SENHA. Quem já existia manteve a sua.\n')
  } else {
    console.log(`\n🔑 Login: admin@vyra.com / ${SENHA_PADRAO}`)
    console.log('   Os demais usuários usam a mesma senha.')
    console.log('⚠️  Troque as senhas antes de qualquer uso real.\n')
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
