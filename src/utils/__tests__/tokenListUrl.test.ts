import { isSupportedCustomTokenListUrl, resolveTokenListUrl } from '../tokenListUrl'

describe('resolveTokenListUrl', () => {
  test('resolves built-in ipns paths via IPFS gateway', () => {
    expect(resolveTokenListUrl('ipns/tokens.uniswap.org', 'https://my.gateway.example')).toBe(
      'https://my.gateway.example/ipns/tokens.uniswap.org',
    )
  })

  test('resolves the real custom ipfs token list via gateway', () => {
    expect(
      resolveTokenListUrl('ipfs://bafybeibfuyyvx5es7eribsgd2u5m2775nhdt53dwnj6sep7ucqjo46rb6q', 'https://dweb.link'),
    ).toBe('https://dweb.link/ipfs/bafybeibfuyyvx5es7eribsgd2u5m2775nhdt53dwnj6sep7ucqjo46rb6q')
  })

  test('returns https URLs unchanged', () => {
    expect(resolveTokenListUrl('https://example.com/list.json', 'https://dweb.link')).toBe(
      'https://example.com/list.json',
    )
  })

  test('rejects http URLs', () => {
    expect(resolveTokenListUrl('http://example.com/list.json', 'https://dweb.link')).toBeUndefined()
  })

  test('returns undefined for invalid URLs', () => {
    expect(resolveTokenListUrl('not-a-token-list-url', 'https://dweb.link')).toBeUndefined()
  })
})

describe('isSupportedCustomTokenListUrl', () => {
  test('accepts ipfs:// and https://', () => {
    expect(isSupportedCustomTokenListUrl('ipfs://bafybeibfuyyvx5es7eribsgd2u5m2775nhdt53dwnj6sep7ucqjo46rb6q')).toBe(
      true,
    )
    expect(isSupportedCustomTokenListUrl('https://example.com/list.json')).toBe(true)
  })

  test('rejects http:// and ipns://', () => {
    expect(isSupportedCustomTokenListUrl('http://example.com/list.json')).toBe(false)
    expect(isSupportedCustomTokenListUrl('ipns://tokens.uniswap.org')).toBe(false)
  })
})
