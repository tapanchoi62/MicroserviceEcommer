import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GithubStrategy.name);
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('oauth.github.clientId');
    const clientSecret = configService.get<string>('oauth.github.clientSecret');
    const callbackURL = configService.get<string>('oauth.github.callbackUrl');

    super({
      clientID: clientID || 'GITHUB_OAUTH_NOT_CONFIGURED',
      clientSecret: clientSecret || 'GITHUB_OAUTH_NOT_CONFIGURED',
      callbackURL: callbackURL || 'http://localhost:3001/api/v1/auth/github/callback',
      scope: ['user:email'],
    });

    this.isEnabled = !!(clientID && clientSecret);

    if (!this.isEnabled) {
      this.logger.warn(
        'GitHub OAuth is DISABLED — set GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET in .env to enable',
      );
    }
  }

  authenticate(req: any, options?: any) {
    if (!this.isEnabled) {
      return this.error(
        new Error(
          'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.',
        ),
      );
    }
    super.authenticate(req, options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ): Promise<any> {
    const primaryEmail =
      profile.emails?.find((e: any) => e.primary)?.value ??
      profile.emails?.[0]?.value ??
      `${profile.username}@github.com`;

    const user = {
      providerId: profile.id,
      provider: 'github',
      email: primaryEmail,
      fullName: profile.displayName || profile.username,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, user);
  }
}
