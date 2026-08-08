import { fimDoMesISO, hojeLocalISO, inicioDoMesISO } from "@/lib/datas"
import { arredondarCentavos, valorFinanceiro } from "@/lib/valores"
import { supabase } from "@/services/supabase"

export type PagamentoComCliente = {
  id: string
  parcela: number
  total_parcelas: number | null
  valor: number
  valor_liquido: number | null
  forma_pagamento: string
  vencimento: string
  status: "pendente" | "pago"
  data_pagamento: string | null
  movimentacoes: {
    cliente_id: string
    clientes: { nome: string; telefone: string | null } | null
  }
}

export type ResumoCliente = {
  cliente_id: string
  nome: string
  telefone: string | null
  totalDevido: number
  proximoVencimento: string | null
  status: "vencido" | "a_vencer" | "em_dia"
  parcelasPendentes: number
}

export async function listarPainelFinanceiro(): Promise<ResumoCliente[]> {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("*, movimentacoes!inner(cliente_id, clientes(nome, telefone))")
    .eq("status", "pendente")
    .order("vencimento")

  if (error) throw error

  const pagamentos = data as unknown as PagamentoComCliente[]
  const hoje = hojeLocalISO()
  const porCliente = new Map<string, ResumoCliente>()

  for (const p of pagamentos) {
    const clienteId = p.movimentacoes.cliente_id
    const nome = p.movimentacoes.clientes?.nome ?? "Cliente"
    const telefone = p.movimentacoes.clientes?.telefone ?? null

    if (!porCliente.has(clienteId)) {
      porCliente.set(clienteId, {
        cliente_id: clienteId,
        nome,
        telefone,
        totalDevido: 0,
        proximoVencimento: null,
        status: "em_dia",
        parcelasPendentes: 0,
      })
    }

    const resumo = porCliente.get(clienteId)!
    resumo.totalDevido = arredondarCentavos(resumo.totalDevido + valorFinanceiro(p))
    resumo.parcelasPendentes += 1

    if (!resumo.proximoVencimento || p.vencimento < resumo.proximoVencimento) {
      resumo.proximoVencimento = p.vencimento
    }

    if (p.vencimento < hoje) {
      resumo.status = "vencido"
    } else if (resumo.status !== "vencido") {
      resumo.status = "a_vencer"
    }
  }

  return Array.from(porCliente.values()).sort((a, b) => {
    const prioridade = { vencido: 0, a_vencer: 1, em_dia: 2 }
    return prioridade[a.status] - prioridade[b.status]
  })
}

export type ResumoGeralFinanceiro = {
  recebidoNoMes: number
  totalAReceber: number
  totalVencido: number
  clientesComPendencia: number
}

export async function getResumoGeralFinanceiro(): Promise<ResumoGeralFinanceiro> {
  const hoje = new Date()
  const inicioMes = inicioDoMesISO(hoje.getFullYear(), hoje.getMonth() + 1)
  const fimMes = fimDoMesISO(hoje.getFullYear(), hoje.getMonth() + 1)
  const hojeStr = hojeLocalISO()

  const [{ data: pagosNoMes, error: erroPagos }, { data: pendentes, error: erroPendentes }] =
    await Promise.all([
      supabase
        .from("pagamentos")
        .select("valor, valor_liquido")
        .eq("status", "pago")
        .gte("data_pagamento", inicioMes)
        .lte("data_pagamento", fimMes),
      supabase
        .from("pagamentos")
        .select("valor, valor_liquido, vencimento")
        .eq("status", "pendente"),
    ])

  if (erroPagos) throw erroPagos
  if (erroPendentes) throw erroPendentes

  const recebidoNoMes = arredondarCentavos(
    (pagosNoMes ?? []).reduce((soma, p) => soma + valorFinanceiro(p), 0)
  )
  const totalAReceber = arredondarCentavos(
    (pendentes ?? []).reduce((soma, p) => soma + valorFinanceiro(p), 0)
  )
  const totalVencido = arredondarCentavos(
    (pendentes ?? [])
      .filter((p) => p.vencimento < hojeStr)
      .reduce((soma, p) => soma + valorFinanceiro(p), 0)
  )
  const painel = await listarPainelFinanceiro()

  return {
    recebidoNoMes,
    totalAReceber,
    totalVencido,
    clientesComPendencia: painel.length,
  }
}

export async function contarClientesComPagamentoVencido() {
  const painel = await listarPainelFinanceiro()
  return painel.filter((r) => r.status === "vencido").length
}

