import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_TODOS_API_URL ?? 'http://localhost:5000/todos'

function messageFrom(error) {
  if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return '서버 응답이 지연되고 있습니다. 백엔드가 실행 중인지 확인해 주세요.'
  }
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}

async function request(path = '', options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(10_000),
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? '서버 요청에 실패했습니다.')
  }

  return response.status === 204 ? null : response.json()
}

function App() {
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchTodos() {
      try {
        const loadedTodos = await request()
        if (!cancelled) setTodos(loadedTodos)
      } catch (loadError) {
        if (!cancelled) setError(`목록을 불러올 수 없습니다. ${messageFrom(loadError)}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTodos()
    return () => { cancelled = true }
  }, [])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('할 일을 입력해 주세요.')
      return
    }

    setSaving(true)
    setError('')
    const payload = { title: trimmedTitle, description }

    try {
      if (editingId) {
        const updated = await request(`/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        setTodos((current) => current.map((todo) => (todo._id === editingId ? updated : todo)))
      } else {
        const created = await request('', { method: 'POST', body: JSON.stringify(payload) })
        setTodos((current) => [created, ...current])
      }
      resetForm()
    } catch (saveError) {
      setError(messageFrom(saveError))
    } finally {
      setSaving(false)
    }
  }

  const toggleTodo = async (todo) => {
    setError('')
    try {
      const updated = await request(`/${todo._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !todo.completed }),
      })
      setTodos((current) => current.map((item) => (item._id === todo._id ? updated : item)))
    } catch (toggleError) {
      setError(messageFrom(toggleError))
    }
  }

  const startEditing = (todo) => {
    setEditingId(todo._id)
    setTitle(todo.title)
    setDescription(todo.description ?? '')
    setError('')
  }

  const deleteTodo = async (id) => {
    if (!window.confirm('이 할 일을 삭제할까요?')) return
    setError('')
    try {
      await request(`/${id}`, { method: 'DELETE' })
      setTodos((current) => current.filter((todo) => todo._id !== id))
      if (editingId === id) resetForm()
    } catch (deleteError) {
      setError(messageFrom(deleteError))
    }
  }

  const completedCount = todos.filter((todo) => todo.completed).length

  return (
    <main className="app-shell">
      <section className="todo-app" aria-labelledby="app-title">
        <header>
          <p className="eyebrow">TODAY'S FOCUS</p>
          <h1 id="app-title">할 일 관리</h1>
          <p className="summary">{todos.length}개 중 {completedCount}개 완료</p>
        </header>

        <form className="todo-form" onSubmit={handleSubmit}>
          <label>
            <span>할 일</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength="200" placeholder="무엇을 해야 하나요?" />
          </label>
          <label>
            <span>메모 <em>(선택)</em></span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength="2000" rows="3" placeholder="세부 내용을 적어보세요." />
          </label>
          <div className="form-actions">
            {editingId && <button className="text-button" type="button" onClick={resetForm}>취소</button>}
            <button className="primary-button" type="submit" disabled={saving}>{saving ? '저장 중...' : editingId ? '수정 완료' : '추가하기'}</button>
          </div>
        </form>

        {error && <p className="notice" role="alert">{error}</p>}

        <section className="todo-list" aria-live="polite">
          {loading ? <p className="state-message">할 일을 불러오는 중...</p> : todos.length === 0 ? (
            <p className="state-message">아직 등록한 할 일이 없어요. 첫 번째 계획을 추가해 보세요.</p>
          ) : todos.map((todo) => (
            <article className={`todo-item ${todo.completed ? 'completed' : ''}`} key={todo._id}>
              <input aria-label={`${todo.title} 완료 여부`} type="checkbox" checked={Boolean(todo.completed)} onChange={() => toggleTodo(todo)} />
              <div className="todo-content">
                <h2>{todo.title}</h2>
                {todo.description && <p>{todo.description}</p>}
              </div>
              <div className="item-actions">
                <button type="button" onClick={() => startEditing(todo)}>수정</button>
                <button className="delete-button" type="button" onClick={() => deleteTodo(todo._id)}>삭제</button>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}

export default App
