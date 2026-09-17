import { useEffect, useState } from 'react'
import { loadTasks, saveTasks } from './storage'
import { STATUSES, STATUS_LABELS, type Status, type Task } from './types'

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [title, setTitle] = useState('')

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  function addTask(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed.length === 0) return
    setTasks((current) => [
      ...current,
      { id: crypto.randomUUID(), title: trimmed, status: 'backlog', createdAt: Date.now() },
    ])
    setTitle('')
  }

  function moveTask(id: string, direction: -1 | 1) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id) return task
        const index = STATUSES.indexOf(task.status) + direction
        const clamped = Math.min(Math.max(index, 0), STATUSES.length - 1)
        return { ...task, status: STATUSES[clamped] }
      }),
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sandbox board</h1>
        <p className="mt-1 text-sm text-slate-500">
          A deliberately small board used to exercise Multica agent runs.
        </p>
      </header>

      <form onSubmit={addTask} className="mb-10 flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          aria-label="Task title"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Add
        </button>
      </form>

      <div className="grid gap-6 sm:grid-cols-3">
        {STATUSES.map((status: Status) => {
          const column = tasks.filter((task) => task.status === status)
          return (
            <section key={status}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {STATUS_LABELS[status]} ({column.length})
              </h2>
              <ul className="space-y-2">
                {column.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-md border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <p className="text-sm text-slate-800">{task.title}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => moveTask(task.id, -1)}
                        disabled={status === 'backlog'}
                        className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => moveTask(task.id, 1)}
                        disabled={status === 'done'}
                        className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30"
                      >
                        Forward →
                      </button>
                    </div>
                  </li>
                ))}
                {column.length === 0 && (
                  <li className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                    Nothing here yet
                  </li>
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </main>
  )
}
