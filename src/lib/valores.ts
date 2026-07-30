export type ValorComLiquido = {
  valor: number | string
  valor_liquido?: number | string | null
}

export function arredondarCentavos(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

export function valorFinanceiro(pagamento: ValorComLiquido) {
  const valor = pagamento.valor_liquido ?? pagamento.valor
  return arredondarCentavos(Number(valor))
}

export function distribuirEmParcelas(valorTotal: number, numeroParcelas: number) {
  if (!Number.isInteger(numeroParcelas) || numeroParcelas < 1) {
    throw new Error("O número de parcelas deve ser maior que zero.")
  }

  const totalEmCentavos = Math.round(valorTotal * 100)
  const baseEmCentavos = Math.floor(totalEmCentavos / numeroParcelas)
  const centavosRestantes = totalEmCentavos % numeroParcelas

  return Array.from({ length: numeroParcelas }, (_, indice) =>
    (baseEmCentavos + (indice < centavosRestantes ? 1 : 0)) / 100
  )
}

export function ratearValorLiquido(
  valorBrutoTotal: number,
  valorLiquidoTotal: number,
  valorLiquidoPago: number
) {
  const liquidoPago = arredondarCentavos(valorLiquidoPago)

  if (liquidoPago <= 0 || valorLiquidoTotal <= 0 || valorBrutoTotal <= 0) {
    return {
      brutoPago: 0,
      liquidoPago: 0,
      brutoRestante: arredondarCentavos(valorBrutoTotal),
      liquidoRestante: arredondarCentavos(valorLiquidoTotal),
    }
  }

  if (liquidoPago >= valorLiquidoTotal) {
    return {
      brutoPago: arredondarCentavos(valorBrutoTotal),
      liquidoPago: arredondarCentavos(valorLiquidoTotal),
      brutoRestante: 0,
      liquidoRestante: 0,
    }
  }

  const proporcao = liquidoPago / valorLiquidoTotal
  const brutoPago = arredondarCentavos(valorBrutoTotal * proporcao)

  return {
    brutoPago,
    liquidoPago,
    brutoRestante: arredondarCentavos(valorBrutoTotal - brutoPago),
    liquidoRestante: arredondarCentavos(valorLiquidoTotal - liquidoPago),
  }
}
