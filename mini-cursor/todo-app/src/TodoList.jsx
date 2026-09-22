export default function TodoList({ todos, onToggle, onRemove }) {
  if (todos.length === 0) {
    return <p className="empty">暂无任务，快来添加一个吧！</p>
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <li key={todo.id} className={todo.done ? 'done' : ''}>
          <label>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => onToggle(todo.id)}
            />
            <span>{todo.text}</span>
          </label>
          <button className="remove" onClick={() => onRemove(todo.id)}>
            ✕
          </button>
        </li>
      ))}
    </ul>
  )
}
