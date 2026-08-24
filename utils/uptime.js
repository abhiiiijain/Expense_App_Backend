const startedAt = Date.now();

function breakdownUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return { days, hours, minutes, seconds };
}

function formatUptime({ days, hours, minutes, seconds }) {
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

function getUptime() {
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const parts = breakdownUptime(uptimeSeconds);

  return {
    liveSince: new Date(startedAt).toISOString(),
    uptimeSeconds,
    uptime: formatUptime(parts),
  };
}

module.exports = { getUptime };
