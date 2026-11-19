import { supabase } from './supabase'

const LOCAL_WORKSPACE_KEY = 'wishlistr-workspace'
const LEGACY_ITEMS_KEY = 'wishlistr-items'

function createId() {
  return crypto.randomUUID()
}

function getLocalWorkspace() {
  const stored = localStorage.getItem(LOCAL_WORKSPACE_KEY)
  if (stored) return JSON.parse(stored)

  const folderId = createId()
  const wishlistId = createId()
  let items = []
  const legacyItems = localStorage.getItem(LEGACY_ITEMS_KEY)
  if (legacyItems) {
    items = JSON.parse(legacyItems).map((item) => ({
      id: item.id,
      wishlist_id: wishlistId,
      title: item.title,
      link: item.link,
      most_wanted: Boolean(item.mostWanted),
    }))
  }
  const workspace = {
    folders: [{ id: folderId, name: 'My wishlists' }],
    wishlists: [{ id: wishlistId, name: 'My wishlist', folder_id: folderId, owner_id: 'local' }],
    items,
  }
  saveLocalWorkspace(workspace)
  return workspace
}

function saveLocalWorkspace(workspace) {
  localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(workspace))
}

function requireSupabase() {
  if (!supabase) throw new Error('Connect a Supabase project to use accounts, sharing, and collaboration.')
  return supabase
}

function validateGiftLink(link) {
  let url
  try {
    url = new URL(link)
  } catch {
    throw new Error('Enter a valid http or https gift link.')
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Gift links must use http or https.')
  }
  return url.toString()
}

function validateName(name, maxLength, label) {
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length > maxLength) {
    throw new Error(`${label} must be between 1 and ${maxLength} characters.`)
  }
}

function withItems(wishlists, items) {
  return wishlists.map((wishlist) => ({
    ...wishlist,
    items: items.filter((item) => item.wishlist_id === wishlist.id),
  }))
}

export async function loadWorkspace(user) {
  if (!user || !supabase) {
    const local = getLocalWorkspace()
    return { folders: local.folders, wishlists: withItems(local.wishlists, local.items), shares: [] }
  }

  const [foldersResult, listsResult] = await Promise.all([
    supabase.from('folders').select('id, name').order('created_at'),
    supabase.from('wishlists').select('id, name, folder_id, owner_id').order('created_at'),
  ])
  if (foldersResult.error) throw foldersResult.error
  if (listsResult.error) throw listsResult.error

  const listIds = listsResult.data.map((list) => list.id)
  let items = []
  let shares = []
  if (listIds.length) {
    const [itemsResult, sharesResult] = await Promise.all([
      supabase.from('wishlist_items')
        .select('id, wishlist_id, title, link, most_wanted')
        .in('wishlist_id', listIds)
        .order('created_at'),
      supabase.from('wishlist_shares')
        .select('token, wishlist_id, revoked_at')
        .in('wishlist_id', listIds)
        .order('created_at'),
    ])
    if (itemsResult.error) throw itemsResult.error
    if (sharesResult.error) throw sharesResult.error
    items = itemsResult.data
    shares = sharesResult.data
  }
  return { folders: foldersResult.data, wishlists: withItems(listsResult.data, items), shares }
}

export async function createFolder(name) {
  validateName(name, 60, 'Folder name')
  if (!supabase) {
    const workspace = getLocalWorkspace()
    const folder = { id: createId(), name }
    saveLocalWorkspace({ ...workspace, folders: [...workspace.folders, folder] })
    return folder
  }
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) {
    const workspace = getLocalWorkspace()
    const folder = { id: createId(), name }
    saveLocalWorkspace({ ...workspace, folders: [...workspace.folders, folder] })
    return folder
  }
  const { data, error } = await client.from('folders')
    .insert({ name, owner_id: user.id }).select('id, name').single()
  if (error) throw error
  return data
}

