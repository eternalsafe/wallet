jest.mock('@bokuweb/zstd-wasm', () => ({
  init: jest.fn().mockResolvedValue(undefined),
  decompress: jest.fn(),
}))

import { decompress, init } from '@bokuweb/zstd-wasm'
import { findFileForHash, getFunctionSignature } from '@/utils/hash-lookup'

describe('hash-lookup', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch
    } else {
      delete (global as { fetch?: typeof fetch }).fetch
    }
  })

  describe('findFileForHash', () => {
    it('returns the expected file for values at range boundaries', () => {
      expect(findFileForHash('0x00000000')).toBe('export_chunk_371')
      expect(findFileForHash('0x06255eac')).toBe('export_chunk_371')
      expect(findFileForHash('0x06256bdd')).toBe('export_chunk_372')
    })

    it('returns null for values that are outside all ranges', () => {
      expect(findFileForHash('0x06256000')).toBeNull()
      expect(findFileForHash('0x06255ead')).toBeNull()
    })
  })

  describe('getFunctionSignature', () => {
    it('returns a function signature from decompressed file contents', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      })
      global.fetch = fetchMock as unknown as typeof fetch

      const fileContents = '0x06256bdd,getMaxStakeLeadPercent(uint256)\n0x06256c00,otherFunction()'
      ;(decompress as jest.Mock).mockReturnValue(new TextEncoder().encode(fileContents))

      const signature = await getFunctionSignature('06256bdd')

      expect(signature).toBe('getMaxStakeLeadPercent(uint256)')
      expect(fetchMock).toHaveBeenCalledWith('/tx-decoder-tmp/export_chunk_372')
      expect(init).toHaveBeenCalledTimes(1)
      expect(decompress).toHaveBeenCalledTimes(1)
    })

    it('returns null when the hash is missing from the decompressed file', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      })
      global.fetch = fetchMock as unknown as typeof fetch
      ;(decompress as jest.Mock).mockReturnValue(new TextEncoder().encode('0x06256bdd,foo()'))

      const signature = await getFunctionSignature('0x06256bde')

      expect(signature).toBeNull()
    })

    it('reuses cached file contents for hashes from the same chunk', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      })
      global.fetch = fetchMock as unknown as typeof fetch
      ;(decompress as jest.Mock).mockReturnValue(new TextEncoder().encode('0x81244e3e,foo()\n0x81244e3f,bar(uint256)'))

      const first = await getFunctionSignature('0x81244e3e')
      const second = await getFunctionSignature('0x81244e3f')

      expect(first).toBe('foo()')
      expect(second).toBe('bar(uint256)')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(decompress).toHaveBeenCalledTimes(1)
    })
  })
})
