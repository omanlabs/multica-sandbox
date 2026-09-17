import { useEffect, useState } from 'react'
import { loadTasks, saveTasks } from './storage'
import { STATUSES, STATUS_LABELS, type Status, type Task } from './types'

type ColumnStyle = {
  /** status glyph in the lane header */
  dot: string
  /** thin accent strip at the top of the lane */
  rail: string
  emptyTitle: string
  emptyHint: string
}

const COLUMN_STYLE: Record<Status, ColumnStyle> = {
  backlog: {
    dot: 'bg-slate-500',
    rail: 'bg-slate-500',
    emptyTitle: 'Nothing queued',
    emptyHint: 'New tasks land here first.',
  },
  in_progress: {
    dot: 'bg-amber-700',
    rail: 'bg-amber-700',
    emptyTitle: 'Nothing in flight',
    emptyHint: 'Move a task forward to start it.',
  },
  done: {
    dot: 'bg-emerald-600',
    rail: 'bg-emerald-600',
    emptyTitle: 'Nothing finished',
    emptyHint: 'Completed tasks collect here.',
  },
}

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900'

/** card-level control tone; `disabled:` variants below always win on specificity */
const ICON_BUTTON_TONE = {
  neutral:
    'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900',
  danger:
    'border-slate-300 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
  primary: 'border-slate-900 bg-slate-900 text-white hover:border-slate-700 hover:bg-slate-700',
  destructive: 'border-rose-700 bg-rose-700 text-white hover:border-rose-600 hover:bg-rose-600',
} as const

type IconButtonTone = keyof typeof ICON_BUTTON_TONE

function relativeAge(createdAt: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - createdAt) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function ChevronIcon({ direction }: { direction: -1 | 1 }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <path d={direction === -1 ? 'M12 5 7 10l5 5' : 'M8 5l5 5-5 5'} />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <path d="M13.2 3.3a1.6 1.6 0 0 1 2.3 2.3L7 14.1l-3 .9.9-3 8.3-8.7Z" />
      <path d="M12.2 4.3 14.5 6.6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <path d="M4 6h12" />
      <path d="M8 3.5h4" />
      <path d="M6.5 6l.6 9a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-9" />
      <path d="M9 9v4.5M11 9v4.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <path d="M4.5 10.5 8 14l7.5-8" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  )
}

function TrayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6 text-slate-400"
    >
      <path d="M3 14h4l1.5 2.5h7L17 14h4" />
      <path d="M4.5 14 6 5h12l1.5 9v4a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-4Z" />
    </svg>
  )
}

