import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from '../services/auth.service';
import { MfaService } from '../services/mfa.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { VerifyMfaDto } from '../dto/verify-mfa.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { JwtPayload, RefreshTokenPayload } from '../interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private mfaService: MfaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ─── Register ─────────────────────────────────────────────
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ─── Login (Local Strategy — email + password) ────────────
  @Public()
  @UseGuards(LocalAuthGuard)          // 1️⃣ LocalStrategy.validate(email, password) runs first
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password (local strategy)' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful — returns accessToken + refreshToken' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Req() req: Request & { user: any }) {
    // 2️⃣ req.user is set by LocalStrategy after successful validation
    return this.authService.loginWithUser(req.user, req);
  }

  // ─── Refresh Token ────────────────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const payload = this.decodeRefreshToken(dto.refreshToken);
    return this.authService.refreshTokens(payload.sub, dto.refreshToken);
  }

  // ─── Logout ───────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@CurrentUser() user: JwtPayload) {
    const accessExpiresInSeconds = 15 * 60; // 15m
    return this.authService.logout(user.sub, user.jti, accessExpiresInSeconds);
  }

  // ─── Profile ──────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }

  // ─── Sessions ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active sessions' })
  async getSessions(@CurrentUser('sub') userId: string) {
    return this.authService.getSessions(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @CurrentUser('sub') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(userId, sessionId);
  }

  // ─── OAuth Google ─────────────────────────────────────────
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth login (requires GOOGLE_CLIENT_ID in .env)' })
  async googleAuth() {
    // Passport tự redirect — không cần body
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${result.accessToken}`);
  }

  // ─── OAuth GitHub ─────────────────────────────────────────
  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth login (requires GITHUB_CLIENT_ID in .env)' })
  async githubAuth() {
    // Passport tự redirect — không cần body
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubAuthCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${result.accessToken}`);
  }

  // ─── MFA ──────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate MFA QR code' })
  async setupMfa(@CurrentUser() user: JwtPayload) {
    return this.mfaService.generateMfaSecret(user.sub, user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable MFA after scanning QR' })
  async enableMfa(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyMfaDto,
  ) {
    await this.mfaService.enableMfa(userId, dto.otp);
    return { message: 'MFA enabled successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  async disableMfa(@CurrentUser('sub') userId: string) {
    await this.mfaService.disableMfa(userId);
    return { message: 'MFA disabled successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify MFA OTP code' })
  async verifyMfa(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyMfaDto,
  ) {
    const isValid = await this.mfaService.validateMfa(userId, dto.otp);
    return { valid: isValid };
  }

  // ─── Health ───────────────────────────────────────────────
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { status: 'ok', service: 'auth-service', timestamp: new Date() };
  }

  // Chỉ decode (không verify) để lấy userId — verification thực hiện trong refreshTokens()
  private decodeRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = this.jwtService.decode<RefreshTokenPayload>(token);
      if (!payload?.sub) throw new Error('Missing sub claim');
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token format');
    }
  }
}
