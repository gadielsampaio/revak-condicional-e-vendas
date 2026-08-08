-- Permite arquivar clientes que já possuem histórico sem quebrar vendas antigas.
alter table public.clientes
  add column if not exists ativo boolean not null default true;

create index if not exists clientes_loja_ativo_nome_idx
  on public.clientes (loja_id, ativo, nome);
