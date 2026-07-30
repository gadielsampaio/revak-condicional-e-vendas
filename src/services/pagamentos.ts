import { adicionarMesesISO, hojeLocalISO } from "@/lib/datas"
import {
  arredondarCentavos,
  distribuirEmParcelas,
  ratearValorLiquido,
  valorFinanceiro,
} from "@/lib/valores"
import { supabase } from "@/services/supabase"

export type FormaPagamento = "pix" | "dinheiro" | "cartao" | "promissoria"

export type Pagamento = {
  id: string
  movimentacao_id: string
  parcela: number
  total_parcelas: number
  valor: number
  forma_pagamento: FormaPagamento
  vencimento: string
  data_pagamento: string | null
  status: "pendente" | "pago"
  taxa_cartao: number | null
  valor_liquido: number | null
}

type DadosPagamento = {
  movimentacao_id: string
  forma_pagamento: FormaPagamento
  valor_total: number
  data_recebimento?: string
  taxa_cartao?: number
  numero_parcelas?: number
  primeira_data?: string
}

async function garantirMovimentacaoSemPagamento(movimentacaoId: string) {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id")
    .eq("movimentacao_id", movimentacaoId)
    .limit(1)

  if (error) throw error

  if ((data ?? []).length > 0) {
    throw new Error("Esta venda já possui pagamento registrado.")
  }
}

export async function registrarPagamento(dados: DadosPagamento) {
  const hoje = hojeLocalISO()
  const valorTotal = arredondarCentavos(dados.valor_total)

  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.")
  }

  await garantirMovimentacaoSemPagamento(dados.movimentacao_id)

  if (dados.forma_pagamento === "pix" || dados.forma_pagamento === "dinheiro") {
    const { error } = await supabase.from("pagamentos").insert({
      movimentacao_id: dados.movimentacao_id,
      parcela: 1,
      total_parcelas: 1,
      valor: valorTotal,
      forma_pagamento: dados.forma_pagamento,
      vencimento: hoje,
      data_pagamento: hoje,
      status: "pago",
    })

    if (error) throw error
    return
  }

  if (dados.forma_pagamento === "cartao") {
    if (!dados.data_recebimento) {
      throw new Error("Informe a data prevista de recebimento do cartão.")
    }

    const taxa = dados.taxa_cartao ?? 0
    if (!Number.isFinite(taxa) || taxa < 0 || taxa > 100) {
      throw new Error("A taxa do cartão deve estar entre 0% e 100%.")
    }

    const valorLiquido = arredondarCentavos(valorTotal - (valorTotal * taxa) / 100)

    const { error } = await supabase.from("pagamentos").insert({
      movimentacao_id: dados.movimentacao_id,
      parcela: 1,
      total_parcelas: 1,
      valor: valorTotal,
      forma_pagamento: "cartao",
      vencimento: dados.data_recebimento,
      status: "pendente",
      taxa_cartao: taxa || null,
      valor_liquido: taxa ? valorLiquido : null,
    })

    if (error) throw error
    return
  }

  const numeroParcelas = dados.numero_parcelas ?? 1
  if (!Number.isInteger(numeroParcelas) || numeroParcelas < 1 || numeroParcelas > 120) {
    throw new Error("O número de parcelas deve estar entre 1 e 120.")
  }

  if (!dados.primeira_data) {
    throw new Error("Informe a data da primeira parcela.")
  }

  const valoresParcelas = distribuirEmParcelas(valorTotal, numeroParcelas)
  const parcelas = valoresParcelas.map((valor, index) => ({
    movimentacao_id: dados.movimentacao_id,
    parcela: index + 1,
    total_parcelas: numeroParcelas,
    valor,
    forma_pagamento: "promissoria",
    vencimento: adicionarMesesISO(dados.primeira_data!, index),
    status: "pendente" as const,
  }))

  const { error } = await supabase.from("pagamentos").insert(parcelas)
  if (error) throw error
}

export async function listarPagamentosPorMovimentacao(movimentacao_id: string) {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("movimentacao_id", movimentacao_id)
    .order("parcela")

  if (error) throw error
  return data as Pagamento[]
}