export type ParcelaFatura = {
  id: string
  parcela: number
  total_parcelas: number
  valor: number
  valor_bruto: number
  forma_pagamento: string
  vencimento: string
  status: "pendente" | "pago"
  data_pagamento: string | null
  movimentacao_id: string
  cliente_nome: string
  cliente_telefone: string | null
}

export type ResumoFatura = {
  previsto: number
  recebido: number
  aFaltar: number
  vencido: number
  parcelas: ParcelaFatura[]
}

type PagamentoFaturaBanco = {
  id: string
  parcela: number
  total_parcelas: number | null
  valor: number
  valor_liquido: number | null
  forma_pagamento: string
  vencimento: string
  status: "pendente" | "pago"
  data_pagamento: string | null
  movimentacao_id: string
  movimentacoes: {
    clientes: { nome: string; telefone: string | null } | null
  }
}

export async function getFaturaMensal(ano: number, mes: number): Promise<ResumoFatura> {
  const inicio = inicioDoMesISO(ano, mes)
  const fim = fimDoMesISO(ano, mes)
  const campos = "*, movimentacoes!inner(clientes(nome, telefone))"

  const [{ data: pagos, error: erroPagos }, { data: pendentes, error: erroPendentes }] =
    await Promise.all([
      supabase
        .from("pagamentos")
        .select(campos)
        .eq("status", "pago")
        .gte("data_pagamento", inicio)
        .lte("data_pagamento", fim),
      supabase
        .from("pagamentos")
        .select(campos)
        .eq("status", "pendente")
        .gte("vencimento", inicio)
        .lte("vencimento", fim),
    ])

  if (erroPagos) throw erroPagos
  if (erroPendentes) throw erroPendentes

  const hoje = hojeLocalISO()
  const registros = [
    ...((pagos ?? []) as unknown as PagamentoFaturaBanco[]),
    ...((pendentes ?? []) as unknown as PagamentoFaturaBanco[]),
  ].sort((a, b) => {
    const dataA = a.status === "pago" ? a.data_pagamento ?? a.vencimento : a.vencimento
    const dataB = b.status === "pago" ? b.data_pagamento ?? b.vencimento : b.vencimento
    return dataA.localeCompare(dataB)
  })

  const movimentacaoIds = Array.from(
    new Set(
      registros
        .filter(
          (p) =>
            p.forma_pagamento === "promissoria" &&
            (!p.total_parcelas || p.total_parcelas < 1)
        )
        .map((p) => p.movimentacao_id)
    )
  )
  const totaisPorMovimentacao = new Map<string, number>()

  if (movimentacaoIds.length > 0) {
    const { data: todasAsParcelas, error: erroTodasAsParcelas } = await supabase
      .from("pagamentos")
      .select("movimentacao_id, parcela")
      .in("movimentacao_id", movimentacaoIds)

    if (erroTodasAsParcelas) throw erroTodasAsParcelas

    for (const parcela of todasAsParcelas ?? []) {
      const movimentacaoId = parcela.movimentacao_id as string
      const numeroParcela = Number(parcela.parcela) || 1
      totaisPorMovimentacao.set(
        movimentacaoId,
        Math.max(totaisPorMovimentacao.get(movimentacaoId) ?? 1, numeroParcela)
      )
    }
  }

  let recebido = 0
  let aFaltar = 0
  let vencido = 0

  const parcelas = registros.map((p): ParcelaFatura => {
    const valor = valorFinanceiro(p)

    if (p.status === "pago") {
      recebido += valor
    } else {
      aFaltar += valor
      if (p.vencimento < hoje) vencido += valor
    }

    return {
      id: p.id,
      parcela: p.parcela,
      total_parcelas:
        p.total_parcelas ?? totaisPorMovimentacao.get(p.movimentacao_id) ?? 1,
      valor,
      valor_bruto: Number(p.valor),
      forma_pagamento: p.forma_pagamento,
      vencimento: p.vencimento,
      status: p.status,
      data_pagamento: p.data_pagamento,
      movimentacao_id: p.movimentacao_id,
      cliente_nome: p.movimentacoes?.clientes?.nome ?? "Cliente",
      cliente_telefone: p.movimentacoes?.clientes?.telefone ?? null,
    }
  })

  recebido = arredondarCentavos(recebido)
  aFaltar = arredondarCentavos(aFaltar)
  vencido = arredondarCentavos(vencido)

  return {
    previsto: arredondarCentavos(recebido + aFaltar),
    recebido,
    aFaltar,
    vencido,
    parcelas,
  }
}
