// public/js/api.js
import { getDeviceId } from './device.js';

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Device-Id': getDeviceId()
  };
}

export async function getReports(bboxString) {
  const res = await fetch(`/api/reports?bbox=${encodeURIComponent(bboxString)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch reports');
  }
  return await res.json();
}

export async function createReport(data) {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  });
  
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to submit report');
  }
  return json;
}