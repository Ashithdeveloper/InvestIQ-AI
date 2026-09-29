import { Router } from 'express';
import {
  calculateScenarioController,
  compareBudgetController,
} from '../controllers/scenario.controller';
import { validateRequest } from '../middleware/validate.middleware';
import {
  scenarioInputSchema,
  compareBudgetSchema,
} from '../validators/scenario.validator';

const investmentRouter = Router();

// POST /api/investment/scenario - Calculate hypothetical investment scenario
investmentRouter.post(
  '/scenario',
  validateRequest(scenarioInputSchema),
  calculateScenarioController
);

// POST /api/investment/compare-budget - Compare two hypothetical monthly budget allocations
investmentRouter.post(
  '/compare-budget',
  validateRequest(compareBudgetSchema),
  compareBudgetController
);

export default investmentRouter;
export { investmentRouter };
