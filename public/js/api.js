// public/js/api.js
import { getDeviceId } from './device.js';

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Device-Id': getDeviceId()
  };
}

export async function getReports(bboxString) {
  const res = await fetch(`/api/reports?bbox=${encodeURIComponent(bboxString)}`, { headers: headers() });
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

export async function geocode(q, lat, lng) {
  const params = new URLSearchParams({ q, lat, lng });
  const res = await fetch(`/api/geocode?${params}`);
  if (!res.ok) throw new Error('Search failed');
  return await res.json();
}

export async function getRoute(start, end, zones) {
  const res = await fetch('/api/route', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ start, end, zones })
  });
  if (!res.ok) throw new Error('No route found');
  return await res.json();
}

export async function sendVote(reportId, vote) {
  const res = await fetch(`/api/reports/${reportId}/vote`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ vote })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}
