#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// ─── ANSI colours (no dependencies) ─────────────────────────────────────────
const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  black:   '\x1b[30m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgGreen: '\x1b[42m',
  bgBlue:  '\x1b[44m',
  bgCyan:  '\x1b[46m',
}
const bold   = s => `${c.bold}${s}${c.reset}`
const dim    = s => `${c.dim}${s}${c.reset}`
const green  = s => `${c.green}${s}${c.reset}`
const yellow = s => `${c.yellow}${s}${c.reset}`
const cyan   = s => `${c.cyan}${s}${c.reset}`
const red    = s => `${c.red}${s}${c.reset}`
const magenta= s => `${c.magenta}${s}${c.reset}`
const blue   = s => `${c.blue}${s}${c.reset}`

// ─── Load state ──────────────────────────────────────────────────────────────
const statusPath = path.join(__dirname, '..', 'project-status.json')
if (!fs.existsSync(statusPath)) {
  console.error(red('\n  project-status.json not found. Run from repo root.\n'))
  process.exit(1)
}
const data = JSON.parse(fs.readFileSync(statusPath, 'utf8'))

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PHASE_ICONS = ['', '🛠️ ', '🎬 ', '🎨 ', '✨ ', '\ud83d� ']
const STATUS_MAP  = {
  not_started: dim('○  Not started'),
  in_progress: yellow('◔  In progress'),
  complete:    green('●  Complete'),
  locked:      cyan('\ud83d�  Locked'),
}

function bar(done, total, width = 24) {
  const filled = Math.round((done / total) * width)
  const empty  = width - filled
  return green('█'.repeat(filled)) + dim('░'.repeat(empty))
}

function phaseLabel(phase) {
  const icon   = PHASE_ICONS[phase.id] || ''
  const status = STATUS_MAP[phase.status] || dim('○  Unknown')
  const done   = phase.tasks.filter(t => t.done).length
  const total  = phase.tasks.length
  const pct    = total ? Math.round((done / total) * 100) : 0
  const isCurrent = phase.id === data.currentPhase
  const marker = isCurrent ? bold(yellow(' ◄ YOU ARE HERE')) : ''
  return `  ${bold(cyan(`Phase ${phase.id}`))}  ${icon}${bold(phase.name)}${marker}\n` +
         `  ${status}   ${bar(done, total)} ${dim(`${done}/${total} tasks (${pct}%)`)}`
}

// ─── Render ──────────────────────────────────────────────────────────────────
const LINE = dim('─'.repeat(54))

console.log()
console.log(bold(cyan(`  \ud83c�️  ${data.app}  —  Project Status`)))
console.log(dim(`  ${data.lastUpdated}`))
console.log(`  ${LINE}`)

// Current phase callout
if (data.currentPhase === 0) {
  console.log()
  console.log(`  ${bold(yellow('▶  READY TO START'))}  ${dim('No phase active yet.')}` )
} else {
  const cur = data.phases.find(p => p.id === data.currentPhase)
  if (cur) {
    const done  = cur.tasks.filter(t => t.done).length
    const total = cur.tasks.length
    console.log()
    console.log(`  ${bold(yellow(`▶  ACTIVE PHASE ${cur.id} — ${cur.name.toUpperCase()}`))}`)
    console.log(`  ${bar(done, total, 36)}  ${bold(`${done}/${total}`)} tasks`)
  }
}

console.log()
console.log(`  ${LINE}`)
console.log()

// All phases
data.phases.forEach(phase => {
  console.log(phaseLabel(phase))
  // Show tasks only for current phase
  if (phase.id === data.currentPhase) {
    console.log()
    phase.tasks.forEach(task => {
      const tick = task.done ? green('✓') : dim('□')
      const label = task.done ? dim(task.label) : task.label
      console.log(`      ${tick}  ${label}`)
    })
  }
  console.log()
})

console.log(`  ${LINE}`)

// Last / Next
console.log()
console.log(`  ${bold('Last task:')}  ${dim(data.lastTask)}`)
console.log()
console.log(`  ${bold(green('Next task:'))}  ${data.nextTask}`)
console.log()
console.log(`  ${LINE}`)

// Resume prompt
console.log()
console.log(bold('  \ud83d�  Paste this into your next session:'))
console.log()
console.log(cyan(`  I'm building ${data.app} — a high-fidelity recipe app.`))
console.log(cyan('  Read SESSION_BRIEF.md in the repo root for full context.'))
const activePhase = data.phases.find(p => p.id === data.currentPhase)
if (activePhase) {
  console.log(cyan(`  We are on Phase ${activePhase.id} — ${activePhase.name}.`))
}
console.log(cyan(`  Last task: ${data.lastTask}`))
console.log(cyan(`  Next task: ${data.nextTask}`))
console.log(cyan('  Continue from here.'))
console.log()
console.log(`  ${LINE}`)
console.log()
