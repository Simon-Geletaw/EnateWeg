import { Router } from 'express';
import * as ingredientController from '../controllers/ingredient.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', ingredientController.searchIngredients);
router.get('/:id', ingredientController.getIngredient);

export default router;