function IconButton({
  label,
  children,
  onClick,
  tone = 'neutral',
  type = 'button',
  disabled = false,
}: {
  label: string
  children: React.ReactNode
  onClick?: () => void
  tone?: IconButtonTone
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:border-slate-300 disabled:hover:bg-slate-200 disabled:hover:text-slate-500 ${ICON_BUTTON_TONE[tone]} ${FOCUS_RING}`}
    >
      {children}
    </button>
  )
}

/** a card is either read-only, being retitled, or awaiting delete confirmation */
type CardMode = { kind: 'view' } | { kind: 'edit'; draft: string } | { kind: 'confirmDelete' }

function TaskCard({
  task,
  onMove,
  onRename,
  onDelete,
}: {
  task: Task
  onMove: (direction: -1 | 1) => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [mode, setMode] = useState<CardMode>({ kind: 'view' })
  const index = STATUSES.indexOf(task.status)
  const previous = STATUSES[index - 1]
  const next = STATUSES[index + 1]
  const draft = mode.kind === 'edit' ? mode.draft : ''

  function submitRename(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = draft.trim()
    if (trimmed.length === 0) return
    if (trimmed !== task.title) onRename(trimmed)
    setMode({ kind: 'view' })
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md">
      {mode.kind === 'edit' ? (
        <form onSubmit={submitRename} className="flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setMode({ kind: 'edit', draft: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMode({ kind: 'view' })
            }}
            aria-label={`Edit title of “${task.title}”`}
            className={`min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm leading-snug text-slate-900 focus-visible:border-slate-900 ${FOCUS_RING}`}
          />
          <IconButton
            type="submit"
            tone="primary"
            disabled={draft.trim().length === 0}
            label={
              draft.trim().length === 0
                ? `Enter a title for “${task.title}”`
                : `Save new title for “${task.title}”`
            }
          >
            <CheckIcon />
          </IconButton>
          <IconButton
            onClick={() => setMode({ kind: 'view' })}
            label={`Cancel renaming “${task.title}”`}
          >
            <CloseIcon />
          </IconButton>
        </form>
      ) : (
        <p className="text-sm leading-snug font-medium text-slate-900">{task.title}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {mode.kind === 'confirmDelete' ? (
          <>
            <span className="text-xs font-medium text-rose-700">Delete this task?</span>
            <div className="flex gap-1">
              <IconButton
                tone="destructive"
                onClick={onDelete}
                label={`Confirm deleting “${task.title}”`}
              >
                <TrashIcon />
              </IconButton>
              <IconButton onClick={() => setMode({ kind: 'view' })} label={`Keep “${task.title}”`}>
                <CloseIcon />
              </IconButton>
            </div>
          </>
        ) : (
          <>
            <span className="text-xs text-slate-500">Added {relativeAge(task.createdAt)}</span>
            <div className="flex gap-1">
              <IconButton
                disabled={previous === undefined}
                onClick={() => onMove(-1)}
                label={
                  previous === undefined
                    ? `“${task.title}” is already in ${STATUS_LABELS[task.status]}`
                    : `Move “${task.title}” back to ${STATUS_LABELS[previous]}`
                }
              >
                <ChevronIcon direction={-1} />
              </IconButton>
              <IconButton
                disabled={next === undefined}
                onClick={() => onMove(1)}
                label={
                  next === undefined
                    ? `“${task.title}” is already in ${STATUS_LABELS[task.status]}`
                    : `Move “${task.title}” forward to ${STATUS_LABELS[next]}`
                }
              >
                <ChevronIcon direction={1} />
              </IconButton>
              {mode.kind === 'view' && (
                <>
                  <IconButton
                    onClick={() => setMode({ kind: 'edit', draft: task.title })}
                    label={`Rename “${task.title}”`}
                  >
                    <PencilIcon />
                  </IconButton>
                  <IconButton
                    tone="danger"
                    onClick={() => setMode({ kind: 'confirmDelete' })}
                    label={`Delete “${task.title}”`}
                  >
                    <TrashIcon />
                  </IconButton>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  )
}

function EmptyColumn({ style }: { style: ColumnStyle }) {
  return (
    <li className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center">
      <TrayIcon />
      <p className="text-sm font-medium text-slate-700">{style.emptyTitle}</p>
      <p className="text-xs text-slate-500">{style.emptyHint}</p>
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

  function renameTask(id: string, nextTitle: string) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, title: nextTitle } : task)),
    )
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  const doneCount = tasks.filter((task) => task.status === 'done').length

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sandbox board</h1>
            <p className="mt-1 text-sm text-slate-600">
              A deliberately small board used to exercise Multica agent runs.
            </p>
          </div>
          {tasks.length > 0 && (
            <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 tabular-nums">
              {doneCount} of {tasks.length} done
            </p>
          )}
        </header>

        <form onSubmit={addTask} className="mb-8 flex gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs doing?"
            aria-label="Task title"
            className={`flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:border-slate-900 ${FOCUS_RING}`}
          />
          <button
            type="submit"
            disabled={title.trim().length === 0}
            className={`rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-600 disabled:hover:bg-slate-300 ${FOCUS_RING}`}
          >
            Add task
          </button>
        </form>

        <div className="grid items-stretch gap-4 sm:grid-cols-3">
          {STATUSES.map((status: Status) => {
            const column = tasks.filter((task) => task.status === status)
            const style = COLUMN_STYLE[status]
            return (
              <section
                key={status}
                aria-labelledby={`column-${status}`}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-300 bg-slate-100 sm:min-h-80"
              >
                <span aria-hidden="true" className={`h-1 shrink-0 ${style.rail}`} />
                <div className="flex items-center gap-2 border-b border-slate-300 px-3 py-2.5">
                  <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${style.dot}`} />
                  <h2 id={`column-${status}`} className="text-sm font-semibold text-slate-900">
                    {STATUS_LABELS[status]}
                    <span className="sr-only">
                      {' '}
                      — {column.length} {column.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </h2>
                  <span
                    aria-hidden="true"
                    className="ml-auto rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 tabular-nums"
                  >
                    {column.length}
                  </span>
                </div>
                <ul className="flex flex-1 flex-col gap-2 p-3">
                  {column.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMove={(direction) => moveTask(task.id, direction)}
                      onRename={(nextTitle) => renameTask(task.id, nextTitle)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                  {column.length === 0 && <EmptyColumn style={style} />}
                </ul>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
