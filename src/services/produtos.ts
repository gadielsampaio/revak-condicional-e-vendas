import { supabase } from "@/services/supabase"

export type Produto = {
  id: string
  loja_id: string
  nome: string
  preco_padrao: number | null
  ativo: boolean
  created_at: string
}

export async function listarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("nome")

  if (error) throw error
  return data as Produto[]
}

export async function buscarProdutosPorNome(termo: string) {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .ilike("nome", `%${termo}%`)
    .limit(5)

  if (error) throw error
  return data as Produto[]
}

export async function criarProduto(loja_id: string, nome: string, preco_padrao?: number) {
  const { data, error } = await supabase
    .from("produtos")
    .insert({ loja_id, nome, preco_padrao: preco_padrao ?? null })
    .select()
    .single()

  if (error) throw error
  return data as Produto
}

export async function atualizarProduto(
  id: string,
  dados: Partial<Pick<Produto, "nome" | "preco_padrao" | "ativo">>
) {
  const { data, error } = await supabase
    .from("produtos")
    .update(dados)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Produto
}

export async function contarProdutosSemPreco() {
  const { count, error } = await supabase
    .from("produtos")
    .select("*", { count: "exact", head: true })
    .is("preco_padrao", null)

  if (error) throw error
  return count ?? 0
}