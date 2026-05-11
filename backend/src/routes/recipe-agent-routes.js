import { Router } from 'express'
import { postWasteSaverRecipes } from '../controllers/recipe-agent-controller.js'

const recipeAgentRouter = Router()

recipeAgentRouter.post('/waste-saver', postWasteSaverRecipes)

export default recipeAgentRouter