const API_BASE_URL = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080") + "/api/operator"

export async function fetchPublicPackages(page = 1, limit = 10, options?: RequestInit) {
  try {
    const url = `${API_BASE_URL}/packages/public?page=${page}&limit=${limit}`;
    console.log(`[fetchPublicPackages] Fetching: ${url}`);
    
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      ...options,
    })
    
    if (!response.ok) {
      console.error(`[fetchPublicPackages] Failed with status: ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch packages')
    }
    return await response.json()
  } catch (error) {
    console.error(`[fetchPublicPackages] Exception caught:`, error);
    throw error;
  }
}

export async function fetchPackageComparison(id: string) {
  const response = await fetch(`${API_BASE_URL}/packages/${id}/comparison`)
  if (!response.ok) {
    throw new Error('Failed to fetch package comparison')
  }
  return response.json()
}

export async function fetchPublicOperators(page = 1, limit = 10, search?: string, location?: string, options?: RequestInit) {
  try {
    let url = `${API_BASE_URL}/public?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (location) url += `&location=${encodeURIComponent(location)}`;
    
    console.log(`[fetchPublicOperators] Fetching: ${url}`);
    
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      ...options,
    });
    
    if (!response.ok) {
      console.error(`[fetchPublicOperators] Failed with status: ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch operators');
    }
    return await response.json();
  } catch (error) {
    console.error(`[fetchPublicOperators] Exception caught:`, error);
    throw error;
  }
}

export async function fetchOperatorDetails(id: string | number) {
  try {
    const url = `${API_BASE_URL}/public/${id}`;
    console.log(`[fetchOperatorDetails] Fetching: ${url}`);
    
    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });
    
    if (!response.ok) {
      console.error(`[fetchOperatorDetails] Failed with status: ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch operator details');
    }
    return await response.json();
  } catch (error) {
    console.error(`[fetchOperatorDetails] Exception caught:`, error);
    throw error;
  }
}

export async function fetchUserNotifications(userId: string, token: string) {
  try {
    const url = `${process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080"}/api/user-notifications/user/${userId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      console.warn('Failed to fetch user notifications (Backend may not be deployed yet)');
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(id: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080"}/api/user-notifications/${id}/read`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
  return response.json();
}
