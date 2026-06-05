export function isWithinCheckinWindow(event, shift = null) {
  const startValue = shift?.startTime || event?.startDate;
  const endValue = shift?.endTime || event?.endDate;
  if (!startValue || !endValue) return false;

  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;

  const leadTime = shift ? 15 * 60 * 1000 : 30 * 60 * 1000;
  const graceTime = shift ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000;
  const now = Date.now();
  return now >= start - leadTime && now <= end + graceTime;
}
