require('dotenv').config();
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080") + "/api/operator"
async function test() {
  const url = `${API_BASE_URL}/packages/public?page=1&limit=10`;
  console.log('Fetching', url);
  try {
    const res = await fetch(url);
    console.log('Status', res.status);
    if (!res.ok) {
      console.log('Error', await res.text());
    } else {
      console.log('Success', (await res.json()).data.length, 'packages');
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}
test();
