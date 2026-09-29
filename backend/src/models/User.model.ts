import { Schema, model, Document, Types } from 'mongoose';

export interface IFinancialProfile {
  age: number | null;
  monthlySalary: number | null;
  monthlyInvestmentBudget: number | null;
  currency: 'INR';
  isCompleted: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  financialProfile: IFinancialProfile;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialProfileSchema = new Schema<IFinancialProfile>(
  {
    age: {
      type: Number,
      default: null,
    },
    monthlySalary: {
      type: Number,
      default: null,
    },
    monthlyInvestmentBudget: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      enum: ['INR'],
      default: 'INR',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [2, 'Username must be at least 2 characters long'],
      maxlength: [50, 'Username must be at most 50 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    financialProfile: {
      type: FinancialProfileSchema,
      default: () => ({
        age: null,
        monthlySalary: null,
        monthlyInvestmentBudget: null,
        currency: 'INR',
        isCompleted: false,
      }),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const User = model<IUser>('User', UserSchema);

export default User;
export { User };
