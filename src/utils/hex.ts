/**
 * Convert a hex string to UTF-8 string
 * @param hex Hex string to convert
 * @returns UTF-8 string
 */
export const hexToUtf8 = (hex: string): string => {
  let str = ''
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substring(i, i + 2), 16)
    str += String.fromCharCode(code)
  }
  return str
}

/**
 * Convert a UTF-8 string to hex string
 * @param str UTF-8 string to convert
 * @returns Hex string
 */
export const utf8ToHex = (str: string): string => {
  let hex = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    hex += code.toString(16).padStart(2, '0')
  }
  return hex
}

export const isEmptyHexData = (encodedData: string) => encodedData && isNaN(parseInt(encodedData, 16))
