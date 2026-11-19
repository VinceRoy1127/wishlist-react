import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/useAuth'
import { supabase } from '../utils/supabase'
import {
  addGift,
  deleteFolder,
  loadFolderCollaborators,
  loadFolderShares,
  loadGiftWorkspace,
  removeFolderCollaborator,
  removeGift,
  revokeFolderShare,
  createFolderShare,
  updateGift,
  updateGiftPriority,
} from '../utils/folderWorkspace'
import '../styles/Gifts.css'

function Folder() {
  const { folderId } = useParams()
  const { user, loading: authLoading, authError } = useAuth()
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState({ folders: [], gifts: [] })
  const [shares, setShares] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [giftTitle, setGiftTitle] = useState('')
  const [giftLink, setGiftLink] = useState('')
  const [giftPriority, setGiftPriority] = useState('3')
  const [editingGiftId, setEditingGiftId] = useState('')
  const [editGiftTitle, setEditGiftTitle] = useState('')
  const [editGiftLink, setEditGiftLink] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [shareLoading, setShareLoading] = useState(false)
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

  const folder = workspace.folders.find((item) => item.id === folderId)
  const gifts = useMemo(
    () => workspace.gifts.filter((gift) => gift.folder_id === folderId),
    [workspace.gifts, folderId],
  )
  const isOwner = !supabase || Boolean(user && folder?.owner_id === user.id)
  const canEdit = !supabase || Boolean(user && folder)

  useEffect(() => {
    if (!supabase || !folder || !isOwner) return
    let active = true
    async function loadSharingSettings() {
      setShareLoading(true)
      try {
        const [nextShares, nextCollaborators] = await Promise.all([
          loadFolderShares(folderId),
          loadFolderCollaborators(folderId),
        ])
        if (active) {
          setShares(nextShares)
          setCollaborators(nextCollaborators)
        }
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setShareLoading(false)
      }
    }
    loadSharingSettings()
    return () => { active = false }
  }, [folder, folderId, isOwner, refreshKey])

  async function submitGift(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      await addGift(folderId, { title: giftTitle, link: giftLink, priority: giftPriority })
      setGiftTitle('')
      setGiftLink('')
      setGiftPriority('3')
      setRefreshKey((key) => key + 1)
      setNotice('Gift added.')
    } catch (addError) {
      setError(addError.message)
    }
  }

  async function removeGiftFromFolder(giftId) {
    if (!window.confirm('Remove this gift from the folder?')) return
    setError('')
    try {
      await removeGift(giftId)
      setRefreshKey((key) => key + 1)
      setNotice('Gift removed.')
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  function startEditingGift(gift) {
    setEditingGiftId(gift.id)
    setEditGiftTitle(gift.title)
    setEditGiftLink(gift.link)
  }

  async function saveGift(event) {
    event.preventDefault()
    setError('')
    try {
      await updateGift(editingGiftId, { title: editGiftTitle, link: editGiftLink })
      setEditingGiftId('')
      setRefreshKey((key) => key + 1)
      setNotice('Gift updated.')
    } catch (updateError) {
      setError(updateError.message)
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

  async function removeFolder() {
    if (!window.confirm(`Delete "${folder.name}" and all ${gifts.length} gift(s) in it? This cannot be undone.`)) {
      return
    }
    setError('')
    try {
      await deleteFolder(folderId)
      navigate('/', { replace: true })
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function addShare(accessLevel) {
    setError('')
    try {
      const share = await createFolderShare(folderId, accessLevel)
      setShares((current) => [share, ...current])
      setNotice(`${accessLevel === 'read' ? 'Read-only' : 'Edit'} link created.`)
    } catch (shareError) {
      setError(shareError.message)
    }
  }

  async function removeShare(shareId) {
    setError('')
    try {
      await revokeFolderShare(shareId)
      setShares((current) => current.map((share) => (
        share.id === shareId ? { ...share, revoked_at: new Date().toISOString() } : share
      )))
      setNotice('Sharing link revoked.')
    } catch (revokeError) {
      setError(revokeError.message)
    }
  }

  async function removeCollaborator(collaborator) {
    if (!window.confirm(`Remove ${collaborator.email || 'this collaborator'} from the folder?`)) return
    setError('')
    try {
      await removeFolderCollaborator(folderId, collaborator.user_id)
      setCollaborators((current) => current.filter((entry) => entry.user_id !== collaborator.user_id))
      setNotice('Collaborator removed.')
    } catch (removeError) {
      setError(removeError.message)
    }
  }

  async function copyShareLink(token) {
    const url = new URL(`/share/${token}`, window.location.origin).toString()
    try {
      await navigator.clipboard.writeText(url)
      setNotice('Sharing link copied.')
    } catch (copyError) {
      setError(`Could not copy the link: ${copyError.message}`)
    }
  }

  const signInLink = `/account?redirect=${encodeURIComponent(window.location.pathname)}`

  return (
    <>
      <Header />
      <main className="folder-page">
        <p><Link to="/">← All folders</Link></p>
        {authError && <p className="form-error" role="alert">Authentication error: {authError}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="folder-notice" role="status">{notice}</p>}

        {authLoading || loading ? <p>Loading folder…</p> : supabase && !user ? (
          <p className="folder-notice">
            Sign in to open this folder. <Link to={signInLink}>Open your account</Link>.
          </p>
        ) : !folder ? (
          <p className="folder-empty">This folder could not be found.</p>
        ) : (
          <>
            <header className="folder-heading">
              <h2>{folder.name}</h2>
              <p>{gifts.length} gift{gifts.length === 1 ? '' : 's'}{!isOwner && ' · Shared with you'}</p>
            </header>

            {canEdit && (
              <form className="gift-form folder-gift-form" onSubmit={submitGift}>
                <h3>Add a gift</h3>
                <label htmlFor="gift-title">Gift name</label>
                <input id="gift-title" value={giftTitle} maxLength={120} required
                  onChange={(event) => setGiftTitle(event.target.value)} />
                <label htmlFor="gift-link">Gift link</label>
                <input id="gift-link" type="url" value={giftLink} required
                  onChange={(event) => setGiftLink(event.target.value)} />
                {isOwner && (
                  <>
                    <label htmlFor="gift-priority">Priority</label>
                    <select id="gift-priority" value={giftPriority}
                      onChange={(event) => setGiftPriority(event.target.value)}>
                      {[5, 4, 3, 2, 1].map((priority) => (
                        <option key={priority} value={priority}>
                          {priority} — {priority === 5 ? 'Highest' : priority === 1 ? 'Lowest' : `Level ${priority}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <button type="submit">Add gift</button>
              </form>
            )}

            {isOwner && (
              <section className="folder-management">
                <h3>Sharing and folder settings</h3>
                {supabase && (
                  <>
                    <p>Create a read-only link for anyone, or an edit link that requires sign-in. Remove existing editors below to end their access.</p>
                    <div className="folder-actions">
                      <button type="button" onClick={() => addShare('read')}>Create read-only link</button>
                      <button type="button" onClick={() => addShare('edit')}>Create edit link</button>
                    </div>
                    {shareLoading ? <p>Loading sharing settings…</p> : (
                      <>
                        <ul className="share-list">
                          {shares.map((share) => (
                            <li key={share.id}>
                              <span>{share.access_level === 'read' ? 'Read-only' : 'Edit'} link</span>
                              {!share.revoked_at && (
                                <>
                                  <a href={`/share/${share.token}`} target="_blank" rel="noreferrer">Open link</a>
                                  <button type="button" className="text-button"
                                    onClick={() => copyShareLink(share.token)}>Copy link</button>
                                </>
                              )}
                              {share.revoked_at ? <span>Revoked</span> : (
                                <button type="button" className="danger-button"
                                  onClick={() => removeShare(share.id)}>Revoke</button>
                              )}
                            </li>
                          ))}
                        </ul>
                        <h4>Editors</h4>
                        {collaborators.length ? (
                          <ul className="share-list">
                            {collaborators.map((collaborator) => (
                              <li key={collaborator.user_id}>
                                <span>{collaborator.email || collaborator.user_id}</span>
                                <button type="button" className="danger-button"
                                  onClick={() => removeCollaborator(collaborator)}>Remove</button>
                              </li>
                            ))}
                          </ul>
                        ) : <p>No editors have joined this folder.</p>}
                      </>
                    )}
                  </>
                )}
                <button type="button" className="danger-button folder-delete"
                  onClick={removeFolder}>Delete folder and its gifts</button>
              </section>
            )}

            <section className="folder-gifts">
              <h3>Gifts, ranked by priority</h3>
              {gifts.length ? (
                <div className="gift-grid">
                  {gifts.map((gift) => (
                    <article className="gift-card" key={gift.id}>
                      {gift.most_wanted && <span className="gift-badge">Most wanted</span>}
                      <a href={gift.link} target="_blank" rel="noreferrer">{gift.title}</a>
                      <p>{gift.link}</p>
                      <p>Priority: {gift.priority}/5</p>
                      {canEdit && editingGiftId === gift.id && (
                        <form className="gift-form gift-edit-form" onSubmit={saveGift}>
                          <label htmlFor={`edit-title-${gift.id}`}>Gift name</label>
                          <input id={`edit-title-${gift.id}`} value={editGiftTitle}
                            maxLength={120} required
                            onChange={(event) => setEditGiftTitle(event.target.value)} />
                          <label htmlFor={`edit-link-${gift.id}`}>Gift link</label>
                          <input id={`edit-link-${gift.id}`} type="url" value={editGiftLink}
                            required onChange={(event) => setEditGiftLink(event.target.value)} />
                          <button type="submit">Save changes</button>
                          <button type="button" className="text-button"
                            onClick={() => setEditingGiftId('')}>Cancel</button>
                        </form>
                      )}
                      {isOwner && (
                        <label className="priority-control">
                          Change priority
                          <select value={gift.priority}
                            onChange={(event) => changePriority(gift.id, event.target.value)}>
                            {[5, 4, 3, 2, 1].map((priority) => (
                              <option key={priority} value={priority}>{priority}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {canEdit && (
                        <div className="gift-actions">
                          {editingGiftId !== gift.id && (
                            <button type="button" className="text-button"
                              onClick={() => startEditingGift(gift)}>Edit gift</button>
                          )}
                          <button type="button" className="danger-button"
                            onClick={() => removeGiftFromFolder(gift.id)}>Remove gift</button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : <p className="folder-empty">No gifts in this folder yet.</p>}
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  )
}

export default Folder
