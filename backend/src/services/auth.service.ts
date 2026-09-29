import User, { IUser } from '../models/User.model';
import { SignupInput, LoginInput } from '../validators/auth.validator';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

export interface AuthResponseData {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    financialProfile: {
      age: number | null;
      monthlySalary: number | null;
      monthlyInvestmentBudget: number | null;
      currency: string;
      isCompleted: boolean;
    };
  };
}

export interface UserProfileData {
  id: string;
  username: string;
  email: string;
  financialProfile: {
    age: number | null;
    monthlySalary: number | null;
    monthlyInvestmentBudget: number | null;
    currency: string;
    isCompleted: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const registerUser = async (input: SignupInput): Promise<AuthResponseData> => {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email already exists') as Error & { statusCode: number };
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await hashPassword(input.password);

  const newUser = await User.create({
    username: input.username.trim(),
    email: normalizedEmail,
    passwordHash: hashedPassword,
    financialProfile: {
      age: null,
      monthlySalary: null,
      monthlyInvestmentBudget: null,
      currency: 'INR',
      isCompleted: false,
    },
  });

  const token = generateToken({
    userId: newUser._id.toString(),
    email: newUser.email,
  });

  return {
    token,
    user: {
      id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
      financialProfile: newUser.financialProfile,
    },
  };
};

const loginUser = async (input: LoginInput): Promise<AuthResponseData> => {
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    const error = new Error('Invalid email or password') as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await comparePassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password') as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      financialProfile: user.financialProfile,
    },
  };
};

const getCurrentUser = async (userId: string): Promise<UserProfileData> => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found') as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    financialProfile: user.financialProfile,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export { registerUser, loginUser, getCurrentUser };
