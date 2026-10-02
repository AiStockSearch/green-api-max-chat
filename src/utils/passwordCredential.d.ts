/** Минимальные типы Credential Management API для feature-detect. */
declare class PasswordCredential extends Credential {
  constructor(data: { id: string; password: string; name?: string })
}

interface CredentialsContainer {
  store(credential: Credential): Promise<Credential | null>
}

interface Navigator {
  readonly credentials?: CredentialsContainer
}
