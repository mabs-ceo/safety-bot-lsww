function formatSummary(observations) {
  const open = observations.filter((o) => o.status === "Open");
  const closed = observations.filter((o) => o.status === "Closed");

  let msg = `📊 *OBSERVATION SUMMARY*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🔴 *Open:* ${open.length}   ✅ *Closed:* ${closed.length}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (open.length > 0) {
    msg += `🔴 *OPEN CASES*\n`;
    open.forEach((o, i) => {
      msg += `\n${i + 1}. *${o.observationId}*\n`;
      msg += `   📝 ${o.description}\n`;
    });
  }

  if (closed.length > 0) {
    msg += `\n✅ *CLOSED CASES*\n`;
    closed.forEach((o, i) => {
      msg += `\n${i + 1}. *${o.observationId}*\n`;
      msg += `   📝 ${o.description}\n`;
    });
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━`;
  return msg;
}

module.exports = {
  formatSummary,
};
