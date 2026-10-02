import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { mapPartnerError } from '../../api/errorMapping'
import {
  createInstance,
  deleteInstanceAccount,
  getInstances,
  instanceCredentialsFromCreate,
  instanceCredentialsFromPartnerRow,
  type PartnerCredentials,
  type PartnerInstanceRecord,
} from '../../api/partnerApi'
import { getStateInstance } from '../../api/greenApi'
import { isInstanceAuthorized, parseStateInstance } from '../../api/instanceState'
import type { GreenApiCredentials } from '../../api/types'
import { getDemoVariant, isDemoMode } from '../../demo/demoMode'
import { Icon } from '../Icon'
import { SiteFooter } from '../layout/SiteFooter'
import { TopNavBar } from '../layout/TopNavBar'
import styles from './PartnerInstancesScreen.module.css'

const DEMO_INSTANCES: PartnerInstanceRecord[] = [
  {
    idInstance: 7105183921,
    name: 'MAX — демо инстанс',
    typeInstance: 'max',
    apiTokenInstance: 'demo-token-not-real',
    deleted: false,
    tariff: 'DEVELOPER',
    isExpired: false,
  },
  {
    idInstance: 7105183920,
    name: 'MAX — ожидает QR',
    typeInstance: 'max',
    apiTokenInstance: 'demo-token-pending',
    deleted: false,
  },
]

interface Props {
  partner: PartnerCredentials
  onOpenInstance: (credentials: GreenApiCredentials, needsAuth: boolean) => void
  onBack: () => void
  demoCreateOpen?: boolean
}

export function PartnerInstancesScreen({
  partner,
  onOpenInstance,
  onBack,
  demoCreateOpen,
}: Props) {
  const demoVariant = getDemoVariant()
  const [instances, setInstances] = useState<PartnerInstanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(Boolean(demoCreateOpen))
  const [createName, setCreateName] = useState('MAX инстанс')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    setBanner(null)
    if (isDemoMode()) {
      setInstances(DEMO_INSTANCES.filter((i) => !i.deleted))
      setLoading(false)
      return
    }
    try {
      const rows = await getInstances(partner)
      setInstances(rows.filter((i) => !i.deleted))
    } catch (err) {
      setBanner(mapPartnerError(err).banner)
    } finally {
      setLoading(false)
    }
  }, [partner])

  useEffect(() => {
    queueMicrotask(() => {
      void loadList()
    })
  }, [loadList])

  const openInstance = async (row: PartnerInstanceRecord) => {
    const creds = instanceCredentialsFromPartnerRow(row, partner.partnerApiUrl)
    if (isDemoMode()) {
      const needsAuth = demoVariant === 'create-instance' || row.apiTokenInstance.includes('pending')
      onOpenInstance(creds, needsAuth)
      return
    }
    try {
      const state = parseStateInstance(await getStateInstance(creds))
      onOpenInstance(creds, !isInstanceAuthorized(state))
    } catch {
      onOpenInstance(creds, true)
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setBanner(null)
    if (isDemoMode()) {
      const creds = {
        idInstance: '7105199999',
        apiTokenInstance: 'demo-new-instance-token',
        apiUrl: partner.partnerApiUrl,
      }
      setCreating(false)
      setCreateOpen(false)
      onOpenInstance(creds, true)
      return
    }
    try {
      const created = await createInstance(partner, { name: createName.trim() || 'MAX instance' })
      const creds = instanceCredentialsFromCreate(created)
      setCreateOpen(false)
      onOpenInstance(creds, true)
    } catch (err) {
      setBanner(mapPartnerError(err).banner)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (idInstance: number) => {
    if (!window.confirm(`Удалить инстанс ${idInstance}?`)) {
      return
    }
    setDeletingId(idInstance)
    if (isDemoMode()) {
      setInstances((prev) => prev.filter((i) => i.idInstance !== idInstance))
      setDeletingId(null)
      return
    }
    try {
      await deleteInstanceAccount(partner, idInstance)
      await loadList()
    } catch (err) {
      setBanner(mapPartnerError(err).banner)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={styles.page} data-ui="partner-instances">
      <TopNavBar />
      <main className={styles.main}>
        <div className={styles.card}>
          <header className={styles.head}>
            <div>
              <h1 className={styles.title}>Инстансы партнёра</h1>
              <p className={styles.sub}>
                Partner API: getInstances, createInstance, deleteInstanceAccount
              </p>
            </div>
            <button type="button" className={styles.backBtn} onClick={onBack}>
              <Icon name="arrow_back" size="sm" />
              Назад
            </button>
          </header>

          {banner && (
            <div className={styles.alert} role="alert">
              <Icon name="error" />
              {banner}
            </div>
          )}

          <button
            type="button"
            className={styles.createToggle}
            onClick={() => setCreateOpen((v) => !v)}
          >
            <Icon name="add" size="sm" />
            {createOpen ? 'Скрыть форму' : 'Создать инстанс'}
          </button>

          {createOpen && (
            <form className={styles.createForm} onSubmit={(e) => void handleCreate(e)}>
              <label htmlFor="instanceName">Название</label>
              <input
                id="instanceName"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="MAX — поддержка клиентов"
                disabled={creating}
              />
              <button type="submit" className={styles.primaryBtn} disabled={creating}>
                {creating ? 'Создание…' : 'createInstance'}
              </button>
            </form>
          )}

          {loading ? (
            <p className={styles.muted}>Загрузка списка…</p>
          ) : instances.length === 0 ? (
            <p className={styles.muted}>Нет активных инстансов. Создайте новый.</p>
          ) : (
            <ul className={styles.list}>
              {instances.map((row) => (
                <li key={row.idInstance} className={styles.row}>
                  <div className={styles.rowMain}>
                    <strong>{row.name || `Instance ${row.idInstance}`}</strong>
                    <span className={styles.meta}>
                      id {row.idInstance} · {row.typeInstance}
                      {row.tariff ? ` · ${row.tariff}` : ''}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.primaryBtn} onClick={() => void openInstance(row)}>
                      Открыть
                    </button>
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      disabled={deletingId === row.idInstance}
                      onClick={() => void handleDelete(row.idInstance)}
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className={styles.note}>
            После создания инстанса отсканируйте QR в MAX (метод QR) или используйте личный
            кабинет. Для MAX не поддерживаются StartAuthorization / SendAuthorizationCode /
            getAuthorizationCode (WhatsApp OTP).
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
