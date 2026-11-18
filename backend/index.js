import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import { todoSchema } from './models/todoSchema.js'
import { createTodoRouter } from './routers/todoRouter.js'

const port = Number(process.env.PORT ?? 5000)
const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/todo-backend'
const mongoClient = new MongoClient(mongoUri)
const app = express()
const localFrontendOrigin = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/
const configuredFrontendOrigins = new Set(
  (process.env.FRONTEND_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

app.set('etag', false)
app.use(cors({
  origin(origin, callback) {
    // Allow local development plus the URLs explicitly configured for deployment.
    callback(null, !origin || localFrontendOrigin.test(origin) || configuredFrontendOrigins.has(origin))
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))
app.use(express.json())
app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }))

const todoCollection = mongoClient.db().collection('todos')
app.use('/todos', (_request, response, next) => {
  response.set('Cache-Control', 'no-store')
  next()
})
app.use('/todos', createTodoRouter(todoCollection))
app.use((error, _request, response, _next) => {
  console.error('요청 처리 실패:', error)
  response.status(error.status === 400 ? 400 : 500).json({ error: error.status === 400 ? '잘못된 요청입니다.' : '서버 오류가 발생했습니다.' })
})

async function start() {
  await mongoClient.connect()
  const database = mongoClient.db()
  const exists = await database.listCollections({ name: 'todos' }, { nameOnly: true }).hasNext()
  if (exists) {
    await database.command({ collMod: 'todos', validator: todoSchema, validationLevel: 'strict', validationAction: 'error' })
  } else {
    await database.createCollection('todos', { validator: todoSchema, validationLevel: 'strict', validationAction: 'error' })
  }

  const server = createServer(app)
  server.listen(port, () => console.log(`Server listening on http://localhost:${port}`))
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(() => mongoClient.close().finally(() => process.exit(0))))
  }
}

start().catch((error) => {
  console.error('MongoDB 연결 또는 서버 시작 실패:', error)
  process.exitCode = 1
})
