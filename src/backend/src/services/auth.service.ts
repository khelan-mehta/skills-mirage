import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class AuthService {
  async register(email: string, password: string, name: string) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new Error('Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ email, passwordHash, name });
    await user.save();

    const token = this.generateToken(String(user._id));
    return { token, user: this.sanitize(user) };
  }

  async login(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error('Invalid credentials');
    if (!user.passwordHash) throw new Error('Account uses GitHub login');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    const token = this.generateToken(String(user._id));
    return { token, user: this.sanitize(user) };
  }

  generateToken(userId: string): string {
    const expiresInSeconds = 7 * 24 * 60 * 60; // 7 days
    return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: expiresInSeconds });
  }

  verifyToken(token: string): { userId: string } {
    return jwt.verify(token, env.JWT_SECRET) as { userId: string };
  }

  getGitHubAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: 'read:user user:email repo',
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async handleGitHubCallback(code: string) {
    // Exchange code for access token
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenResp.json() as any;
    if (!tokenData.access_token) {
      logger.error('GitHub token exchange failed:', JSON.stringify(tokenData));
      throw new Error(`GitHub OAuth failed: ${tokenData.error_description || tokenData.error || 'no access_token'}`);
    }

    // Get user info
    const userResp = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const ghUser = await userResp.json() as any;

    // Get email if not public
    let email = ghUser.email;
    if (!email) {
      const emailResp = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const emails = await emailResp.json() as any[];
      const primary = emails.find((e: any) => e.primary) || emails[0];
      email = primary?.email;
    }

    if (!email) throw new Error('Could not retrieve email from GitHub');

    // Upsert user
    let user = await User.findOne({ githubId: String(ghUser.id) });
    if (!user) {
      user = await User.findOne({ email });
    }

    if (user) {
      user.githubId = String(ghUser.id);
      user.githubAccessToken = tokenData.access_token;
      user.githubUsername = ghUser.login;
      if (!user.name || user.name === email) user.name = ghUser.name || ghUser.login;
      await user.save();
    } else {
      user = new User({
        email,
        name: ghUser.name || ghUser.login,
        githubId: String(ghUser.id),
        githubAccessToken: tokenData.access_token,
        githubUsername: ghUser.login,
      });
      await user.save();
    }

    const token = this.generateToken(String(user._id));
    return { token, user: this.sanitize(user) };
  }

  async getUser(userId: string) {
    const user = await User.findById(userId).populate('profileId');
    if (!user) throw new Error('User not found');
    return this.sanitize(user);
  }

  private sanitize(user: IUser) {
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      githubUsername: user.githubUsername,
      onboardingComplete: user.onboardingComplete,
      profileId: user.profileId,
      starredJobCount: user.starredJobs.length,
    };
  }
}

export const authService = new AuthService();
