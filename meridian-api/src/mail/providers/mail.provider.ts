import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/user.entity';

@Injectable()
export class MailProvider {
  constructor(
    //inject the mailer Service
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Sends a one-time verification email so the user can confirm ownership
   * of the address they signed up with.
   */
  public async sendVerificationEmail(user: User, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const verifyUrl = `${frontendUrl.replace(/\/$/, '')}/auth/verify-email?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      from: `"estatte-management" <helpdesk@estate-management.com>`,
      subject: 'Verify your estatte-management account',
      template: './verification',
      context: {
        name: user.firstName,
        email: user.email,
        verifyUrl,
      },
    });
  }

  public async WelcomeEmail(user: User): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    await this.mailerService.sendMail({
      to: user.email,
      from: `"estatte-management" <helpdesk@estate-management.com>`,
      subject: `Welcome to estatte-management`,
      template: './welcome',
      context: {
        name: user.firstName,
        email: user.email,
        loginUrl: `${frontendUrl.replace(/\/$/, '')}/auth/sign-in`,
      },
    });
  }
}
