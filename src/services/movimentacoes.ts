import { hojeLocalISO } from "@/lib/datas"
import { supabase } from "@/services/supabase"

export type ItemCondicional = {
  produto_id: string
  descricao: string
  quantidade: number
  valor_unitario: number
}

export async function criarCondicional(
  loja_id: string,
  cliente_id: string,
  itens: ItemCondicional[],
  observacoes?: string
) {
  const valor_total = itens.reduce((soma, i) => soma + i.quantidade * i.valor_unitario, 0)

  // 1. Cria a movimentação (cabeçalho)
  const { data: movimentacao, error: erroMovimentacao } = await supabase
    .from("movimentacoes")
    .insert({
      loja_id,
      tipo: "condicional",
      cliente_id,
      status: "aberta",
      valor_total,
      observacoes: observacoes ?? null,
    })
    .select()
    .single()

  if (erroMovimentacao) throw erroMovimentacao

  // 2. Cria os itens vinculados a essa movimentação
  const itensParaInserir = itens.map((item) => ({
    movimentacao_id: movimentacao.id,
    produto_id: item.produto_id,
    descricao: item.descricao,
    quantidade: item.quantidade,
    valor_unitario: item.valor_unitario,
  }))

  const { error: erroItens } = await supabase
    .from("movimentacao_itens")
    .insert(itensParaInserir)

  if (erroItens) throw erroItens

  return movimentacao
}

