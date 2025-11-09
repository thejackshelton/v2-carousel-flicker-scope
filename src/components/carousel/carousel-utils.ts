export function getIndexFromValue(value: string, itemValuesArray: string[]): number {
  const index = itemValuesArray.indexOf(value);
  if (index !== -1) return index;

  if (itemValuesArray.length === 0) {
    const numIndex = parseInt(value, 10);
    if (!isNaN(numIndex) && numIndex >= 0) {
      return numIndex;
    }
  }

  return 0;
}

export function getValueFromIndex(index: number, itemValuesArray: string[]): string {
  if (index < 0 || index >= itemValuesArray.length) {
    return String(index);
  }
  return itemValuesArray[index] ?? String(index);
}
