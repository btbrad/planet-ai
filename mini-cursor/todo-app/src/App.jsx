import { useState, useEffect } from 'react'
import TodoList from './TodoList.jsx'

const STORAGE_KEY = 'react-todolist-items'

export default function App() {
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  const addTodo = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setTodos([...todos, { id: Date.now(), text, done: false }])
    setInput('')
  }

  const toggleTodo = (id) =>
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))

  const removeTodo = (id) => setTodos(todos.filter((t) => t.id !== id))

  const clearDone = () => setTodos(todos.filter((t) => !t.done))

  const remaining = todos.filter((t) => !t.done).length

  return (
    <div className="app">
      <h1>📝 TodoList</h1>

      <form className="add-form" onSubmit={addTodo}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="添加一个新任务..."
        />
        <button type="submit">添加</button>
      </form>

      <TodoList todos={todos} onToggle={toggleTodo} onRemove={removeTodo} />

      <div className="footer">
        <span>剩余 {remaining} 项待完成</span>
        {todos.some((t) => t.done) && (
          <button className="clear" onClick={clearDone}>
            清除已完成
          </button>
        )}
      </div>
    </div>
  )
}
