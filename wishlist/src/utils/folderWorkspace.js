import { supabase } from './supabase'

const LOCAL_WORKSPACE_KEY = 'wishlistr-folder-workspace'
const LEGACY_WORKSPACE_KEY = 'wishlistr-workspace'
const LEGACY_ITEMS_KEY = 'wishlistr-items'

function createId() {
  return crypto.randomUUID()
}

function saveLocalWorkspace(workspace) {
  localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(workspace))
}

function getLocalWorkspace() {
  const stored = localStorage.getItem(LOCAL_WORKSPACE_KEY)
  if (stored) {
    const workspace = JSON.parse(stored)
    workspace.gifts = workspace.gifts.map((gift) => ({ priority: 3, ...gift }))
    saveLocalWorkspace(workspace)
    return workspace
  }

  const legacyWorkspace = localStorage.getItem(LEGACY_WORKSPACE_KEY)
  if (legacyWorkspace) {
    const oldWorkspace = JSON.parse(legacyWorkspace)
    const wishlistFolders = new Map(
      oldWorkspace.wishlists.map((wishlist) => [wishlist.id, wishlist.folder_id || null]),
    )
    const workspace = {
      folders: oldWorkspace.folders,
      gifts: oldWorkspace.items.map((item) => ({
        id: item.id,
        folder_id: wishlistFolders.get(item.wishlist_id) ?? null,
        title: item.title,
        link: item.link,
        most_wanted: Boolean(item.most_wanted),
        priority: item.priority ?? 3,
      })),
    }
    saveLocalWorkspace(workspace)
    return workspace
  }

  const folderId = createId()
  const legacyItems = localStorage.getItem(LEGACY_ITEMS_KEY)
  const workspace = {
    folders: [{ id: folderId, name: 'My gifts' }],
    gifts: legacyItems
      ? JSON.parse(legacyItems).map((item) => ({
        id: item.id,
        folder_id: folderId,
        title: item.title,
        link: item.link,
        most_wanted: Boolean(item.mostWanted),
        priority: item.priority ?? 3,
      }))
      : [],
  }
  saveLocalWorkspace(workspace)
  return workspace
}

export function hasLocalWorkspace() {
  return Boolean(
    localStorage.getItem(LOCAL_WORKSPACE_KEY)
    || localStorage.getItem(LEGACY_WORKSPACE_KEY)
    || localStorage.getItem(LEGACY_ITEMS_KEY),
  )
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Connect a Supabase project to use cloud folders and gifts.')
  }
  return supabase
}

function validateName(name, maxLength, label) {
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length > maxLength) {
    throw new Error(`${label} must be between 1 and ${maxLength} characters.`)
  }
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

export async function loadGiftWorkspace(user) {
  if (!supabase) {
    const workspace = getLocalWorkspace()
    workspace.gifts.sort((first, second) => (second.priority ?? 3) - (first.priority ?? 3))
    return workspace
  }
  if (!user) return { folders: [], gifts: [] }

  const [foldersResult, giftsResult] = await Promise.all([
    supabase.from('folders').select('id, name, owner_id').order('created_at'),
    supabase.from('gifts')
      .select('id, folder_id, title, link, most_wanted, priority, created_at')
      .order('priority', { ascending: false })
      .order('created_at'),
  ])
  if (foldersResult.error) throw foldersResult.error
  if (giftsResult.error) throw giftsResult.error

  return { folders: foldersResult.data, gifts: giftsResult.data }
}

export async function createFolder(name) {
  validateName(name, 60, 'Folder name')
  if (!supabase) {
    const workspace = getLocalWorkspace()
    const folder = { id: createId(), name }
    saveLocalWorkspace({ ...workspace, folders: [...workspace.folders, folder] })
    return folder
  }

  const { data: { user }, error: userError } = await requireSupabase().auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in before creating a cloud folder.')

  const { data, error } = await supabase.from('folders')
    .insert({ name, owner_id: user.id })
    .select('id, name, owner_id')
    .single()
  if (error) throw error
  return data
}

export async function addGift(folderId, gift) {
  validateName(gift.title, 120, 'Gift name')
  const priority = Number(gift.priority ?? 3)
  if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
    throw new Error('Priority must be between 1 and 5.')
  }
  const validatedGift = {
    folder_id: folderId || null,
    title: gift.title.trim(),
    link: validateGiftLink(gift.link),
    most_wanted: false,
    priority,
  }

  if (!supabase) {
    const workspace = getLocalWorkspace()
    const savedGift = { id: createId(), ...validatedGift }
    saveLocalWorkspace({ ...workspace, gifts: [...workspace.gifts, savedGift] })
    return savedGift
  }

  const { data: { user }, error: userError } = await requireSupabase().auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in before adding a cloud gift.')

  let ownerId = user.id
  if (folderId) {
    const { data: folder, error: folderError } = await supabase.from('folders')
      .select('owner_id')
      .eq('id', folderId)
      .single()
    if (folderError) throw folderError
    ownerId = folder.owner_id
  }

  const { data, error } = await supabase.from('gifts')
    .insert({ ...validatedGift, owner_id: ownerId })
    .select('id, folder_id, title, link, most_wanted, priority')
    .single()
  if (error) throw error
  return data
}

