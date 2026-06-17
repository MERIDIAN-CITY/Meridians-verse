import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { name } from 'ejs';
import { User } from 'src/users/user.entity';

@Injectable()
export class MailProvider {
  constructor(
    //inject the mailer Service
    private readonly mailerService: MailerService,
  ) {}

  public async WelcomeEmail(user: User): Promise<void> {
    await this.mailerService.sendMail({
      to: user.email,
      from: `helpdesk from estate-management.com`,
      subject: `welcome to estate_managment`,
      template: './welcome',
      context: {
        name: user.firstName,
        email: user.email,
        loginUrl: 'http://localhost:3000/',
      },
    });
  }
}
