export function getDeviceId() {
  try {
    let id = localStorage.getItem('dd_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('dd_device_id', id);
    }
    return id;
  } catch (e) {
    // Fallback to in-memory ID if localStorage is blocked/private mode
    if (!window._fallbackDeviceId) {
      window._fallbackDeviceId = crypto.randomUUID();
    }
    return window._fallbackDeviceId;
  }
}