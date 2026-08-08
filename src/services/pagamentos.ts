import { adicionarMesesISO, hojeLocalISO } from "@/lib/datas"
import { arredondarCentavos, distribuirEmParcelas } from "@/lib/valores"
import { supabase } from "@/services/supabase"

export type FormaPagamento = "pix" | "dinheiro" | "cartao" | "promissoria"
export type FormaRecebimento = Exclude<FormaPagamento, "promissoria">

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

type DadosRecebimentoAgora = {
  movimentacao_id: string
  forma_pagamento: FormaRecebimento
  valor_total: number
  taxa_cartao?: number
}

type DadosPagamentoProgramado = {
  movimentacao_id: string
  forma_prevista: FormaPagamento
  valor_total: number
  primeira_data: string
  numero_parcelas?: number
  entrada_valor?: number
  entrada_forma?: FormaRecebimento
  entrada_taxa_cartao?: number
}

function validarTaxaCartao(taxa?: number) {
  const taxaNormalizada = taxa ?? 0
  if (!Number.isFinite(taxaNormalizada) || taxaNormalizada < 0 || taxaNormalizada > 100) {
    throw new Error("A taxa do cartão deve estar entre 0% e 100%.")
  }
  return taxaNormalizada
}

function dadosLiquidosCartao(valor: number, forma: FormaRecebimento, taxa?: number) {
  if (forma !== "cartao") {
    return { taxa_cartao: null, valor_liquido: null }
  }

  const taxaNormalizada = validarTaxaCartao(taxa)
  const valorLiquido = arredondarCentavos(valor - (valor * taxaNormalizada) / 100)

  return {
    taxa_cartao: taxaNormalizada || null,
    valor_liquido: taxaNormalizada ? valorLiquido : null,
  }
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

export async function registrarRecebimentoAgora(dados: DadosRecebimentoAgora) {
  const hoje = hojeLocalISO()
  const valorTotal = arredondarCentavos(dados.valor_total)

  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.")
  }

  await garantirMovimentacaoSemPagamento(dados.movimentacao_id)

  const cartao = dadosLiquidosCartao(valorTotal, dados.forma_pagamento, dados.taxa_cartao)
  const { error } = await supabase.from("pagamentos").insert({
    movimentacao_id: dados.movimentacao_id,
    parcela: 1,
    total_parcelas: 1,
    valor: valorTotal,
    forma_pagamento: dados.forma_pagamento,
    vencimento: hoje,
    data_pagamento: hoje,
    status: "pago",
    ...cartao,
  })

  if (error) throw error
}

export async function registrarPagamentoProgramado(dados: DadosPagamentoProgramado) {
  const hoje = hojeLocalISO()
  const valorTotal = arredondarCentavos(dados.valor_total)
  const entrada = arredondarCentavos(dados.entrada_valor ?? 0)
  const numeroParcelas = dados.numero_parcelas ?? 1

  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.")
  }
  if (!dados.primeira_data) {
    throw new Error("Informe a data do primeiro vencimento.")
  }
  if (!Number.isInteger(numeroParcelas) || numeroParcelas < 1 || numeroParcelas > 120) {
    throw new Error("O número de parcelas deve estar entre 1 e 120.")
  }
  if (!Number.isFinite(entrada) || entrada < 0 || entrada >= valorTotal) {
    throw new Error("A entrada deve ser menor que o valor total da venda.")
  }
  if (entrada > 0 && !dados.entrada_forma) {
    throw new Error("Informe como a entrada foi recebida.")
  }

  await garantirMovimentacaoSemPagamento(dados.movimentacao_id)

  const registros: Record<string, unknown>[] = []

  if (entrada > 0 && dados.entrada_forma) {
    const cartao = dadosLiquidosCartao(entrada, dados.entrada_forma, dados.entrada_taxa_cartao)
    registros.push({
      movimentacao_id: dados.movimentacao_id,
      parcela: 1,
      total_parcelas: 1,
      valor: entrada,
      forma_pagamento: dados.entrada_forma,
      vencimento: hoje,
      data_pagamento: hoje,
      status: "pago",
      ...cartao,
    })
  }

  const saldo = arredondarCentavos(valorTotal - entrada)
  const valoresParcelas = distribuirEmParcelas(saldo, numeroParcelas)

  registros.push(
    ...valoresParcelas.map((valor, index) => ({
      movimentacao_id: dados.movimentacao_id,
      parcela: index + 1,
      total_parcelas: numeroParcelas,
      valor,
      forma_pagamento: dados.forma_prevista,
      vencimento: adicionarMesesISO(dados.primeira_data, index),
      data_pagamento: null,
      status: "pendente" as const,
      taxa_cartao: null,
      valor_liquido: null,
    }))
  )

  const { error } = await supabase.from("pagamentos").insert(registros)
  if (error) throw error
}

