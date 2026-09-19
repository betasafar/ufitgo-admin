export type DeliveryMethod = 'pickup' | 'delivery'

export type Agent = {
  id: string
  name: string
  rating: number
  reviews: number
  rateSAR: number // Rate per SAR
  rateUSD: number // Rate per USD
  isVerified: boolean
  coverage: string[] // e.g., ["Mecca", "Jeddah"]
  distance?: number // Optional distance in km for pickup
}

// Mock Cities
export const EXCHANGE_CITIES = [
  "Mecca",
  "Medina",
  "Jeddah",
  "Riyadh",
  "Lagos",
  "Abuja"
]

export const MOCK_BANKS = [
  "First Bank Nigeria",
  "GTBank",
  "Access Bank",
  "Zenith Bank",
  "UBA",
  "Sterling Bank",
  "Kuda Bank",
  "Opay",
  "Palmpay",
  "Others"
]

// Delivery Fee Standard Engine Mock
// UfitGo controls the customer-facing delivery pricing
export function getUfitGoDeliveryFee(city: string, amount: number): number {
  if (city === "Mecca" || city === "Medina") {
    return 15 // Standard 15 delivery fee for holy cities
  }
  if (city === "Lagos" || city === "Abuja") {
    return 0 // E.g., free delivery in NG hubs or we might handle it differently
  }
  return 20 // Default other cities
}

// Mock Agents (The Marketplace)
export const MOCK_AGENTS: Agent[] = [
  {
    id: "a1",
    name: "YAWALE BDC",
    rating: 4.8,
    reviews: 142,
    rateSAR: 356, 
    rateUSD: 1450,
    isVerified: true,
    coverage: ["Mecca", "Medina", "Jeddah"],
    distance: 1.2
  },
  {
    id: "a2",
    name: "Buraq Forex Partners",
    rating: 4.9,
    reviews: 310,
    rateSAR: 354.5,
    rateUSD: 1445,
    isVerified: true,
    coverage: ["Mecca", "Riyadh"],
    distance: 3.5
  },
  {
    id: "a3",
    name: "Lagos Swift FX",
    rating: 4.5,
    reviews: 89,
    rateSAR: 358,
    rateUSD: 1460,
    isVerified: false,
    coverage: ["Lagos", "Abuja"],
    distance: 10
  },
  {
    id: "a4",
    name: "Safa Currency Dealers",
    rating: 4.7,
    reviews: 205,
    rateSAR: 355,
    rateUSD: 1448,
    isVerified: true,
    coverage: ["Mecca", "Medina"],
    distance: 0.8
  }
]
