import { Router } from 'express'
import { postWasteSaverRecipes } from '../controllers/recipeController.js'

const recipeAgentRouter = Router()

recipeAgentRouter.post('/waste-saver', postWasteSaverRecipes)

export default recipeAgentRouter