import { Global, Module } from '@nestjs/common';
import { MailProvider } from './providers/mail.provider';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST'),
          secure: false,
          port: config.get<number>('MAIL_PORT'),
          auth: {
            user: config.get<string>('SMTP_USERNAME'),
            pass: config.get<string>('SMTP_PASSWORD'),
          },
        },
        defaults: {
          from: `"estatte-management" <helpdesk@estate-management.com>`,
        },
        template: {
          dir: join(__dirname, 'template'),
          adapter: new EjsAdapter({
            inlineCssEnabled: true,
          }),
          options: {
            strict: false,
          },
        },
      }),
    }),
  ],
  providers: [MailProvider],
  exports: [MailProvider],
})
export class MailModule {}
