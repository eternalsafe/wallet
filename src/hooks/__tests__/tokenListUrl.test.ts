import { isValidTokenListSourceUrl, resolveTokenListUrl } from '@/hooks/tokenListUrl'

describe('token list URL helpers', () => {
  test('accepts https URL', () => {
    expect(isValidTokenListSourceUrl('https://example.com/list.json')).toBe(true)
  })

  test('accepts ipfs URL', () => {
    expect(
      isValidTokenListSourceUrl('ipfs://bafybeibfuyyvx5es7eribsgd2u5m2775nhdt53dwnj6sep7ucqjo46rb6q'),
    ).toBe(true)
  })

  test('rejects http URL', () => {
    expect(isValidTokenListSourceUrl('http://example.com/list.json')).toBe(false)
  })

  test('resolves custom ipfs URL to the default gateway', () => {
    expect(resolveTokenListUrl('ipfs://bafybeibfuyyvx5es7eribsgd2u5m2775nhdt53dwnj6sep7ucqjo46rb6q')).toBe(
      'https://dweb.link/ipfs/bafybeibfuyyvx5es7eribsgd2u5m2775nhdt53dwnj6sep7ucqjo46rb6q',
    )
  })
})