export async function createWishlist(name, folderId) {
  validateName(name, 80, 'Wishlist name')
  if (!supabase) {
    const workspace = getLocalWorkspace()
    const wishlist = { id: createId(), name, folder_id: folderId, owner_id: 'local' }
    saveLocalWorkspace({ ...workspace, wishlists: [...workspace.wishlists, wishlist] })
    return wishlist
  }
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in before creating a cloud wishlist.')
  const { data, error } = await client.from('wishlists')
    .insert({ name, folder_id: folderId })
    .select('id, name, folder_id, owner_id').single()
  if (error) throw error
  return data
}

export async function moveWishlist(wishlistId, folderId) {
  if (!supabase) {
    const workspace = getLocalWorkspace()
    saveLocalWorkspace({
      ...workspace,
      wishlists: workspace.wishlists.map((wishlist) => wishlist.id === wishlistId
        ? { ...wishlist, folder_id: folderId }
        : wishlist),
    })
    return
  }
  const { error } = await requireSupabase().from('wishlists')
    .update({ folder_id: folderId }).eq('id', wishlistId)
  if (error) throw error
}

export async function addItem(wishlistId, item) {
  validateName(item.title, 120, 'Gift name')
  const validatedItem = { ...item, link: validateGiftLink(item.link) }
  if (!supabase) {
    const workspace = getLocalWorkspace()
    const wishlistItems = workspace.items.filter((saved) => saved.wishlist_id === wishlistId)
    const savedItem = {
      id: createId(), wishlist_id: wishlistId, ...validatedItem,
      most_wanted: wishlistItems.length === 0,
    }
    saveLocalWorkspace({ ...workspace, items: [...workspace.items, savedItem] })
    return savedItem
  }
  const client = requireSupabase()
  const { count, error: countError } = await client.from('wishlist_items')
    .select('id', { count: 'exact', head: true }).eq('wishlist_id', wishlistId)
  if (countError) throw countError
  const { data, error } = await client.from('wishlist_items')
    .insert({ wishlist_id: wishlistId, ...validatedItem, most_wanted: count === 0 })
    .select('id, wishlist_id, title, link, most_wanted').single()
  if (error) throw error
  return data
}

export async function removeItem(itemId) {
  if (!supabase) {
    const workspace = getLocalWorkspace()
    saveLocalWorkspace({ ...workspace, items: workspace.items.filter((item) => item.id !== itemId) })
    return
  }
  const { error } = await requireSupabase().from('wishlist_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function toggleMostWanted(wishlistId, itemId, mostWanted) {
  if (!supabase) {
    const workspace = getLocalWorkspace()
    const items = workspace.items.map((item) => item.wishlist_id === wishlistId
      ? { ...item, most_wanted: item.id === itemId ? mostWanted : false }
      : item)
    saveLocalWorkspace({ ...workspace, items })
    return
  }
  const client = requireSupabase()
  const { error } = await client.rpc('set_most_wanted', {
    target_wishlist_id: wishlistId,
    target_item_id: itemId,
    make_most_wanted: mostWanted,
  })
  if (error) throw error
}

export async function createShare(wishlistId) {
  const { data, error } = await requireSupabase().from('wishlist_shares')
    .insert({ wishlist_id: wishlistId }).select('token').single()
  if (error) throw error
  return data.token
}

export async function revokeShare(token) {
  const { error } = await requireSupabase().from('wishlist_shares')
    .update({ revoked_at: new Date().toISOString() }).eq('token', token)
  if (error) throw error
}

export async function createEditorInvite(wishlistId) {
  const { data, error } = await requireSupabase().rpc('create_editor_invite', {
    target_wishlist_id: wishlistId,
  })
  if (error) throw error
  return data
}

export async function acceptEditorInvite(token) {
  const { error } = await requireSupabase().rpc('accept_editor_invite', {
    invite_token: token,
  })
  if (error) throw error
}

export async function getSharedWishlist(token) {
  const { data, error } = await requireSupabase().rpc('get_shared_wishlist', {
    share_token: token,
  })
  if (error) throw error
  if (!data) throw new Error('This wishlist link is invalid or has been revoked.')
  return data
}
