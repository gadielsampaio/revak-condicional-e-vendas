import { supabase } from "@/services/supabase"

export type Cliente = {
  id: string
  loja_id: string
  nome: string
  telefone: string | null
  instagram: string | null
  created_at: string
}

// Lista todos os clientes da loja (RLS já filtra sozinho)
export async function listarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome")

  if (error) throw error
  return data as Cliente[]
}

// Busca clientes pelo nome (autocomplete) — usado no "Mari..." do fluxo
export async function buscarClientesPorNome(termo: string) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .ilike("nome", `%${termo}%`)
    .limit(5)

  if (error) throw error
  return data as Cliente[]
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
  const { count, error } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .is("telefone", null)

  if (error) throw error
  return count ?? 0
}