export async function marcarComoPagas(ids: string[], data_pagamento?: string) {
  if (ids.length === 0) return

  const data = data_pagamento ?? hojeLocalISO()
  const { error } = await supabase
    .from("pagamentos")
    .update({ status: "pago", data_pagamento: data })
    .in("id", ids)
    .eq("status", "pendente")

  if (error) throw error
}

export async function quitarRestante(movimentacao_id: string) {
  const hoje = hojeLocalISO()
  const { error } = await supabase
    .from("pagamentos")
    .update({ status: "pago", data_pagamento: hoje })
    .eq("movimentacao_id", movimentacao_id)
    .eq("status", "pendente")

  if (error) throw error
}

export async function pagarParcialmente(
  pagamento: Pagamento,
  valorRecebido: number,
  novoVencimentoRestante?: string
) {
  const hoje = hojeLocalISO()

  const { data: pendentes, error } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("movimentacao_id", pagamento.movimentacao_id)
    .eq("status", "pendente")
    .order("parcela")

  if (error) throw error

  const parcelasPendentes = pendentes as Pagamento[]
  const parcelaSelecionada = parcelasPendentes.find((p) => p.id === pagamento.id)

  if (!parcelaSelecionada) {
    throw new Error("Esta parcela já foi recebida ou não está mais disponível.")
  }

  const saldoDevedor = arredondarCentavos(
    parcelasPendentes.reduce((soma, p) => soma + valorFinanceiro(p), 0)
  )
  const recebido = arredondarCentavos(valorRecebido)

  if (!Number.isFinite(recebido) || recebido <= 0) {
    throw new Error("Informe um valor recebido maior que zero.")
  }

  if (recebido > saldoDevedor + 0.009) {
    throw new Error(
      `O valor recebido (${recebido.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}) é maior que o saldo a receber (${saldoDevedor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}).`
    )
  }

  const posteriores = parcelasPendentes.filter(
    (p) => p.id !== pagamento.id && p.parcela > parcelaSelecionada.parcela
  )
  const anteriores = parcelasPendentes.filter(
    (p) => p.id !== pagamento.id && p.parcela <= parcelaSelecionada.parcela
  )
  const parcelasNaOrdem = [parcelaSelecionada, ...posteriores, ...anteriores]
  let restanteDoRecebimento = recebido

  for (const parcela of parcelasNaOrdem) {
    if (restanteDoRecebimento <= 0.009) break

    const valorDaParcela = valorFinanceiro(parcela)

    if (restanteDoRecebimento >= valorDaParcela - 0.009) {
      const { error: erroUpdate } = await supabase
        .from("pagamentos")
        .update({ status: "pago", data_pagamento: hoje })
        .eq("id", parcela.id)
        .eq("status", "pendente")

      if (erroUpdate) throw erroUpdate

      restanteDoRecebimento = arredondarCentavos(restanteDoRecebimento - valorDaParcela)
      continue
    }

    const brutoOriginal = Number(parcela.valor)
    const liquidoOriginal = valorDaParcela
    const rateio = ratearValorLiquido(
      brutoOriginal,
      liquidoOriginal,
      restanteDoRecebimento
    )
    const possuiValorLiquido = parcela.valor_liquido !== null

    const { error: erroUpdate } = await supabase
      .from("pagamentos")
      .update({
        valor: rateio.brutoPago,
        valor_liquido: possuiValorLiquido ? rateio.liquidoPago : null,
        status: "pago",
        data_pagamento: hoje,
      })
      .eq("id", parcela.id)
      .eq("status", "pendente")

    if (erroUpdate) throw erroUpdate

    const { error: erroInsert } = await supabase.from("pagamentos").insert({
      movimentacao_id: parcela.movimentacao_id,
      parcela: parcela.parcela,
      total_parcelas: parcela.total_parcelas,
      valor: rateio.brutoRestante,
      forma_pagamento: parcela.forma_pagamento,
      vencimento: novoVencimentoRestante ?? parcela.vencimento,
      status: "pendente",
      taxa_cartao: parcela.taxa_cartao,
      valor_liquido: possuiValorLiquido ? rateio.liquidoRestante : null,
    })

    if (erroInsert) throw erroInsert

    restanteDoRecebimento = 0
  }
}
