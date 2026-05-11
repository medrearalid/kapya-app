import { Router } from 'express'
import { postAnalyzeReceipt } from '../controllers/receiptController.js'

const receiptRouter = Router()

receiptRouter.post('/analyze', postAnalyzeReceipt)

export default receiptRouter