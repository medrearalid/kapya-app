import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import insightsRouter from './routes/insights-routes.js'
import recipeAgentRouter from './routes/recipe-agent-routes.js'
import receiptRouter from './routes/receipt-routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const port = Number(process.env.PORT) || 3001

app.use(
  cors({
    origin: (origin, callback) => {
      const isNetlify = origin === 'https://kapya-app.netlify.app'
      const isLocalhost = !origin || /^http:\/\/localhost(:\d+)?$/.test(origin)
      callback(null, isNetlify || isLocalhost)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
)
app.use(express.json({ limit: '10mb' }))

app.get('/health', (_request, response) => {
	response.status(200).json({ status: 'ok' })
})

app.use('/api/ai/recipes', recipeAgentRouter)
app.use('/api/ai/insights', insightsRouter)
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
