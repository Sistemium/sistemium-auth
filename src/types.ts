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

export type AuthCallback = (auth: AuthResponse) => Promise<Record<string, any> & { roles: AuthRoles }>

export interface AuthConfig {
  rolesUrl?: string
  authUrl?: string
}

export interface TokenAuthConfig {
  requiredRole?: string
  registerUser?: AuthCallback
}
