import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/useAuth'
import { supabase } from '../utils/supabase'
import {
  addGift,
  createFolder,
  hasLocalWorkspace,
  importLocalWorkspace,
  loadGiftWorkspace,
  removeGift,
  updateGiftPriority,
} from '../utils/folderWorkspace'
import '../styles/Gifts.css'

function Home() {
  const { user, loading: authLoading, authError } = useAuth()
  const [workspace, setWorkspace] = useState({ folders: [], gifts: [] })
  const [folderName, setFolderName] = useState('')
  const [giftTitle, setGiftTitle] = useState('')
  const [giftLink, setGiftLink] = useState('')
  const [giftPriority, setGiftPriority] = useState('3')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (authLoading) return
    let active = true
    async function load() {
      setLoading(true)
      try {
        const next = await loadGiftWorkspace(user)
        if (active) setWorkspace(next)
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [authLoading, user, refreshKey])

  const unfiledGifts = useMemo(
    () => workspace.gifts.filter((gift) => !gift.folder_id),
    [workspace.gifts],
  )

  async function submitFolder(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      await createFolder(folderName.trim())
      setFolderName('')
      setRefreshKey((key) => key + 1)
      setNotice('Folder created.')
    } catch (createError) {
      setError(createError.message)
    }
  }

  async function submitGift(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      await addGift('', { title: giftTitle, link: giftLink, priority: giftPriority })
      setGiftTitle('')
      setGiftLink('')
      setGiftPriority('3')
      setRefreshKey((key) => key + 1)
      setNotice('Gift added to unfiled gifts.')
    } catch (addError) {
      setError(addError.message)
    }
  }

  async function deleteGift(giftId) {
    if (!window.confirm('Remove this gift?')) return
    setError('')
    try {
      await removeGift(giftId)
      setRefreshKey((key) => key + 1)
      setNotice('Gift removed.')
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  async function changePriority(giftId, priority) {
    setError('')
    try {
      await updateGiftPriority(giftId, priority)
      setRefreshKey((key) => key + 1)
      setNotice('Gift priority updated.')
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  async function importBrowserData() {
    if (!window.confirm(
      'Import all browser-local folders and gifts into your cloud account? The browser copy will remain.',
    )) return

    setError('')
    setNotice('')
    setImporting(true)
    try {
      const { foldersImported, giftsImported } = await importLocalWorkspace()
      const importedCount = foldersImported + giftsImported
      setNotice(importedCount
        ? `Imported ${foldersImported} folder(s) and ${giftsImported} gift(s). The browser copy remains.`
        : 'These browser-local folders and gifts are already in your cloud account.')
      setRefreshKey((key) => key + 1)
    } catch (importError) {
      setError(importError.message)
    } finally {
      setImporting(false)
    }
  }

  const signInLink = `/account?redirect=${encodeURIComponent(window.location.pathname)}`

  return (
    <>
      <Header />
      <main className="folder-page">
        <header className="folder-heading">
          <h2>Your gifts</h2>
          <p>Open a folder to see, rank, and add its gifts.</p>
        </header>

        {!supabase && (
          <p className="folder-notice">Local mode: folders and gifts are saved in this browser.</p>
        )}
        {supabase && !user && !authLoading && (
          <p className="folder-notice">
            Sign in to manage your cloud gifts. <Link to={signInLink}>Open your account</Link>.
          </p>
        )}
        {supabase && user && hasLocalWorkspace() && (
          <p className="folder-notice">
            Browser-local gifts are separate from cloud gifts. Your local copy will be kept.
            {' '}
            <button type="button" disabled={importing} onClick={importBrowserData}>
              {importing ? 'Importing…' : 'Import local gifts to cloud'}
            </button>
          </p>
        )}
        {authError && <p className="form-error" role="alert">Authentication error: {authError}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="folder-notice" role="status">{notice}</p>}

        {authLoading || loading ? <p>Loading gifts…</p> : supabase && !user ? null : (
          <div className="folder-layout">
            <aside className="folder-sidebar">
              <h3>Folders</h3>
              {workspace.folders.length ? workspace.folders.map((folder) => {
                const count = workspace.gifts.filter((gift) => gift.folder_id === folder.id).length
                const shared = supabase && folder.owner_id !== user?.id
                return (
                  <Link className="folder-choice folder-link" key={folder.id}
                    to={`/folders/${folder.id}`}>
                    <span>{folder.name}{shared ? ' · Shared' : ''}</span>
                    <span>{count}</span>
                  </Link>
                )
              }) : <p className="folder-empty">No folders yet.</p>}

              <form className="folder-form" onSubmit={submitFolder}>
                <label htmlFor="folder-name">New folder name</label>
                <input id="folder-name" placeholder="Folder name" maxLength={60}
                  required value={folderName}
                  onChange={(event) => setFolderName(event.target.value)} />
                <button type="submit">Add folder</button>
              </form>
            </aside>

            <section className="folder-main">
              <form className="gift-form" onSubmit={submitGift}>
                <h3>Add an unfiled gift</h3>
                <label htmlFor="gift-title">Gift name</label>
                <input id="gift-title" value={giftTitle} maxLength={120} required
                  onChange={(event) => setGiftTitle(event.target.value)} />
                <label htmlFor="gift-link">Gift link</label>
                <input id="gift-link" type="url" value={giftLink} required
                  onChange={(event) => setGiftLink(event.target.value)} />
                <label htmlFor="gift-priority">Priority</label>
                <select id="gift-priority" value={giftPriority}
                  onChange={(event) => setGiftPriority(event.target.value)}>
                  {[5, 4, 3, 2, 1].map((priority) => (
                    <option key={priority} value={priority}>
                      {priority} — {priority === 5 ? 'Highest' : priority === 1 ? 'Lowest' : `Level ${priority}`}
                    </option>
                  ))}
                </select>
                <button type="submit">Add gift</button>
              </form>

              <h3>Unfiled gifts</h3>
              {unfiledGifts.length ? (
                <div className="gift-grid">
                  {unfiledGifts.map((gift) => (
                    <article className="gift-card" key={gift.id}>
                      {gift.most_wanted && <span className="gift-badge">Most wanted</span>}
                      <a href={gift.link} target="_blank" rel="noreferrer">{gift.title}</a>
                      <p>{gift.link}</p>
                      <p>Priority: {gift.priority}/5</p>
                      <label className="priority-control">
                        Change priority
                        <select value={gift.priority}
                          onChange={(event) => changePriority(gift.id, event.target.value)}>
                          {[5, 4, 3, 2, 1].map((priority) => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                      </label>
                      <button type="button" className="danger-button"
                        onClick={() => deleteGift(gift.id)}>Remove gift</button>
                    </article>
                  ))}
                </div>
              ) : <p className="folder-empty">No unfiled gifts.</p>}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}

export default Home
