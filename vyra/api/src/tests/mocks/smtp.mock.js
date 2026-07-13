// Mock do Nodemailer — não envia e-mail real
export const smtpMock = {
  sendMail: async (opcoes) => {
    console.log(`[SMTP Mock] E-mail para: ${opcoes.to} | Assunto: ${opcoes.subject}`)
    return { messageId: 'mock-message-id' }
  },
}