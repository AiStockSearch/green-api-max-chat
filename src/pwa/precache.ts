/** Файлы app shell для precache (пути относительно base). Без sw.js, source maps, dot-файлов и .html, кроме index.html. */
export function precacheEntries(bundleFiles: string[], publicFiles: string[]): string[] {
  const all = [...bundleFiles, ...publicFiles].map((f) => f.replace(/\\/g, '/'))
  const keep = all.filter(
    (f) =>
      f !== 'sw.js' &&
      !f.endsWith('.map') &&
      !f.split('/').some((part) => part.startsWith('.')) &&
      (!f.endsWith('.html') || f === 'index.html'),
  )
  return [...new Set(keep)].sort()
}
