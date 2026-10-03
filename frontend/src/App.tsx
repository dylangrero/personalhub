import { mockProjects } from './data/mockProjects'
import { mockTasks } from './data/mockTasks'

type ScheduleItem = {
  time: string
  title: string
  detail: string
  duration: string
  accent: 'amber' | 'blue' | 'green'
}

const schedule: ScheduleItem[] = [
  {
    time: '09:30',
    title: 'Weekly planning',
    detail: 'Personal · Desk',
    duration: '45 min',
    accent: 'amber',
  },
  {
    time: '11:00',
    title: 'Focus block',
    detail: 'Personal Hub',
    duration: '2 hours',
    accent: 'blue',
  },
  {
    time: '15:30',
    title: 'Afternoon walk',
    detail: 'Outside',
    duration: '30 min',
    accent: 'green',
  },
]

const accentClasses: Record<ScheduleItem['accent'], string> = {
  amber: 'bg-amber-300',
  blue: 'bg-sky-300',
  green: 'bg-emerald-300',
}

function formatToday() {
  const today = new Date()

  return {
    day: new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(today),
    date: new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(today),
    shortDate: new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
    })
      .format(today)
      .toUpperCase(),
  }
}

function SectionHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string
  title: string
  meta?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
      <div>
        <p className="mb-2 text-[0.65rem] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
          {eyebrow}
        </p>
        <h2 className="text-lg font-medium tracking-tight text-zinc-100">{title}</h2>
      </div>
      {meta && <span className="text-xs text-zinc-500">{meta}</span>}
    </div>
  )
}

