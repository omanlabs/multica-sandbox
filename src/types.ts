export const STATUSES = ['backlog', 'in_progress', 'done'] as const

export type Status = (typeof STATUSES)[number]

export type Task = {
  id: string
  title: string
  status: Status
  createdAt: number
}

export const STATUS_LABELS: Record<Status, string> = {
  backlog: 'Backlog',
  in_progress: 'In progress',
  done: 'Done',
}
