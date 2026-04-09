export const mapWithConcurrencyLimit = async <T, U>(
  values: T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<U>,
): Promise<U[]> => {
  if (!values.length) {
    return []
  }

  const boundedLimit = Math.max(1, Math.floor(limit))
  const results: U[] = new Array(values.length)
  let nextIndex = 0

  const workers = new Array(Math.min(boundedLimit, values.length)).fill(undefined).map(async () => {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(values[currentIndex], currentIndex)
    }
  })

  await Promise.all(workers)

  return results
}
