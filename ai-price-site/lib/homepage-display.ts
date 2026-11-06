/** Floor positive claims: “at least” must never round the promised saving up. */
export function savingsLabel(value: number) {
  const percent = Math.floor(Math.abs(value)*1000 + 1e-9)/10;
  if (value === 0) return "与美国相同";
  if (percent === 0) return `比美国${value>0?"低":"高"}不足 0.1%`;
  return `比美国${value>0?"低":"高"} ${percent}%`;
}
