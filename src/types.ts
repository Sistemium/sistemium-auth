export type AuthRoles = Record<string, any>

export interface AuthResponse {
  account: {
    authId: string
    name: string
    email: string
    'mobile-number': string
  }
  roles: AuthRoles
}

export type AuthCallback = (auth: AuthResponse) => Promise<AuthResponse>

export interface TokenAuthConfig {
  requiredRole?: string,
  registerUser?: AuthCallback
}
