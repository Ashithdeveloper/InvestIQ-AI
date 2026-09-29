import User, { IFinancialProfile } from '../models/User.model';
import {
  CreateFinancialProfileInput,
  UpdateFinancialProfileInput,
} from '../validators/profile.validator';

export interface FinancialProfileResponseData {
  userId: string;
  financialProfile: IFinancialProfile;
}

const saveFinancialProfile = async (
  userId: string,
  input: CreateFinancialProfileInput
): Promise<FinancialProfileResponseData> => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User not found') as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  user.financialProfile = {
    age: input.age,
    monthlySalary: input.monthlySalary,
    monthlyInvestmentBudget: input.monthlyInvestmentBudget,
    currency: 'INR',
    isCompleted: true,
  };

  await user.save();

  return {
    userId: user._id.toString(),
    financialProfile: user.financialProfile,
  };
};

const getFinancialProfile = async (
  userId: string
): Promise<FinancialProfileResponseData> => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User not found') as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  return {
    userId: user._id.toString(),
    financialProfile: user.financialProfile,
  };
};

const updateFinancialProfile = async (
  userId: string,
  input: UpdateFinancialProfileInput
): Promise<FinancialProfileResponseData> => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User not found') as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  const currentProfile = user.financialProfile;

  const newAge = input.age !== undefined ? input.age : currentProfile.age;
  const newSalary =
    input.monthlySalary !== undefined
      ? input.monthlySalary
      : currentProfile.monthlySalary;
  const newBudget =
    input.monthlyInvestmentBudget !== undefined
      ? input.monthlyInvestmentBudget
      : currentProfile.monthlyInvestmentBudget;

  const isCompleted =
    newAge !== null &&
    newAge !== undefined &&
    newSalary !== null &&
    newSalary !== undefined &&
    newBudget !== null &&
    newBudget !== undefined;

  user.financialProfile = {
    age: newAge,
    monthlySalary: newSalary,
    monthlyInvestmentBudget: newBudget,
    currency: 'INR',
    isCompleted,
  };

  await user.save();

  return {
    userId: user._id.toString(),
    financialProfile: user.financialProfile,
  };
};

export { saveFinancialProfile, getFinancialProfile, updateFinancialProfile };
