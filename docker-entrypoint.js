#!/usr/bin/env node

// Launch application directly — build is handled during Docker image build
import { spawn } from 'node:child_process'

const env = { ...process.env }

// Start the server
await exec(process.argv.slice(2).join(' '))

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed rc=${code}`))
      }
    })
  })
}
