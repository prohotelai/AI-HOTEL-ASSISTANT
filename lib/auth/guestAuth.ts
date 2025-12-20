// Guest model not yet implemented
export async function authenticateGuest(passportOrId: string, hotelId: string) {
  return { success: false, error: 'Guest authentication not implemented' }
}

export async function refreshGuestToken(guestId: string) {
  return { success: false, error: 'Guest token refresh not implemented' }
}

export async function logoutGuest(guestId: string) {
  return { success: true }
}

export async function generateGuestQRToken(guestId: string, hotelId: string) {
  return { success: false, error: 'Not implemented' }
}

export async function verifyGuestQRToken(token: string) {
  return { success: false, error: 'Not implemented' }
}

export async function createGuestSession(guestData: any) {
  return { success: false, error: 'Not implemented' }
}
