export type PilgrimageType = "umrah" | "hajj"

export type Operator = {
  id: number
  name: string
  companyName?: string
  logo?: string | null
  verified: boolean
  verificationStatus?: string
  description: string
  rating: number
  reviews: number
  trustScore?: number
  yearsOfExperience?: number
}

export type Package = {
  id: string // Using string for frontend routing ease, though API is number
  name: string // API: title
  type: PilgrimageType
  category: string // API: serviceLevel (premium, family, economy)
  operator: Operator
  priceFrom: number // API: price
  duration: number // API duration in days/nights
  departureDate: string
  departureCity: string
  highlights: string[] // API: inclusions
  heroImage: string
  cardImage: string
  
  // Dynamic Pricing Fields
  registrationFeeEnabled?: boolean
  registrationFeeAmount?: number
  installmentEligible?: boolean
  initialDeposit?: number
  finalBalance?: number
  
  // Discount Fields
  discountEligible?: boolean
  discountPilgrimThreshold?: number
  discountPercentage?: number
}

// Fallback for types and tests
export const packages: Package[] = []

export const featuredPackages = packages.slice(0, 3)

export async function getPackage(id: string): Promise<Package | null> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080"
    const res = await fetch(`${API_URL}/api/operator/packages/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.success || !json.data) return null
    
    const p = json.data
    return {
      id: String(p.id),
      name: p.title,
      type: "umrah", // Hardcoded fallback or derive from title
      category: p.serviceLevel || "premium",
      operator: {
        id: p.operator?.id || 1,
        name: p.operator?.companyName || p.operator?.name || "Unknown Operator",
        verified: p.operator?.verificationStatus === 'approved',
        description: p.operator?.description || "",
        rating: p.operator?.trustScore ? Number(p.operator.trustScore) / 20 : 4.5,
        reviews: 0
      },
      priceFrom: Number(p.price || 0),
      duration: p.duration || 10,
      departureDate: p.departureDate || "TBD",
      departureCity: p.departingFrom || "Lagos",
      highlights: p.inclusions || [],
      heroImage: (p.images && p.images.length > 0) ? p.images[0] : "/images/hero-kaaba.png",
      cardImage: (p.images && p.images.length > 0) ? p.images[0] : "/images/medina.png",
      registrationFeeEnabled: p.registrationFeeEnabled,
      registrationFeeAmount: Number(p.registrationFeeAmount || 0),
      installmentEligible: p.installmentEligible,
      initialDeposit: Number(p.initialDeposit || 0),
      finalBalance: Number(p.finalBalance || 0),
      discountEligible: p.discountEligible,
      discountPilgrimThreshold: Number(p.discountPilgrimThreshold || 0),
      discountPercentage: Number(p.discountPercentage || 0)
    }
  } catch (error) {
    console.error("Failed to fetch package:", error)
    return null
  }
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount)
}

export const departureCities = ["Lagos", "Abuja", "Kano"]
export const packageTypes: { value: PilgrimageType; label: string }[] = [
  { value: "umrah", label: "Umrah" },
  { value: "hajj", label: "Hajj" },
]
export const categories = ["economy", "premium", "family", "standard"]
