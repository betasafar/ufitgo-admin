export type BookingStatus = "Registered" | "Processing Visa" | "Confirmed" | "Cancelled"

export type BookingRecord = {
  id: string
  packageId: string
  packageName: string
  operatorName: string
  priceFrom: number
  totalPrice: number
  amountPaid: number
  installments: {
    amount: number
    date: string
    id: string
  }[]
  userId: string
  contactNumber: string
  travellers: number
  departureDate: string
  specialRequests: string
  status: BookingStatus
  createdAt: string
  bookingRef?: string
}

// ----------------------------------------------------
// BOOKINGS
// ----------------------------------------------------

export function saveBooking(request: Omit<BookingRecord, "id" | "status" | "createdAt" | "amountPaid" | "totalPrice" | "installments" | "bookingRef">): BookingRecord {
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
  const ref = `UFG-BKG-${randomSuffix}`

  const newBooking: BookingRecord = {
    ...request,
    id: Math.random().toString(36).substring(2, 9),
    status: "Registered",
    createdAt: new Date().toISOString(),
    amountPaid: 50000,
    totalPrice: request.priceFrom * request.travellers,
    installments: [],
    bookingRef: ref
  }

  const existingStr = localStorage.getItem("ufitgo_bookings")
  const existing: BookingRecord[] = existingStr ? JSON.parse(existingStr) : []
  
  localStorage.setItem("ufitgo_bookings", JSON.stringify([...existing, newBooking]))
  
  // Log the 50k transaction
  addTransaction({
    userId: request.userId,
    amount: -50000,
    type: "Registration Fee",
    description: `Registration Fee: ${request.packageName}`,
    status: "Successful"
  })

  return newBooking
}

export function getBookings(): BookingRecord[] {
  if (typeof window === "undefined") return []
  const existingStr = localStorage.getItem("ufitgo_bookings")
  return existingStr ? JSON.parse(existingStr) : []
}

export function getBookingById(id: string): BookingRecord | undefined {
  const bookings = getBookings()
  return bookings.find((r) => r.id === id)
}

export function updateBookingStatus(id: string, status: BookingStatus): BookingRecord | undefined {
  const bookings = getBookings()
  const index = bookings.findIndex((r) => r.id === id)
  if (index === -1) return undefined

  bookings[index].status = status
  localStorage.setItem("ufitgo_bookings", JSON.stringify(bookings))
  return bookings[index]
}

export function processInstallmentPayment(id: string, amount: number): BookingRecord | undefined {
  const bookings = getBookings()
  const index = bookings.findIndex((r) => r.id === id)
  if (index === -1) return undefined

  bookings[index].amountPaid += amount
  bookings[index].installments.push({
    id: Math.random().toString(36).substring(2, 9),
    amount: amount,
    date: new Date().toISOString()
  })

  localStorage.setItem("ufitgo_bookings", JSON.stringify(bookings))

  // Log transaction
  addTransaction({
    userId: bookings[index].userId,
    amount: -amount,
    type: "Installment Payment",
    description: `Installment Payment: ${bookings[index].packageName}`,
    status: "Successful"
  })

  return bookings[index]
}

// ----------------------------------------------------
// WALLET & TARGET SAVINGS
// ----------------------------------------------------

export type TransactionType = "Add Money" | "Savings" | "Registration Fee" | "Installment Payment" | "Withdrawal"
export type TransactionStatus = "Successful" | "Pending" | "Failed" | "Refunded"

export type WalletTransaction = {
  id: string
  userId: string
  description: string
  amount: number
  type: TransactionType
  status: TransactionStatus
  createdAt: string
}

export type SavingsTarget = {
  id: string
  userId: string
  name: string
  category: "Umrah" | "Hajj" | "Family Umrah" | "Custom Goal"
  targetAmount: number
  savedAmount: number
  targetDate: string
  packageId?: string
  createdAt: string
}

// Helper to get generic DB table from localStorage
function getTable<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  const str = localStorage.getItem(key)
  return str ? JSON.parse(str) : []
}

function setTable<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