export async function removeGift(giftId) {
  if (!supabase) {
    const workspace = getLocalWorkspace()
    saveLocalWorkspace({
      ...workspace,
      gifts: workspace.gifts.filter((gift) => gift.id !== giftId),
    })
    return
  }

  const { error } = await requireSupabase().from('gifts').delete().eq('id', giftId)
  if (error) throw error
}

export async function updateGift(giftId, gift) {
  validateName(gift.title, 120, 'Gift name')
  const updatedGift = {
    title: gift.title.trim(),
    link: validateGiftLink(gift.link),
  }

  if (!supabase) {
    const workspace = getLocalWorkspace()
    saveLocalWorkspace({
      ...workspace,
      gifts: workspace.gifts.map((item) => (
        item.id === giftId ? { ...item, ...updatedGift } : item
      )),
    })
    return
  }

  const { error } = await requireSupabase().from('gifts')
    .update(updatedGift)
    .eq('id', giftId)
  if (error) throw error
}

export async function deleteFolder(folderId) {
  if (!supabase) {
    const workspace = getLocalWorkspace()
    saveLocalWorkspace({
      folders: workspace.folders.filter((folder) => folder.id !== folderId),
      gifts: workspace.gifts.filter((gift) => gift.folder_id !== folderId),
    })
    return
  }

  const { error } = await requireSupabase().from('folders').delete().eq('id', folderId)
  if (error) throw error
}

export async function updateGiftPriority(giftId, priority) {
  const validatedPriority = Number(priority)
  if (!Number.isInteger(validatedPriority) || validatedPriority < 1 || validatedPriority > 5) {
    throw new Error('Priority must be between 1 and 5.')
  }

  if (!supabase) {
    const workspace = getLocalWorkspace()
    saveLocalWorkspace({
      ...workspace,
      gifts: workspace.gifts.map((gift) => (
        gift.id === giftId ? { ...gift, priority: validatedPriority } : gift
      )),
    })
    return
  }

  const { error } = await requireSupabase().rpc('set_gift_priority', {
    target_gift_id: giftId,
    new_priority: validatedPriority,
  })
  if (error) throw error
}

export async function createFolderShare(folderId, accessLevel) {
  if (!['read', 'edit'].includes(accessLevel)) {
    throw new Error('Choose a valid sharing permission.')
  }
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in before sharing a folder.')

  const { data, error } = await client.from('folder_shares')
    .insert({ folder_id: folderId, access_level: accessLevel, created_by: user.id })
    .select('id, token, access_level, created_at')
    .single()
  if (error) throw error
  return data
}

export async function loadFolderShares(folderId) {
  const { data, error } = await requireSupabase().from('folder_shares')
    .select('id, token, access_level, created_at, revoked_at')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function revokeFolderShare(shareId) {
  const { error } = await requireSupabase().from('folder_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId)
  if (error) throw error
}

export async function getSharedFolder(token) {
  const { data, error } = await requireSupabase().rpc('get_shared_folder', {
    share_token: token,
  })
  if (error) throw error
  if (!data) throw new Error('This sharing link is invalid or has been revoked.')
  return data
}

export async function acceptFolderEditLink(token) {
  const { data, error } = await requireSupabase().rpc('accept_folder_edit_link', {
    share_token: token,
  })
  if (error) throw error
  return data
}

export async function loadFolderCollaborators(folderId) {
  const { data, error } = await requireSupabase().rpc('list_folder_collaborators', {
    target_folder_id: folderId,
  })
  if (error) throw error
  return data
}

export async function removeFolderCollaborator(folderId, userId) {
  const { error } = await requireSupabase().from('folder_collaborators')
    .delete()
    .eq('folder_id', folderId)
    .eq('user_id', userId)
  if (error) throw error
}

async function insertMissingRows(client, table, rows, columns, isCompatible) {
  if (!rows.length) return 0

  const { data, error } = await client.from(table)
    .select(columns)
    .in('id', rows.map((row) => row.id))
  if (error) throw error

  const existingById = new Map(data.map((row) => [row.id, row]))
  for (const row of rows) {
    const existing = existingById.get(row.id)
    if (existing && !isCompatible(existing, row)) {
      throw new Error('A cloud record already uses one of the browser-local IDs.')
    }
  }

  const missingRows = rows.filter((row) => !existingById.has(row.id))
  if (!missingRows.length) return 0

  const { error: insertError } = await client.from(table).insert(missingRows)
  if (insertError) throw insertError
  return missingRows.length
}

export async function importLocalWorkspace() {
  if (!hasLocalWorkspace()) {
    throw new Error('No browser-local gifts or folders were found to import.')
  }

  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in before importing browser-local gifts.')

  const local = getLocalWorkspace()
  const folders = local.folders.map(({ id, name }) => ({ id, name, owner_id: user.id }))
  const gifts = local.gifts.map(({ id, folder_id, title, link, most_wanted, priority }) => ({
    id,
    owner_id: user.id,
    folder_id: folder_id || null,
    title,
    link,
    most_wanted: Boolean(most_wanted),
    priority: priority ?? 3,
  }))

  const foldersImported = await insertMissingRows(
    client,
    'folders',
    folders,
    'id, owner_id',
    (existing, incoming) => existing.owner_id === incoming.owner_id,
  )
  const giftsImported = await insertMissingRows(
    client,
    'gifts',
    gifts,
    'id, owner_id, folder_id',
    (existing, incoming) => existing.owner_id === incoming.owner_id
      && existing.folder_id === incoming.folder_id,
  )

  return { foldersImported, giftsImported }
}
