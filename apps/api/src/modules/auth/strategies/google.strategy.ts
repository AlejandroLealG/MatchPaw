import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { UserRole } from '@matchpaw/shared';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    config: ConfigService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID', 'placeholder'),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET', 'placeholder'),
      callbackURL: 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: { query?: { role?: string } },
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;
    const displayName = profile.displayName;

    if (!email) {
      return done(new Error('No se pudo obtener el email de Google'), undefined);
    }

    const rawRole = req.query?.role;
    const role: UserRole = rawRole === 'refugio' ? 'refugio' : 'adoptante';

    try {
      const user = await this.authService.validateGoogleUser(
        { email, googleId, displayName },
        role,
      );
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
