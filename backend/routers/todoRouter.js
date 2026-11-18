import { Router } from 'express'
import { ObjectId } from 'mongodb'

export function createTodoRouter(todoCollection) {
  const router = Router()

  router.get('/', async (_request, response) => {
    const todos = await todoCollection.find().sort({ createdAt: -1 }).toArray()
    response.status(200).json(todos)
  })

  router.post('/', async (request, response) => {
    const body = request.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      response.status(400).json({ error: '요청 본문은 객체여야 합니다.' })
      return
    }

    const allowedFields = new Set(['title', 'description'])
    if (Object.keys(body).some((field) => !allowedFields.has(field))) {
      response.status(400).json({ error: '허용되지 않은 필드가 포함되어 있습니다.' })
      return
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (title.length === 0 || title.length > 200) {
      response.status(400).json({ error: '제목은 1자 이상 200자 이하여야 합니다.' })
      return
    }
    if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 2000)) {
      response.status(400).json({ error: '설명은 2000자 이하의 문자열이어야 합니다.' })
      return
    }

    const now = new Date()
    const todo = { title, completed: false, createdAt: now, updatedAt: now }
    if (body.description !== undefined) todo.description = body.description
    const result = await todoCollection.insertOne(todo)
    response.status(201).json({ ...todo, _id: result.insertedId })
  })

  router.patch('/:id', async (request, response) => {
    const { id } = request.params
    if (!ObjectId.isValid(id)) {
      response.status(400).json({ error: '유효하지 않은 할 일 ID입니다.' })
      return
    }

    const body = request.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      response.status(400).json({ error: '요청 본문은 객체여야 합니다.' })
      return
    }

    const allowedFields = new Set(['title', 'description', 'completed'])
    const fields = Object.keys(body)
    if (fields.length === 0 || fields.some((field) => !allowedFields.has(field))) {
      response.status(400).json({ error: '수정할 필드를 입력하거나 허용된 필드만 사용하세요.' })
      return
    }

    const updates = {}
    if (Object.hasOwn(body, 'title')) {
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (title.length === 0 || title.length > 200) {
        response.status(400).json({ error: '제목은 1자 이상 200자 이하여야 합니다.' })
        return
      }
      updates.title = title
    }
    if (Object.hasOwn(body, 'description')) {
      if (typeof body.description !== 'string' || body.description.length > 2000) {
        response.status(400).json({ error: '설명은 2000자 이하의 문자열이어야 합니다.' })
        return
      }
      updates.description = body.description
    }
    if (Object.hasOwn(body, 'completed')) {
      if (typeof body.completed !== 'boolean') {
        response.status(400).json({ error: '완료 여부는 boolean 값이어야 합니다.' })
        return
      }
      updates.completed = body.completed
    }

    updates.updatedAt = new Date()
    const filter = { _id: new ObjectId(id) }
    const result = await todoCollection.updateOne(filter, { $set: updates })
    if (result.matchedCount === 0) {
      response.status(404).json({ error: '할 일을 찾을 수 없습니다.' })
      return
    }
    response.status(200).json(await todoCollection.findOne(filter))
  })

  router.delete('/:id', async (request, response) => {
    const { id } = request.params
    if (!ObjectId.isValid(id)) {
      response.status(400).json({ error: '유효하지 않은 할 일 ID입니다.' })
      return
    }
    const result = await todoCollection.deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) {
      response.status(404).json({ error: '할 일을 찾을 수 없습니다.' })
      return
    }
    response.status(204).end()
  })

  return router
}
