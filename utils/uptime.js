const startedAt = Date.now();

function formatUptime(totalSeconds) {
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor((totalSeconds / 3600) % 24);
  const days = Math.floor(totalSeconds / 86400);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

function getUptime() {
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  return {
    liveSince: new Date(startedAt).toISOString(),
    uptimeSeconds,
    uptime: formatUptime(uptimeSeconds),
  };
}

module.exports = { getUptime };