export async function listarPagamentosPorMovimentacao(movimentacao_id: string) {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("movimentacao_id", movimentacao_id)
    .order("status", { ascending: true })
    .order("parcela")

  if (error) throw error
  return data as Pagamento[]
}

export async function receberPagamentos(
  ids: string[],
  formaRecebida: FormaRecebimento,
  taxaCartao?: number,
  dataPagamento?: string
) {
  if (ids.length === 0) return

  const { data: pendentes, error: erroBusca } = await supabase
    .from("pagamentos")
    .select("id, valor")
    .in("id", ids)
    .eq("status", "pendente")

  if (erroBusca) throw erroBusca
  const data = dataPagamento ?? hojeLocalISO()

  for (const pagamento of pendentes ?? []) {
    const valor = arredondarCentavos(Number(pagamento.valor))
    const cartao = dadosLiquidosCartao(valor, formaRecebida, taxaCartao)
    const { error } = await supabase
      .from("pagamentos")
      .update({
        status: "pago",
        data_pagamento: data,
        forma_pagamento: formaRecebida,
        ...cartao,
      })
      .eq("id", pagamento.id)
      .eq("status", "pendente")

    if (error) throw error
  }
}

export async function receberRestante(
  movimentacao_id: string,
  formaRecebida: FormaRecebimento,
  taxaCartao?: number
) {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id")
    .eq("movimentacao_id", movimentacao_id)
    .eq("status", "pendente")

  if (error) throw error
  await receberPagamentos((data ?? []).map((p) => p.id as string), formaRecebida, taxaCartao)
}

export async function pagarParcialmente(
  pagamento: Pagamento,
  valorRecebido: number,
  formaRecebida: FormaRecebimento,
  novoVencimentoRestante?: string,
  taxaCartao?: number
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
    parcelasPendentes.reduce((soma, p) => soma + Number(p.valor), 0)
  )
  const recebido = arredondarCentavos(valorRecebido)

  if (!Number.isFinite(recebido) || recebido <= 0) {
    throw new Error("Informe um valor recebido maior que zero.")
  }
  if (recebido > saldoDevedor + 0.009) {
    throw new Error(`O valor recebido é maior que o saldo a receber.`)
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

    const valorDaParcela = arredondarCentavos(Number(parcela.valor))

    if (restanteDoRecebimento >= valorDaParcela - 0.009) {
      const cartao = dadosLiquidosCartao(valorDaParcela, formaRecebida, taxaCartao)
      const { error: erroUpdate } = await supabase
        .from("pagamentos")
        .update({
          status: "pago",
          data_pagamento: hoje,
          forma_pagamento: formaRecebida,
          ...cartao,
        })
        .eq("id", parcela.id)
        .eq("status", "pendente")

      if (erroUpdate) throw erroUpdate
      restanteDoRecebimento = arredondarCentavos(restanteDoRecebimento - valorDaParcela)
      continue
    }

    const valorPago = arredondarCentavos(restanteDoRecebimento)
    const valorRestante = arredondarCentavos(valorDaParcela - valorPago)
    const cartao = dadosLiquidosCartao(valorPago, formaRecebida, taxaCartao)

    const { error: erroUpdate } = await supabase
      .from("pagamentos")
      .update({
        valor: valorPago,
        status: "pago",
        data_pagamento: hoje,
        forma_pagamento: formaRecebida,
        ...cartao,
      })
      .eq("id", parcela.id)
      .eq("status", "pendente")

    if (erroUpdate) throw erroUpdate

    const { error: erroInsert } = await supabase.from("pagamentos").insert({
      movimentacao_id: parcela.movimentacao_id,
      parcela: parcela.parcela,
      total_parcelas: parcela.total_parcelas,
      valor: valorRestante,
      forma_pagamento: parcela.forma_pagamento,
      vencimento: novoVencimentoRestante ?? parcela.vencimento,
      status: "pendente",
      taxa_cartao: null,
      valor_liquido: null,
    })

    if (erroInsert) throw erroInsert
    restanteDoRecebimento = 0
  }
}
