import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || 'placeholder',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || 'placeholder',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') || 'http://localhost:4000/auth/github/callback',
      scope: ['user:email'],
      state: 'safevitals_oauth_state',
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile, done: any) {
    const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

    if (!email) {
      return done(new UnauthorizedException('No email found in GitHub profile.'), false);
    }

    try {
      // Validate that the user is in our allowlist (and create them if necessary, or just return them)
      const user = await this.authService.validateGithubUser(email, profile);
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
