import { MODELOS_MENSAGEM_PADRAO } from "@/services/modelosMensagens"

function formatarTelefoneParaWhatsapp(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "")
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos
  return `55${digitos}`
}

export function gerarLinkWhatsapp(telefone: string, mensagem: string): string {
  const numero = formatarTelefoneParaWhatsapp(telefone)
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

function formatarDataBR(data: string): string {
  const [ano, mes, dia] = data.split("-")
  return `${dia}/${mes}/${ano}`
}

function formatarMoedaBR(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function rotuloFormaPagamento(formaPagamento: string): string {
  const rotulos: Record<string, string> = {
    pix: "Pix",
    dinheiro: "Dinheiro",
    cartao: "Cartão",
    promissoria: "Promissória",
  }

  return rotulos[formaPagamento] ?? formaPagamento
}

export function rotuloParcela(parcela: number, totalParcelas: number): string {
  return totalParcelas > 1 ? `Parcela ${parcela}/${totalParcelas}` : "Pagamento único"
}

function trechoParcela(parcela: number, totalParcelas: number): string {
  return totalParcelas > 1
    ? `da parcela ${parcela}/${totalParcelas}`
    : "do pagamento único"
}

function preencherModelo(modelo: string, variaveis: Record<string, string>): string {
  return modelo.replace(/{{\s*([a-z_]+)\s*}}/gi, (correspondencia, nome: string) => {
    return variaveis[nome.toLowerCase()] ?? correspondencia
  })
}

export function mensagemLembrete(params: {
  modelo?: string
  nomeCliente: string
  parcela: number
  totalParcelas: number
  valor: number
  vencimento: string
  formaPagamento: string
  nomeLoja: string
}): string {
  return preencherModelo(params.modelo ?? MODELOS_MENSAGEM_PADRAO.cobranca, {
    cliente: params.nomeCliente,
    parcela_texto: trechoParcela(params.parcela, params.totalParcelas),
    valor: formatarMoedaBR(params.valor),
    vencimento: formatarDataBR(params.vencimento),
    data_pagamento: "",
    forma_pagamento: rotuloFormaPagamento(params.formaPagamento),
    loja: params.nomeLoja,
  })
}

export function mensagemComprovante(params: {
  modelo?: string
  nomeCliente: string
  parcela: number
  totalParcelas: number
  valor: number
  dataPagamento: string
  formaPagamento: string
  nomeLoja: string
}): string {
  return preencherModelo(params.modelo ?? MODELOS_MENSAGEM_PADRAO.recibo, {
    cliente: params.nomeCliente,
    parcela_texto: trechoParcela(params.parcela, params.totalParcelas),
    valor: formatarMoedaBR(params.valor),
    vencimento: "",
    data_pagamento: formatarDataBR(params.dataPagamento),
    forma_pagamento: rotuloFormaPagamento(params.formaPagamento),
    loja: params.nomeLoja,
  })
}

export function mensagemCobrancaGeral(params: {
  nomeCliente: string
  totalDevido: number
  proximoVencimento: string
  nomeLoja: string
}): string {
  return `Oi ${params.nomeCliente}! Tudo bem? Você está com um saldo em aberto de ${formatarMoedaBR(
    params.totalDevido
  )}, com vencimento mais próximo em ${formatarDataBR(
    params.proximoVencimento
  )}. Qualquer dúvida sobre isso, me chama por aqui 😊\n\n${params.nomeLoja}`
}
