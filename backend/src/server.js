import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import recipeAgentRouter from './routes/recipe-agent-routes.js'
import receiptRouter from './routes/receipt-routes.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/health', (_request, response) => {
	response.status(200).json({ status: 'ok' })
})

app.use('/api/ai/recipes', recipeAgentRouter)
app.use('/api/receipts', receiptRouter)

app.use((error, _request, response, _next) => {
	const statusCode = Number(error?.statusCode) || 500

	if (statusCode >= 500) {
		console.error('[backend-error]', {
			message: error?.message,
			stack: error?.stack,
		})
	}

	const isReceiptRoute = _request.path?.startsWith('/api/receipts')
	const errorMessage =
		statusCode >= 500
			? isReceiptRoute
				? 'Fis analizi yapilirken sunucu hatasi olustu.'
				: 'AI tarifi uretilirken sunucu hatasi olustu.'
			: error.message

	response.status(statusCode).json({
		success: false,
		error: errorMessage,
	})
})

app.listen(port, () => {
	console.log(`Kapya backend listening on port ${port}`)
})
