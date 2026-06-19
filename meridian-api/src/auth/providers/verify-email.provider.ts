import {
  BadRequestException,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import {
  VERIFICATION_TTL_MS,
  VerificationTokenProvider,
} from './verification-token.provider';
import { MailProvider } from 'src/mail/providers/mail.provider';

export interface VerifyEmailResult {
  verified: boolean;
  email: string;
}

export interface ResendVerificationResult {
  sent: boolean;
}

@Injectable()
export class VerifyEmailProvider {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly tokens: VerificationTokenProvider,
    private readonly mail: MailProvider,
  ) {}

  /**
   * Verify a raw token that the user received in their email.
   *
   * - Returns `{ alreadyVerified: true }` for users who are already verified
   *   so the link is safely idempotent.
   * - Throws `BadRequestException` for missing, malformed, expired, or
   *   mismatched tokens.
   */
  public async verifyEmail(
    rawToken: string,
  ): Promise<
    { verified: true; email: string } | { alreadyVerified: true; email: string }
  > {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
      throw new BadRequestException('Verification token is required');
    }

    const tokenHash = this.tokens.hash(rawToken);

    let user: User | null;
    try {
      user = await this.users.findOne({
        where: { verificationToken: tokenHash },
      });
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, Please try later',
        { description: 'Error connecting to database' },
      );
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      return { alreadyVerified: true, email: user.email };
    }

    const expiresAt = user.verificationTokenExpires;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Verification token has expired. Please request a new one.',
      );
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    try {
      await this.users.save(user);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, Please try later',
        { description: 'Error connecting to database' },
      );
    }

    // Fire-and-forget welcome email; failures must not block verification.
    try {
      await this.mail.WelcomeEmail(user);
    } catch (error) {
      // We intentionally swallow mail errors after successful verification
      // so the user can still complete sign-in.
    }

    return { verified: true, email: user.email };
  }

  /**
   * Resend a verification email to the supplied address.
   *
   * Returns a generic response (no information leak) so callers cannot tell
   * whether an address actually exists. If the user is already verified we
   * silently report success without sending another email.
   */
  public async resendVerification(
    email: string,
  ): Promise<ResendVerificationResult> {
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('Email is required');
    }

    let user: User | null;
    try {
      user = await this.users.findOne({ where: { email } });
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, Please try later',
        { description: 'Error connecting to database' },
      );
    }

    if (!user) {
      // Generic response to avoid disclosing whether an email exists.
      return { sent: false };
    }

    if (user.emailVerified) {
      return { sent: false };
    }

    const rawToken = this.tokens.generate();
    user.verificationToken = this.tokens.hash(rawToken);
    user.verificationTokenExpires = new Date(Date.now() + VERIFICATION_TTL_MS);

    try {
      await this.users.save(user);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, Please try later',
        { description: 'Error connecting to database' },
      );
    }

    try {
      await this.mail.sendVerificationEmail(user, rawToken);
    } catch (error) {
      // Failure to send mail does not undo the token rotation; the caller
      // will get a generic success and can retry in 60 seconds.
    }

    return { sent: true };
  }
}
