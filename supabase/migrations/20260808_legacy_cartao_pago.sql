-- No fluxo antigo, cartão ficava pendente apenas para representar o repasse da operadora.
-- No fluxo novo, a dívida do cliente é considerada paga no momento em que ele passa o cartão.
-- Esta migração converte somente os registros de cartão pendentes criados pelo modelo antigo.
update public.pagamentos as p
set
  status = 'pago',
  data_pagamento = coalesce(m.data_retorno, p.vencimento),
  vencimento = coalesce(m.data_retorno, p.vencimento)
from public.movimentacoes as m
where p.movimentacao_id = m.id
  and p.forma_pagamento = 'cartao'
  and p.status = 'pendente';
