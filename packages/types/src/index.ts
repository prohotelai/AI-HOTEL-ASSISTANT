export interface GuestProfile {
  id: string;
  name: string;
  email?: string;
}

export interface Reservation {
  id: string;
  guestId: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
}
