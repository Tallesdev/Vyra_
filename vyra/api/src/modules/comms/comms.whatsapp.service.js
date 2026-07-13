import { registrarEvento } from '../crm/crm.timeline.js'

export function gerarLinkWhatsapp(telefone, mensagem) {
  const numero  = telefone.replace(/\D/g, '')
  const encoded = encodeURIComponent(mensagem)
  return `https://wa.me/${numero}?text=${encoded}`
}

export async function registrarWhatsapp({ leadId, consultorId, telefone, mensagemEnviada, templateId }) {
  await registrarEvento({
    leadId,
    tipo: 'WHATSAPP',
    descricao: `Contato via WhatsApp para ${telefone}`,
    metadata: { telefone, mensagem: mensagemEnviada, templateId: templateId ?? null },
    usuario: { id: consultorId }
  })
}