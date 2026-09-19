import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      location?: string;
      role?: string;
      kycStatus?: string;
      isVerified?: boolean;
    };
    accessToken?: string;
    error?: string;
  }

  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
    role?: string;
    kycStatus?: string;
    isVerified?: boolean;
    token?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
    role?: string;
    kycStatus?: string;
    isVerified?: boolean;
    accessToken?: string;
    error?: string;
  }
}
