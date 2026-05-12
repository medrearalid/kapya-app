import { Router } from 'express'
import { postGenerateRecipeByName, postWasteSaverRecipes } from '../controllers/recipeController.js'

const recipeAgentRouter = Router()

recipeAgentRouter.post('/waste-saver', postWasteSaverRecipes)
recipeAgentRouter.post('/by-name', postGenerateRecipeByName)

export default recipeAgentRouter