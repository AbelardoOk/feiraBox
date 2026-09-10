/**
 * Wrapper para hash de senhas compatível com Bun e Node.
 * Usa Bun.password (argon2id) quando disponível (Bun runtime),
 * senão fallback para `argon2` (nativo) em Node.
 */

let argon2: {
  hash: (password: string) => Promise<string>;
  verify: (hash: string, password: string) => Promise<boolean>;
} | null = null;

async function getArgon2() {
  if (argon2) return argon2;
  // Só tenta carregar argon2 quando não está no Bun (evita crash com uv_version_string no Bun)
  if (
    typeof Bun !== 'undefined' &&
    typeof (Bun as unknown as { password: unknown }).password !== 'undefined'
  ) {
    return null;
  }
  try {
    const mod = await import('argon2');
    argon2 = mod.default ?? mod;
    return argon2;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  // Bun possui implementação nativa de argon2id via Bun.password
  if (
    typeof Bun !== 'undefined' &&
    typeof (
      Bun as unknown as { password: { hash: (p: string, opts?: unknown) => Promise<string> } }
    ).password !== 'undefined'
  ) {
    return await (
      Bun as unknown as { password: { hash: (p: string, opts: unknown) => Promise<string> } }
    ).password.hash(password, {
      algorithm: 'argon2id',
    });
  }

  const a2 = await getArgon2();
  if (a2) {
    return await a2.hash(password);
  }

  throw new Error('Nenhum mecanismo de hash disponível');
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (
    typeof Bun !== 'undefined' &&
    typeof (Bun as unknown as { password: { verify: (p: string, h: string) => Promise<boolean> } })
      .password !== 'undefined'
  ) {
    try {
      return await (
        Bun as unknown as { password: { verify: (p: string, h: string) => Promise<boolean> } }
      ).password.verify(password, hash);
    } catch {
      return false;
    }
  }

  const a2 = await getArgon2();
  if (a2) {
    try {
      return await a2.verify(hash, password);
    } catch {
      return false;
    }
  }

  throw new Error('Nenhum mecanismo de verificação disponível');
}
