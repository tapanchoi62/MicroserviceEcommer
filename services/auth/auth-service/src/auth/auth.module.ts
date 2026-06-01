import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { MfaService } from './services/mfa.service';

import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';

import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpires'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MfaService,

    // Local (email + password) strategy — always active
    LocalStrategy,

    // Core JWT strategies — always active
    JwtStrategy,
    RefreshJwtStrategy,

    // OAuth strategies — self-disable if credentials not configured
    GoogleStrategy,
    GithubStrategy,

    // Guards
    LocalAuthGuard,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, LocalAuthGuard, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
