export interface JwtPayload {
  sub: string; // user id
  email: string;
  roles: string[];
  jti?: string; // jwt id for blacklisting
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat?: number;
  exp?: number;
}