// Wallet
export function getWalletBalance(): number {
  if (typeof window === "undefined") return 0
  const bal = localStorage.getItem("ufitgo_wallet_balance")
  return bal ? parseFloat(bal) : 0
}

export function setWalletBalance(amount: number) {
  localStorage.setItem("ufitgo_wallet_balance", amount.toString())
}

// Transactions
export function getTransactions(): WalletTransaction[] {
  return getTable<WalletTransaction>("ufitgo_wallet_transactions")
}

export function addTransaction(tx: Omit<WalletTransaction, "id" | "createdAt">): WalletTransaction {
  const newTx: WalletTransaction = {
    ...tx,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  }
  const existing = getTransactions()
  setTable("ufitgo_wallet_transactions", [...existing, newTx])
  return newTx
}

// Target Savings
export function getSavingsTargets(): SavingsTarget[] {
  return getTable<SavingsTarget>("ufitgo_savings_targets")
}

export function getSavingsTargetById(id: string): SavingsTarget | undefined {
  return getSavingsTargets().find(t => t.id === id)
}

export function createSavingsTarget(target: Omit<SavingsTarget, "id" | "savedAmount" | "createdAt">): SavingsTarget {
  const newTarget: SavingsTarget = {
    ...target,
    id: Math.random().toString(36).substring(2, 9),
    savedAmount: 0,
    createdAt: new Date().toISOString(),
  }
  const existing = getSavingsTargets()
  setTable("ufitgo_savings_targets", [...existing, newTarget])
  return newTarget
}

// Actions
export function addMoneyToWallet(userId: string, amount: number) {
  const bal = getWalletBalance()
  setWalletBalance(bal + amount)
  addTransaction({
    userId,
    amount,
    type: "Add Money",
    description: "Added money to wallet via Card",
    status: "Successful"
  })
}

export function withdrawMoneyFromWallet(userId: string, amount: number, accountInfo: string): boolean {
  const bal = getWalletBalance()
  if (bal < amount) return false

  setWalletBalance(bal - amount)
  addTransaction({
    userId,
    amount,
    type: "Withdrawal",
    description: `Withdrawal to ${accountInfo}`,
    status: "Pending" // Withdrawals usually take time, but we'll mark as pending
  })
  return true
}

export function addMoneyToTarget(userId: string, targetId: string, amount: number) {
  const targets = getSavingsTargets()
  const target = targets.find(t => t.id === targetId)
  if (!target) return

  target.savedAmount += amount
  setTable("ufitgo_savings_targets", targets)

  addTransaction({
    userId,
    amount, // we can keep it positive for the transaction list or negative from wallet. Wait, addMoneyToTarget is directly funding a target, not necessarily from wallet.
    // If it comes from card directly to target, it's Savings.
    type: "Savings",
    description: `Saved toward ${target.name}`,
    status: "Successful"
  })
}

export function payRegistrationFromWallet(userId: string, bookingId: string, amount: number = 50000): boolean {
  const bal = getWalletBalance()
  if (bal < amount) return false

  // Deduct wallet
  setWalletBalance(bal - amount)
  
  // Note: the saveBooking function already logs the transaction, so we don't log it here again 
  // if this is just a helper for wallet processing. 
  // Wait, if it's from wallet, we might want a specific transaction type, but for now we'll rely on saveBooking.
  return true
}

// ----------------------------------------------------
// USER SECURITY SETTINGS
// ----------------------------------------------------

export type UserSettings = {
  collectionAccount: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  } | null;
  pin: string | null;
  securityQuestion: {
    question: string;
    answer: string;
  } | null;
}

const DEFAULT_USER_SETTINGS: UserSettings = {
  collectionAccount: null,
  pin: null,
  securityQuestion: null
}

export function getUserSettings(): UserSettings {
  const data = getTable("ufitgo_user_settings")
  if (!data || data.length === 0) {
    // initialize
    setTable("ufitgo_user_settings", [DEFAULT_USER_SETTINGS])
    return DEFAULT_USER_SETTINGS
  }
  return data[0] as UserSettings
}

export function updateUserSettings(settings: Partial<UserSettings>) {
  const current = getUserSettings()
  const updated = { ...current, ...settings }
  setTable("ufitgo_user_settings", [updated])
}
