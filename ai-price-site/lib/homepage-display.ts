/** Display only. Ranking and median calculations keep the original ratios. */
export function savingsPercent(value: number) {
  return Math.round((Math.abs(value) + Number.EPSILON) * 100);
}

export function savingsLabel(value: number) {
  const percent = savingsPercent(value);
  if (value === 0) return "与美国相同";
  return `比美国${value>0?"低":"高"} ${percent}%`;
}
