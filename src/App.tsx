import { useEffect, useState } from 'react'
import { loadTasks, saveTasks } from './storage'
import { STATUSES, STATUS_LABELS, type Status, type Task } from './types'

const STATUS_DOT: Record<Status, string> = {
  backlog: 'bg-slate-500',
  in_progress: 'bg-blue-600',
  done: 'bg-emerald-600',
}

const EMPTY_COPY: Record<Status, string> = {
  backlog: 'Nothing queued yet — add a task above.',
  in_progress: 'Move a task here when work starts.',
  done: 'Finished work collects here.',
}

function relativeTime(createdAt: number): string {
  const minutes = Math.floor((Date.now() - createdAt) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function ChevronIcon({ direction }: { direction: -1 | 1 }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <path
        d={direction === -1 ? 'M10 3.5 5.5 8l4.5 4.5' : 'M6 3.5 10.5 8 6 12.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-auto size-6 text-slate-400">
      <path
        d="M3.5 14.5h4l1.5 2h6l1.5-2h4M3.5 14.5 6 5.5h12l2.5 9v4h-17z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900'

const MOVE_BUTTON_BASE = `inline-flex size-7 items-center justify-center rounded-md border transition ${FOCUS_RING}`

function MoveButton({
  direction,
  task,
  disabled,
  onMove,
}: {
  direction: -1 | 1
  task: Task
  disabled: boolean
  onMove: (id: string, direction: -1 | 1) => void
}) {
  const target = STATUSES[STATUSES.indexOf(task.status) + direction]
  return (
    <button
      type="button"
      onClick={() => onMove(task.id, direction)}
      disabled={disabled}
      aria-label={
        disabled
          ? `${task.title} is already in ${STATUS_LABELS[task.status]}`
          : `Move ${task.title} to ${STATUS_LABELS[target]}`
      }
      className={
        disabled
          ? `${MOVE_BUTTON_BASE} border-slate-200 bg-slate-200 text-slate-400`
          : `${MOVE_BUTTON_BASE} border-slate-400 bg-white text-slate-800 shadow-xs hover:border-slate-900 hover:bg-slate-900 hover:text-white`
      }
    >
      <ChevronIcon direction={direction} />
    </button>
  )
}

function TaskCard({
  task,
  onMove,
}: {
  task: Task
  onMove: (id: string, direction: -1 | 1) => void
}) {
  return (
    <li className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm transition hover:border-slate-400 hover:shadow-md">
      <p className="text-sm font-medium leading-snug text-slate-900">{task.title}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{relativeTime(task.createdAt)}</span>
        <div className="flex gap-1">
          <MoveButton
            direction={-1}
            task={task}
            disabled={task.status === STATUSES[0]}
            onMove={onMove}
          />
          <MoveButton
            direction={1}
            task={task}
            disabled={task.status === STATUSES[STATUSES.length - 1]}
            onMove={onMove}
          />
        </div>
      </div>
    </li>
  )
}

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
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sandbox board</h1>
          <p className="mt-1 text-sm text-slate-600">
            A deliberately small board used to exercise Multica agent runs.
          </p>
        </header>

        <form
          onSubmit={addTask}
          className="mb-8 flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs doing?"
            aria-label="Task title"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
          />
          <button
            type="submit"
            disabled={title.trim().length === 0}
            className={`rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-500 ${FOCUS_RING}`}
          >
            Add task
          </button>
        </form>

        <div className="grid gap-5 sm:grid-cols-3">
          {STATUSES.map((status: Status) => {
            const column = tasks.filter((task) => task.status === status)
            return (
              <section
                key={status}
                aria-labelledby={`column-${status}`}
                className="flex flex-col rounded-xl border border-slate-300 bg-slate-100 p-3"
              >
                <div className="mb-3 flex items-center gap-2 border-b border-slate-300 px-1 pb-2.5">
                  <span className={`size-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
                  <h2 id={`column-${status}`} className="text-sm font-semibold text-slate-900">
                    {STATUS_LABELS[status]}
                  </h2>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 tabular-nums">
                    {column.length}
                  </span>
                </div>
                <ul className="flex flex-1 flex-col gap-2 sm:min-h-32">
                  {column.map((task) => (
                    <TaskCard key={task.id} task={task} onMove={moveTask} />
                  ))}
                  {column.length === 0 && (
                    <li className="flex flex-1 flex-col justify-center rounded-lg border border-dashed border-slate-400 bg-white/40 px-3 py-6 text-center">
                      <TrayIcon />
                      <p className="mt-2 text-xs text-slate-600">{EMPTY_COPY[status]}</p>
                    </li>
                  )}
                </ul>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
