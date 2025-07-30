export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashHex
}

export function isPasswordHashed(password: string): boolean {
  // SHA-256 해시는 64자의 16진수 문자열
  return /^[a-f0-9]{64}$/i.test(password)
}
