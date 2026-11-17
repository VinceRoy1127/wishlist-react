const WISHLIST_STORAGE_KEY = 'wishlistr-items'

export function loadWishlist() {
  const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY)
  return savedWishlist ? JSON.parse(savedWishlist) : []
}

export function saveWishlist(wishlist) {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist))
}
