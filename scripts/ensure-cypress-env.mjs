#!/usr/bin/env node
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(root, 'cypress.env.json')
const example = path.join(root, 'cypress.env.example.json')

if (!existsSync(target)) {
  copyFileSync(example, target)
  console.log('Created cypress.env.json from example — укажите apiTokenInstance из кабинета.')
}
