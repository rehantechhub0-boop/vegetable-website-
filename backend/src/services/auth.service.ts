import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// JWT_SECRET must be provided via environment variable. Production startup in server.ts aborts if missing.
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface RegisterDTO {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UserSanitized {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  tokenVersion: number;
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export function generateToken(user: { id: string; email: string | null; phone: string | null; name: string; role: string; tokenVersion: number }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      tokenVersion: user.tokenVersion,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as any }
  );
}

export function sanitizeUser(user: any): UserSanitized {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    tokenVersion: user.tokenVersion ?? 0,
  };
}

export async function registerUser(prisma: PrismaClient, data: RegisterDTO): Promise<{ user: UserSanitized; token: string }> {
  const emailClean = data.email.trim().toLowerCase();
  const nameClean = data.name.trim();
  const phoneClean = data.phone ? data.phone.trim() : null;

  if (!emailClean || !emailClean.includes('@')) {
    throw new AuthError('Valid email address is required.', 400);
  }

  if (nameClean.length < 2) {
    throw new AuthError('Full name must be at least 2 characters long.', 400);
  }

  if (!data.password || data.password.length < 6) {
    throw new AuthError('Password must be at least 6 characters long.', 400);
  }

  // Check existing user by email
  const existingEmail = await prisma.user.findUnique({
    where: { email: emailClean },
  });
  if (existingEmail) {
    throw new AuthError('An account with this email address already exists. Please login.', 409);
  }

  // Check phone if provided
  if (phoneClean) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone: phoneClean },
    });
    if (existingPhone) {
      throw new AuthError('An account with this phone number already exists.', 409);
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.password, salt);

  const createdUser = await prisma.user.create({
    data: {
      name: nameClean,
      email: emailClean,
      phone: phoneClean,
      passwordHash,
      role: 'CUSTOMER',
    },
  });

  const sanitized = sanitizeUser(createdUser);
  const token = generateToken(sanitized);

  return { user: sanitized, token };
}

export async function loginUser(prisma: PrismaClient, data: LoginDTO): Promise<{ user: UserSanitized; token: string }> {
  const emailClean = data.email.trim().toLowerCase();

  if (!emailClean || !data.password) {
    throw new AuthError('Email and password are required.', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: emailClean },
  });

  if (!user || !user.passwordHash) {
    throw new AuthError('Invalid email or password.', 401);
  }

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) {
    throw new AuthError('Invalid email or password.', 401);
  }

  const sanitized = sanitizeUser(user);
  const token = generateToken(sanitized);

  return { user: sanitized, token };
}

export async function googleLoginWithPayload(
  prisma: PrismaClient,
  googleProfile: { googleId: string; email: string; name: string }
): Promise<{ user: UserSanitized; token: string }> {
  const emailClean = googleProfile.email.trim().toLowerCase();

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: googleProfile.googleId }, { email: emailClean }],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: googleProfile.name,
        email: emailClean,
        googleId: googleProfile.googleId,
        role: 'CUSTOMER',
      },
    });
  } else if (!user.googleId) {
    // Link googleId to existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: googleProfile.googleId },
    });
  }

  const sanitized = sanitizeUser(user);
  const token = generateToken(sanitized);

  return { user: sanitized, token };
}
