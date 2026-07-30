import { fimDoMesISO, hojeLocalISO, inicioDoMesISO } from "@/lib/datas"
import { arredondarCentavos, valorFinanceiro } from "@/lib/valores"
import { supabase } from "@/services/supabase"

export async function getResumoDashboard() {
  const hoje = new Date()
  const inicioMes = inicioDoMesISO(hoje.getFullYear(), hoje.getMonth() + 1)
  const fimMes = fimDoMesISO(hoje.getFullYear(), hoje.getMonth() + 1)
  const hojeStr = hojeLocalISO()

  const { count: condicionaisAbertas, error: erro1 } = await supabase
    .from("movimentacoes")
    .select("*", { count: "exact", head: true })
    .eq("tipo", "condicional")
    .eq("status", "aberta")

  if (erro1) throw erro1

  const { data: itensAbertos, error: erro2 } = await supabase
    .from("movimentacao_itens")
    .select("quantidade, quantidade_vendida, movimentacoes!inner(status, tipo)")
    .eq("movimentacoes.tipo", "condicional")
    .eq("movimentacoes.status", "aberta")

  if (erro2) throw erro2

  const pecasEmCondicional = (itensAbertos ?? []).reduce(
    (soma, item) => soma + (item.quantidade - item.quantidade_vendida),
    0
  )

  const { data: vendasMes, error: erro3 } = await supabase
    .from("movimentacoes")
    .select("valor_total")
    .eq("status", "fechada")
    .gte("data_retorno", inicioMes)
    .lte("data_retorno", fimMes)

  if (erro3) throw erro3

  const vendidoNoMes = arredondarCentavos(
    (vendasMes ?? []).reduce((soma, venda) => soma + Number(venda.valor_total), 0)
  )

  const { data: pagosMes, error: erro4 } = await supabase
    .from("pagamentos")
    .select("valor, valor_liquido")
    .eq("status", "pago")
    .gte("data_pagamento", inicioMes)
    .lte("data_pagamento", fimMes)

  if (erro4) throw erro4

  const recebidoNoMes = arredondarCentavos(
    (pagosMes ?? []).reduce((soma, pagamento) => soma + valorFinanceiro(pagamento), 0)
  )

  const { data: pendentes, error: erro5 } = await supabase
    .from("pagamentos")
    .select("valor, valor_liquido, vencimento")
    .eq("status", "pendente")

  if (erro5) throw erro5

  const aReceber = arredondarCentavos(
    (pendentes ?? []).reduce((soma, pagamento) => soma + valorFinanceiro(pagamento), 0)
  )
  const parcelasVencidas = arredondarCentavos(
    (pendentes ?? [])
      .filter((pagamento) => pagamento.vencimento < hojeStr)
      .reduce((soma, pagamento) => soma + valorFinanceiro(pagamento), 0)
  )

  return {
    condicionaisAbertas: condicionaisAbertas ?? 0,
    pecasEmCondicional,
    vendidoNoMes,
    recebidoNoMes,
    aReceber,
    parcelasVencidas,
  }
}
