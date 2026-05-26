import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('oauth.google.clientId');
    const clientSecret = configService.get<string>('oauth.google.clientSecret');
    const callbackURL = configService.get<string>('oauth.google.callbackUrl');

    // Passport yêu cầu clientID không được rỗng khi khởi tạo.
    // Dùng placeholder khi chưa cấu hình — authenticate() sẽ chặn trước khi gọi Google.
    super({
      clientID: clientID || 'GOOGLE_OAUTH_NOT_CONFIGURED',
      clientSecret: clientSecret || 'GOOGLE_OAUTH_NOT_CONFIGURED',
      callbackURL: callbackURL || 'http://localhost:3001/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });

    this.isEnabled = !!(clientID && clientSecret);

    if (!this.isEnabled) {
      this.logger.warn(
        'Google OAuth is DISABLED — set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET in .env to enable',
      );
    }
  }

  // Override để chặn khi chưa cấu hình credentials
  authenticate(req: any, options?: any) {
    if (!this.isEnabled) {
      return this.error(
        new Error(
          'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
        ),
      );
    }
    super.authenticate(req, options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    const user = {
      providerId: id,
      provider: 'google',
      email: emails[0].value,
      fullName: `${name.givenName} ${name.familyName}`,
      avatarUrl: photos[0]?.value ?? null,
    };
    done(null, user);
  }
}
