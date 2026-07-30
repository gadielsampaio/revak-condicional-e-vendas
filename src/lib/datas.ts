function doisDigitos(valor: number) {
  return String(valor).padStart(2, "0")
}

export function dataLocalParaISO(data: Date) {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

export function hojeLocalISO() {
  return dataLocalParaISO(new Date())
}

export function inicioDoMesISO(ano: number, mes: number) {
  return `${ano}-${doisDigitos(mes)}-01`
}

export function fimDoMesISO(ano: number, mes: number) {
  const ultimoDia = new Date(ano, mes, 0).getDate()
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(ultimoDia)}`
}

export function adicionarMesesISO(dataISO: string, quantidadeMeses: number) {
  const [ano, mes, dia] = dataISO.split("-").map(Number)
  const primeiroDiaDoDestino = new Date(ano, mes - 1 + quantidadeMeses, 1)
  const anoDestino = primeiroDiaDoDestino.getFullYear()
  const mesDestino = primeiroDiaDoDestino.getMonth() + 1
  const ultimoDiaDestino = new Date(anoDestino, mesDestino, 0).getDate()
  const diaDestino = Math.min(dia, ultimoDiaDestino)

  return `${anoDestino}-${doisDigitos(mesDestino)}-${doisDigitos(diaDestino)}`
}
