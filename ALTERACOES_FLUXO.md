# Novo fluxo de sacolas e recebimentos

## O que mudou

- Toda sacola passa pelo passo **Receber agora** ou **Pagamento programado**.
- **Receber agora** aceita Pix, Dinheiro ou Cartão e registra o cliente como pago no dia.
- Cartão não exige mais data prevista de pagamento do cliente. A taxa da máquina continua opcional.
- **Pagamento programado** aceita a forma combinada, primeiro vencimento, quantidade de parcelas do saldo e uma entrada/adiantamento opcional.
- A entrada pode ser recebida por Pix, Dinheiro ou Cartão.
- Ao receber uma parcela futura, a tela pergunta novamente a forma **real** usada pelo cliente. Assim, um Pix combinado pode ser recebido por Cartão e vice-versa.
- Recebimentos parciais também registram a forma real utilizada e mantêm o restante pendente.
- A sacola pode receber ou remover peças enquanto ainda não existir pagamento vinculado.
- No retorno de uma condicional existe a ação para adicionar uma peça que o cliente decidiu ficar na entrega.
- A lista de vendas mostra estados derivados do financeiro: **Em andamento**, **A receber**, **Parcial**, **Atrasada** e **Fechada**.
- Produtos sem histórico podem ser excluídos. Produtos com histórico são arquivados/inativados.
- Clientes sem histórico podem ser excluídos. Clientes com histórico são arquivados para preservar vendas antigas.

## Migrações do Supabase

Aplicar os arquivos em `supabase/migrations` antes de publicar a nova versão:

1. `20260808_clientes_ativo.sql` — adiciona o campo de arquivamento seguro de clientes.
2. `20260808_legacy_cartao_pago.sql` — converte cartões pendentes do fluxo antigo (que representavam repasse da operadora) em pagamentos já efetuados pelo cliente.

Se o projeto usa Supabase CLI, as migrações podem ser aplicadas pelo fluxo normal de migrations do projeto. Se o banco é mantido pelo painel, execute os dois SQLs no SQL Editor na ordem acima.

## Validação local

- TypeScript 6: compilação de tipos concluída sem erros.
- ESLint: páginas, serviços e autocomplete alterados sem erros.
- O bundle Vite não pôde ser finalizado no ambiente de validação porque o `node_modules` recebido no ZIP não contém o binding Linux do Rolldown, e o registry disponível não possui uma dependência necessária para reinstalação limpa. O ZIP final não depende do `node_modules` enviado; execute `npm install`/`npm ci` no ambiente de deploy para instalar os binários da plataforma correta.
