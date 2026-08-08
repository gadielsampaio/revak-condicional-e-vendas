import { supabase } from "@/services/supabase"

export type Cliente = {
  id: string
  loja_id: string
  nome: string
  telefone: string | null
  instagram: string | null
  created_at: string
  ativo?: boolean
}

// Lista todos os clientes da loja (RLS já filtra sozinho)
export async function listarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome")

  if (error) throw error
  return (data as Cliente[]).filter((cliente) => cliente.ativo !== false)
}

// Busca clientes pelo nome (autocomplete) — usado no "Mari..." do fluxo
export async function buscarClientesPorNome(termo: string) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .ilike("nome", `%${termo}%`)
    .limit(20)

  if (error) throw error
  return (data as Cliente[]).filter((cliente) => cliente.ativo !== false).slice(0, 5)
}

// Cria um novo cliente
export async function criarCliente(loja_id: string, nome: string) {
  const { data, error } = await supabase
    .from("clientes")
    .insert({ loja_id, nome })
    .select()
    .single()

  if (error) throw error
  return data as Cliente
}

export async function atualizarCliente(
  id: string,
  dados: Partial<Pick<Cliente, "nome" | "telefone" | "instagram">>
) {
  const { data, error } = await supabase
    .from("clientes")
    .update(dados)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Cliente
}

export async function contarClientesSemTelefone() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")

  if (error) throw error
  return (data as Cliente[]).filter((cliente) => cliente.ativo !== false && !cliente.telefone).length
}

export async function excluirCliente(id: string) {
  const { count, error: erroUso } = await supabase
    .from("movimentacoes")
    .select("*", { count: "exact", head: true })
    .eq("cliente_id", id)

  if (erroUso) throw erroUso

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("clientes")
      .update({ ativo: false })
      .eq("id", id)

    if (error) {
      throw new Error("Não foi possível arquivar o cliente. Aplique a migração supabase/migrations/20260808_clientes_ativo.sql no Supabase.")
    }
    return { excluido: false, arquivado: true }
  }

  const { error } = await supabase.from("clientes").delete().eq("id", id)
  if (error) throw error
  return { excluido: true, arquivado: false }
}
