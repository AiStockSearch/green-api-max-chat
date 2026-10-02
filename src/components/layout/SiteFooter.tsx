import styles from './SiteFooter.module.css'

const FOOTER_LINKS = [
  'Безопасность',
  'Условия сервиса',
  'Политика конфиденциальности',
  'База знаний',
  'Статус сервиса',
] as const

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.copy}>© 2025 GREEN-API. Все права защищены.</div>
        <div className={styles.links}>
          {FOOTER_LINKS.map((label) => (
            <a key={label} href="#">
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
