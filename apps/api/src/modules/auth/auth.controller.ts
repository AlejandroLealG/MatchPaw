import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RegisterDto, LoginDto } from '@matchpaw/shared';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { UserDocument } from './schemas/user.schema';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const tokens = await this.authService.register(dto);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
    return { accessToken: tokens.accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const tokens = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const tokens = await this.authService.refresh(refreshToken ?? '');
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
    return { accessToken: tokens.accessToken };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }): Promise<{ message: string }> {
    // Siempre responder con el mismo mensaje para no revelar si el email existe
    await this.authService.forgotPassword(body.email);
    return {
      message: 'Si el correo está registrado, recibirás un enlace de restablecimiento en breve',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { token: string; password: string },
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(body.token, body.password);
    return { message: 'Contraseña actualizada correctamente' };
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(@Query('role') _role?: string): void {
    // El guard redirige a Google; este método no se ejecuta
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = req.user as UserDocument;
    const tokens = await this.authService.googleLogin(user);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    const frontendUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${tokens.accessToken}`);
  }
}
