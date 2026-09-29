import { Request, Response, NextFunction } from 'express';
import {
  calculateInvestmentScenario,
  compareBudgetScenarios,
} from '../services/scenario.service';
import { sendSuccess } from '../utils/apiResponse';

const calculateScenarioController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const outcome = await calculateInvestmentScenario(req.body);
    sendSuccess(res, 200, 'Hypothetical investment scenario calculated successfully', outcome);
  } catch (error) {
    next(error);
  }
};

const compareBudgetController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const outcome = await compareBudgetScenarios(req.body);
    sendSuccess(res, 200, 'Budget comparison scenario calculated successfully', outcome);
  } catch (error) {
    next(error);
  }
};

export { calculateScenarioController, compareBudgetController };