export async function listarCondicionaisAbertas() {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*, clientes(nome), movimentacao_itens(*, produtos(nome))")
    .eq("tipo", "condicional")
    .eq("status", "aberta")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getCondicionalPorId(id: string) {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*, clientes(nome), movimentacao_itens(*, produtos(nome))")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

type ItemRetorno = {
  item_id: string
  quantidade_vendida: number
}

export async function fecharCondicional(
  movimentacao_id: string,
  itensRetorno: ItemRetorno[],
  valor_vendido: number
) {
  // 1. Atualiza cada item com a quantidade que foi vendida
  for (const item of itensRetorno) {
    const { error } = await supabase
      .from("movimentacao_itens")
      .update({ quantidade_vendida: item.quantidade_vendida })
      .eq("id", item.item_id)

    if (error) throw error
  }

  // 2. Fecha a movimentação e atualiza o valor_total pro valor efetivamente vendido
  const { error: erroFechar } = await supabase
    .from("movimentacoes")
    .update({
      status: "fechada",
      data_retorno: hojeLocalISO(),
      valor_total: valor_vendido,
    })
    .eq("id", movimentacao_id)

  if (erroFechar) throw erroFechar
}

export async function criarVenda(
  loja_id: string,
  cliente_id: string,
  itens: ItemCondicional[],
  observacoes?: string
) {
  if (itens.length === 0) {
    throw new Error("Adicione pelo menos um produto à venda.")
  }

  const possuiItemInvalido = itens.some(
    (item) =>
      !Number.isInteger(item.quantidade) ||
      item.quantidade <= 0 ||
      !Number.isFinite(item.valor_unitario) ||
      item.valor_unitario <= 0
  )

  if (possuiItemInvalido) {
    throw new Error("Revise a quantidade e o valor dos produtos.")
  }

  const valor_total = itens.reduce((soma, i) => soma + i.quantidade * i.valor_unitario, 0)

  const { data: movimentacao, error: erroMovimentacao } = await supabase
    .from("movimentacoes")
    .insert({
      loja_id,
      tipo: "venda",
      cliente_id,
      status: "fechada", // venda direta já nasce fechada, não tem "retorno"
      data_retorno: hojeLocalISO(),
      valor_total,
      observacoes: observacoes ?? null,
    })
    .select()
    .single()

  if (erroMovimentacao) throw erroMovimentacao

  const itensParaInserir = itens.map((item) => ({
    movimentacao_id: movimentacao.id,
    produto_id: item.produto_id,
    descricao: item.descricao,
    quantidade: item.quantidade,
    valor_unitario: item.valor_unitario,
    quantidade_vendida: item.quantidade, // na venda direta, tudo é vendido
  }))

  const { error: erroItens } = await supabase
    .from("movimentacao_itens")
    .insert(itensParaInserir)

  if (erroItens) throw erroItens

  return movimentacao
}

export async function listarCondicionaisFechadas() {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*, clientes(nome), movimentacao_itens(*, produtos(nome))")
    .eq("tipo", "condicional")
    .eq("status", "fechada")
    .order("data_retorno", { ascending: false })

  if (error) throw error
  return data
}

export async function listarVendas() {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*, clientes(nome), movimentacao_itens(*, produtos(nome))")
    .eq("tipo", "venda")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function listarHistoricoVendas() {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*, clientes(nome), movimentacao_itens(*, produtos(nome)), pagamentos(id, valor, valor_liquido, vencimento, data_pagamento, status, forma_pagamento)")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getClienteDaMovimentacao(movimentacao_id: string) {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("clientes(nome, telefone)")
    .eq("id", movimentacao_id)
    .single()

  if (error) throw error

  const clientes = data.clientes as unknown as { nome: string; telefone: string | null }[] | { nome: string; telefone: string | null }

  // Normaliza: se vier array, pega o primeiro; se vier objeto, usa direto
  return Array.isArray(clientes) ? (clientes[0] ?? null) : clientes
}

export async function atualizarValorTotalMovimentacao(id: string, novoValor: number) {
  const { error } = await supabase
    .from("movimentacoes")
    .update({ valor_total: novoValor })
    .eq("id", id)

  if (error) throw error
}
export async function getMovimentacaoParaPagamento(id: string) {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("id, tipo, valor_total, status, clientes(nome), movimentacao_itens(id, produto_id, descricao, quantidade, quantidade_vendida, valor_unitario, produtos(nome))")
    .eq("id", id)
    .single()

  if (error) throw error

  return {
    id: data.id as string,
    valor_total: Number(data.valor_total),
    status: data.status as string,
    tipo: data.tipo as "venda" | "condicional",
    clientes: data.clientes,
    movimentacao_itens: data.movimentacao_itens,
  }
}

async function garantirSemPagamentos(movimentacao_id: string) {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id")
    .eq("movimentacao_id", movimentacao_id)
    .limit(1)

  if (error) throw error
  if ((data ?? []).length > 0) {
    throw new Error("A sacola não pode mais ser alterada porque já possui recebimentos registrados.")
  }
}

async function recalcularValorTotal(movimentacao_id: string) {
  const { data: movimentacao, error: erroMov } = await supabase
    .from("movimentacoes")
    .select("tipo, status")
    .eq("id", movimentacao_id)
    .single()
  if (erroMov) throw erroMov

  const { data: itens, error: erroItens } = await supabase
    .from("movimentacao_itens")
    .select("quantidade, quantidade_vendida, valor_unitario")
    .eq("movimentacao_id", movimentacao_id)
  if (erroItens) throw erroItens

  const valor = (itens ?? []).reduce((soma, item) => {
    const quantidade = movimentacao.tipo === "condicional" && movimentacao.status === "fechada"
      ? Number(item.quantidade_vendida ?? 0)
      : Number(item.quantidade)
    return soma + quantidade * Number(item.valor_unitario)
  }, 0)

  await atualizarValorTotalMovimentacao(movimentacao_id, valor)
  return valor
}

export async function adicionarItemMovimentacao(
  movimentacao_id: string,
  item: ItemCondicional,
  quantidadeVendida?: number
) {
  await garantirSemPagamentos(movimentacao_id)

  const { data, error } = await supabase
    .from("movimentacao_itens")
    .insert({
      movimentacao_id,
      produto_id: item.produto_id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      quantidade_vendida: quantidadeVendida ?? 0,
    })
    .select("*, produtos(nome)")
    .single()

  if (error) throw error
  await recalcularValorTotal(movimentacao_id)
  return data
}

export async function removerItemMovimentacao(movimentacao_id: string, item_id: string) {
  await garantirSemPagamentos(movimentacao_id)

  const { error } = await supabase
    .from("movimentacao_itens")
    .delete()
    .eq("id", item_id)
    .eq("movimentacao_id", movimentacao_id)

  if (error) throw error
  return recalcularValorTotal(movimentacao_id)
}
