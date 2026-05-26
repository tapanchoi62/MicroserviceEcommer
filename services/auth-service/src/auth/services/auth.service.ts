import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponse, AuthTokens } from '../interfaces/auth-response.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  // ─── Register ───────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        provider: 'local',
        userRoles: {
          create: {
            role: { connect: { name: 'CUSTOMER' } },
          },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    this.logger.log(`User registered: ${user.email}`);
    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(user.id, user.email, roles);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        roles,
      },
      ...tokens,
    };
  }

  // ─── Validate Local User (called by LocalStrategy) ───────
  /**
   * Validates email + password credentials.
   * Returns the full user record on success, null on failure.
   * LocalStrategy calls this; it should never throw — return null instead.
   */
  async validateLocalUser(email: string, password: string): Promise<any | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.passwordHash) return null;
    if (user.status !== 'active') return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  // ─── Login (called by controller after LocalStrategy validates) ─
  /**
   * Receives the already-validated user from req.user (set by LocalStrategy),
   * creates a session, generates tokens, and returns AuthResponse.
   */
  async loginWithUser(user: any, req?: any): Promise<AuthResponse> {
    // Create session
    if (req) {
      await this.prisma.session.create({
        data: {
          userId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          deviceInfo: req.headers['user-agent'],
        },
      });
    }

    this.logger.log(`User logged in (local): ${user.email}`);
    const roles = user.userRoles.map((ur: any) => ur.role.name);
    const tokens = await this.generateTokens(user.id, user.email, roles);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        roles,
      },
      ...tokens,
    };
  }

  // ─── Login (legacy — kept for backward compat / direct DTO use) ─
  /** @deprecated Prefer the Passport-based flow: LocalAuthGuard → loginWithUser() */
  async login(dto: LoginDto, req?: any): Promise<AuthResponse> {
    const user = await this.validateLocalUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.loginWithUser(user, req);
  }

  // ─── Refresh Token ───────────────────────────────────────
  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!tokenRecord) throw new UnauthorizedException('Invalid refresh token');

    const isValid = await bcrypt.compare(refreshToken, tokenRecord.tokenHash);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    // Revoke old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    return this.generateTokens(userId, user.email, roles);
  }

  // ─── Logout ──────────────────────────────────────────────
  async logout(userId: string, jwtId: string, accessExpiresIn: number): Promise<void> {
    // Blacklist the access token
    await this.redisService.blacklistToken(jwtId, accessExpiresIn);

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    this.logger.log(`User logged out: ${userId}`);
  }

  // ─── OAuth Login ─────────────────────────────────────────
  async oauthLogin(oauthUser: {
    email: string;
    fullName: string;
    avatarUrl: string;
    provider: string;
    providerId: string;
  }): Promise<AuthResponse> {
    let user = await this.prisma.user.findUnique({ where: { email: oauthUser.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: oauthUser.email,
          fullName: oauthUser.fullName,
          avatarUrl: oauthUser.avatarUrl,
          provider: oauthUser.provider,
          providerId: oauthUser.providerId,
          isEmailVerified: true,
          userRoles: {
            create: { role: { connect: { name: 'CUSTOMER' } } },
          },
        },
        include: { userRoles: { include: { role: true } } },
      });
    }

    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { userRoles: { include: { role: true } } },
    });

    const roles = fullUser.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(user.id, user.email, roles);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        roles,
      },
      ...tokens,
    };
  }

  // ─── Get Profile ─────────────────────────────────────────
  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        isEmailVerified: true,
        isMfaEnabled: true,
        status: true,
        createdAt: true,
        userRoles: { include: { role: true } },
      },
    });
  }

  // ─── Sessions ────────────────────────────────────────────
  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
  }

  // ─── Token Generation ────────────────────────────────────
  private async generateTokens(
    userId: string,
    email: string,
    roles: string[],
  ): Promise<AuthTokens> {
    const jwtId = uuidv4();

    const accessPayload: JwtPayload = { sub: userId, email, roles, jti: jwtId };
    const refreshPayload = { sub: userId, jti: uuidv4() };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpires'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpires'),
      }),
    ]);

    // Store hashed refresh token
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const refreshExpires = this.configService.get('jwt.refreshExpires');
    const expiresAt = this.parseExpiry(refreshExpires);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private parseExpiry(expiresIn: string): Date {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);
    const now = new Date();
    if (unit === 'm') now.setMinutes(now.getMinutes() + value);
    else if (unit === 'h') now.setHours(now.getHours() + value);
    else if (unit === 'd') now.setDate(now.getDate() + value);
    return now;
  }
}
