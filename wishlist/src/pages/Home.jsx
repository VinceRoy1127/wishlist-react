import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Header from '../components/Header'
import WishCard from '../components/WishCard'
import { useAuth } from '../context/useAuth'
import { createEditorInvite, createFolder, createShare, createWishlist, loadWorkspace, moveWishlist, removeItem, revokeShare, toggleMostWanted } from '../utils/workspace'
import { supabase } from '../utils/supabase'
import '../styles/Wishlist.css'

const ACTIVE_WISHLIST_KEY = 'wishlistr-active-wishlist'

function Home() {
  const { user, loading: authLoading, authError } = useAuth()
  const [workspace, setWorkspace] = useState({ folders: [], wishlists: [], shares: [] })
  const [activeWishlistId, setActiveWishlistId] = useState(localStorage.getItem(ACTIVE_WISHLIST_KEY) || '')
  const activeWishlistIdRef = useRef(activeWishlistId)
  const loadRequestId = useRef(0)
  const [folderName, setFolderName] = useState('')
  const [wishlistName, setWishlistName] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [share, setShare] = useState(null)

  function selectWishlist(id) {
    activeWishlistIdRef.current = id
    setActiveWishlistId(id)
  }

  useEffect(() => {
    const requestId = ++loadRequestId.current
    async function load() {
      try {
        const next = await loadWorkspace(user)
        if (loadRequestId.current !== requestId) return
        setWorkspace(next)
        if (!next.wishlists.some((wishlist) => wishlist.id === activeWishlistIdRef.current)) {
          selectWishlist(next.wishlists[0]?.id ?? '')
        }
      } catch (loadError) {
        if (loadRequestId.current === requestId) setError(loadError.message)
      } finally {
        if (loadRequestId.current === requestId) setLoading(false)
      }
    }
    load()
    return () => { loadRequestId.current += 1 }
  }, [user, refreshKey])

  useEffect(() => {
    if (activeWishlistId) localStorage.setItem(ACTIVE_WISHLIST_KEY, activeWishlistId)
  }, [activeWishlistId])

  const ownedWishlists = useMemo(
    () => workspace.wishlists.filter((wishlist) => !user || wishlist.owner_id === user.id),
    [workspace.wishlists, user],
  )
  const sharedWishlists = useMemo(
    () => user ? workspace.wishlists.filter((wishlist) => wishlist.owner_id !== user.id) : [],
    [workspace.wishlists, user],
  )
  const activeFolderId = workspace.folders.some((folder) => folder.id === selectedFolder) ? selectedFolder : ''
  const visibleWishlists = useMemo(() => activeFolderId
    ? ownedWishlists.filter((wishlist) => wishlist.folder_id === activeFolderId)
    : ownedWishlists, [ownedWishlists, activeFolderId])
  const selectableWishlists = activeFolderId ? visibleWishlists : [...visibleWishlists, ...sharedWishlists]
  const activeWishlist = workspace.wishlists.find((wishlist) => wishlist.id === activeWishlistId)
  const activeIsSelectable = selectableWishlists.some((wishlist) => wishlist.id === activeWishlist?.id)
  const activeShareLinks = workspace.shares.filter(
    (wishlistShare) => wishlistShare.wishlist_id === activeWishlistId && !wishlistShare.revoked_at,
  )

  async function handleAction(action, successMessage) {
    setError('')
    setNotice('')
    try {
      await action()
      setRefreshKey((key) => key + 1)
      if (successMessage) setNotice(successMessage)
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function submitFolder(event) {
    event.preventDefault()
    await handleAction(async () => {
      const folder = await createFolder(folderName.trim())
      setFolderName('')
      setSelectedFolder(folder.id)
    }, 'Folder created.')
  }

  async function submitWishlist(event) {
    event.preventDefault()
    await handleAction(async () => {
      const wishlist = await createWishlist(wishlistName.trim(), activeFolderId || null)
      setWishlistName('')
      selectWishlist(wishlist.id)
    }, 'Wishlist created.')
  }

  async function toggleWanted(id) {
    const wish = activeWishlist.items.find((item) => item.id === id)
    await handleAction(() => toggleMostWanted(activeWishlist.id, id, !wish.most_wanted))
  }

  async function removeWish(id) {
    await handleAction(() => removeItem(id), 'Gift removed.')
  }

  async function makeShareLink() {
    await handleAction(() => createShare(activeWishlist.id), 'Read-only share link created.')
  }

  async function makeInviteLink() {
    await handleAction(async () => {
      const token = await createEditorInvite(activeWishlist.id)
      setShare({
        type: 'invite',
        token,
        wishlistId: activeWishlist.id,
        url: `${window.location.origin}/invite/${token}`,
      })
    }, 'Editor invitation created.')
  }

  async function copyShareLink(url) {
    try {
      await navigator.clipboard.writeText(url)
      setNotice('Link copied to clipboard.')
      setError('')
    } catch (clipboardError) {
      setError(`${clipboardError.message} Copy the link manually: ${url}`)
    }
  }

  async function revokeCurrentShare(token) {
    await handleAction(() => revokeShare(token), 'Public share link revoked.')
  }

  return (
    <>
      <Header />
      <main className="wishlist-page">
        <header className="wishlist-heading">
          <h2>Your wishlists</h2>
          <p>Organize gift ideas into folders and share the lists you choose.</p>
        </header>

        {!supabase && (
          <p className="setup-notice">
            Local mode: folders and wishlists are saved in this browser. Set up Supabase to enable accounts,
            shared links, and collaboration. See <code>wishlist/README.md</code>.
          </p>
        )}
        {supabase && !user && !authLoading && (
          <p className="setup-notice">
            Sign in to manage cloud wishlists. <Link to="/account">Open your account</Link>.
          </p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        {authError && <p className="form-error" role="alert">Authentication error: {authError}</p>}
        {notice && <p className="status-message" role="status">{notice}</p>}
        {supabase && !user && !authLoading ? (
          <p className="wishlist-empty">
            Sign in to view and manage cloud wishlists. <Link to="/account">Sign in or create an account</Link>.
          </p>
        ) : authLoading || loading ? <p>Loading your wishlists…</p> : (
          <div className="workspace-layout">
            <aside className="workspace-sidebar">
              <button type="button" className={!activeFolderId ? 'sidebar-choice selected' : 'sidebar-choice'}
                onClick={() => { setSelectedFolder(''); selectWishlist(ownedWishlists[0]?.id ?? '') }}>All wishlists</button>
              <h3>Folders</h3>
              {workspace.folders.map((folder) => (
                <button type="button" key={folder.id}
                  className={activeFolderId === folder.id ? 'sidebar-choice selected' : 'sidebar-choice'}
                  onClick={() => {
                    setSelectedFolder(folder.id)
                    selectWishlist(ownedWishlists.find((wishlist) => wishlist.folder_id === folder.id)?.id ?? '')
                  }}>{folder.name}</button>
              ))}
              <form className="inline-form" onSubmit={submitFolder}>
                <input aria-label="New folder name" placeholder="New folder name" maxLength={60}
                  required value={folderName} onChange={(event) => setFolderName(event.target.value)} />
                <button type="submit">Add folder</button>
              </form>
            </aside>

            <section className="workspace-main">
              <form className="create-wishlist-form" onSubmit={submitWishlist}>
                <input aria-label="New wishlist name" placeholder="Name a wishlist" maxLength={80}
                  required value={wishlistName} onChange={(event) => setWishlistName(event.target.value)} />
                <button type="submit">Create wishlist</button>
              </form>

              {selectableWishlists.length > 0 && (
                <div className="wishlist-picker">
                  <label htmlFor="wishlist-select">Wishlist</label>
                  <select id="wishlist-select" value={activeWishlistId}
                    onChange={(event) => selectWishlist(event.target.value)}>
                    {selectableWishlists.map((wishlist) => (
                      <option key={wishlist.id} value={wishlist.id}>
                        {sharedWishlists.some((shared) => shared.id === wishlist.id)
                          ? `${wishlist.name} · Shared`
                          : wishlist.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeWishlist && activeIsSelectable ? (
                <>
                  <div className="wishlist-toolbar">
                    <h3>{activeWishlist.name}</h3>
                    {(!user || activeWishlist.owner_id === user.id) && (
                      <label className="move-wishlist-label" htmlFor="move-wishlist">
                        Folder
                        <select id="move-wishlist" value={activeWishlist.folder_id || ''}
                          onChange={(event) => handleAction(
                            () => moveWishlist(activeWishlist.id, event.target.value || null),
                            'Wishlist moved.',
                          )}>
                          <option value="">Unfiled</option>
                          {workspace.folders.map((folder) => (
                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <Link className="action-link" to="/addgift">Add a gift</Link>
                    {supabase && user && activeWishlist.owner_id === user.id && (
                      <>
                        <button type="button" onClick={makeShareLink}>Create read-only link</button>
                        <button type="button" onClick={makeInviteLink}>Invite editor</button>
                      </>
                    )}
                  </div>
                  {activeShareLinks.length > 0 && (!user || activeWishlist.owner_id === user.id) && (
                    <div className="share-panel">
                      <p>Active read-only links</p>
                      {activeShareLinks.map((wishlistShare) => {
                        const url = `${window.location.origin}/share/${wishlistShare.token}`
                        return (
                          <div className="share-link-row" key={wishlistShare.token}>
                            <input aria-label="Share link" readOnly value={url}
                              onFocus={(event) => event.target.select()} />
                            <button type="button" onClick={() => copyShareLink(url)}>Copy link</button>
                            {user && activeWishlist.owner_id === user.id && (
                              <button type="button" onClick={() => revokeCurrentShare(wishlistShare.token)}>
                                Revoke
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {share?.type === 'invite' && share.wishlistId === activeWishlist.id && (
                    <div className="share-panel">
                      <p>Editor invitation link</p>
                      <input aria-label="Share link" readOnly value={share.url} onFocus={(event) => event.target.select()} />
                      <button type="button" onClick={() => copyShareLink(share.url)}>Copy link</button>
                    </div>
                  )}
                  {activeWishlist.items.length ? (
                    <section className="wish-grid" aria-label="Wishlist items">
                      {activeWishlist.items.map((wish) => (
                        <WishCard key={wish.id} wish={{ ...wish, mostWanted: wish.most_wanted }}
                          onToggleMostWanted={toggleWanted} onRemove={removeWish} />
                      ))}
                    </section>
                  ) : <p className="wishlist-empty">This wishlist is empty. Add a gift to get started.</p>}
                </>
              ) : visibleWishlists.length === 0 ? (
                <p className="wishlist-empty">No wishlists here yet. Create one to get started.</p>
              ) : null}

              {activeWishlist && user && activeWishlist.owner_id !== user.id && (
                <p className="setup-notice">You are an editor of this wishlist. Changes are visible to its owner.</p>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}

export default Home