function Schedule() {
  return (
    <section className="border border-white/10 bg-white/[0.025] p-5 sm:p-6 lg:p-7">
      <SectionHeading eyebrow="Timeline" title="Today’s schedule" meta="3 events" />
      <div className="mt-2">
        {schedule.map((item) => (
          <article
            key={`${item.time}-${item.title}`}
            className="group grid grid-cols-[3.5rem_0.5rem_1fr] gap-3 border-b border-white/[0.07] py-5 last:border-b-0 sm:grid-cols-[4.25rem_0.5rem_1fr_auto] sm:items-center sm:gap-4"
          >
            <time className="font-mono text-xs text-zinc-400">{item.time}</time>
            <span className={`h-2 w-2 ${accentClasses[item.accent]}`} aria-hidden="true" />
            <div>
              <h3 className="text-sm font-medium text-zinc-100 transition-colors group-hover:text-white">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">{item.detail}</p>
            </div>
            <span className="col-start-3 text-xs text-zinc-600 sm:col-start-auto">
              {item.duration}
            </span>
          </article>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 border-t border-dashed border-white/10 pt-5 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-white/10" />
        4h 45m open today
      </div>
    </section>
  )
}

function PriorityTasks() {
  return (
    <section className="border border-white/10 bg-white/[0.025] p-5 sm:p-6 lg:p-7">
      <SectionHeading eyebrow="Focus" title="Priority tasks" meta="4 remaining" />
      <div className="mt-2">
        {mockTasks.map((task, index) => (
          <article
            key={task.id}
            className="group flex items-start gap-4 border-b border-white/[0.07] py-4 last:border-b-0"
          >
            <button
              type="button"
              aria-label={`Mark ${task.title} complete`}
              className="mt-0.5 grid h-5 w-5 shrink-0 cursor-pointer place-items-center border border-zinc-600 transition-colors hover:border-amber-300"
            >
              <span className="h-1.5 w-1.5 bg-transparent transition-colors group-hover:bg-amber-300" />
            </button>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-zinc-200">{task.title}</h3>
              <p className="mt-1 text-xs text-zinc-500">{task.category}</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span
                className={`h-1.5 w-1.5 ${task.priority === 'High' ? 'bg-rose-300' : 'bg-zinc-600'}`}
              />
              <span className="hidden text-[0.65rem] tracking-wider text-zinc-500 uppercase sm:inline">
                {task.priority}
              </span>
            </div>
            <span className="font-mono text-[0.65rem] text-zinc-700">0{index + 1}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

function ActiveProjects() {
  return (
    <section className="border-t border-white/10 pt-6">
      <SectionHeading eyebrow="Momentum" title="Active projects" meta="3 in motion" />
      <div className="mt-5 grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
        {mockProjects.map((project) => (
          <article key={project.id} className="bg-[#0d0f12] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-zinc-100">{project.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">{project.description}</p>
              </div>
              <span className="font-mono text-xs text-zinc-600">{project.progress}%</span>
            </div>
            <div className="mt-7 h-px bg-white/10">
              <div className="h-px bg-amber-300" style={{ width: `${project.progress}%` }} />
            </div>
            <div className="mt-5 flex items-center justify-between gap-4 text-xs">
              <span className="text-zinc-600">Next</span>
              <span className="text-right text-zinc-300">{project.nextAction}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function DailyBrief() {
  return (
    <aside className="relative overflow-hidden border border-amber-200/20 bg-amber-100/[0.045] p-5 sm:p-6 lg:p-7">
      <div className="absolute top-0 left-0 h-px w-24 bg-amber-300" />
      <SectionHeading eyebrow="Daily brief" title="A clear runway" meta="08:02" />
      <p className="mt-6 text-base leading-7 text-zinc-300">
        Your morning is intentionally light. Use the first focus block to settle the Personal Hub
        structure, then step away before the afternoon.
      </p>
      <div className="mt-7 grid grid-cols-2 gap-6 border-t border-white/10 pt-5">
        <div>
          <p className="text-2xl font-light tracking-tight text-zinc-100">12°</p>
          <p className="mt-1 text-xs text-zinc-500">Cloudy · London</p>
        </div>
        <div>
          <p className="text-2xl font-light tracking-tight text-zinc-100">4h 45m</p>
          <p className="mt-1 text-xs text-zinc-500">Open time</p>
        </div>
      </div>
      <p className="mt-6 border-l border-amber-300/50 pl-4 text-xs leading-5 text-zinc-500">
        One thing at a time. The important work already has space.
      </p>
    </aside>
  )
}

function App() {
  const today = formatToday()

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-zinc-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center border border-amber-300/40 text-[0.65rem] font-bold tracking-widest text-amber-200">
              PH
            </span>
            <span className="text-sm font-medium tracking-wide text-zinc-300">Personal Hub</span>
          </div>
          <nav aria-label="Primary navigation" className="hidden items-center gap-7 text-xs text-zinc-500 sm:flex">
            <a href="#today" className="border-b border-amber-300 pb-1 text-zinc-100">Today</a>
            <a href="#tasks" className="pb-1 transition-colors hover:text-zinc-200">Tasks</a>
            <a href="#projects" className="pb-1 transition-colors hover:text-zinc-200">Projects</a>
          </nav>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            All clear
          </div>
        </div>
      </header>

      <main id="today" className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <section className="grid gap-8 border-b border-white/10 pb-10 sm:pb-14 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-4 text-[0.65rem] font-semibold tracking-[0.25em] text-amber-200 uppercase">
              Your day at a glance
            </p>
            <h1 className="max-w-3xl text-4xl font-light tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Good morning. <span className="text-zinc-500">Here’s what matters today.</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 lg:flex-col lg:items-end lg:gap-1">
            <span className="font-mono text-xs tracking-wider text-amber-200">{today.shortDate}</span>
            <div className="text-right">
              <p className="text-xl font-medium text-zinc-100">{today.day}</p>
              <p className="mt-1 text-xs text-zinc-500">{today.date}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_1fr_0.8fr]">
          <Schedule />
          <div id="tasks"><PriorityTasks /></div>
          <DailyBrief />
        </div>

        <div id="projects" className="mt-12 sm:mt-16">
          <ActiveProjects />
        </div>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-6 text-[0.65rem] tracking-wider text-zinc-600 uppercase sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>Personal Hub · Local workspace</span>
          <span>Make space for what matters</span>
        </div>
      </footer>
    </div>
  )
}

export default App
