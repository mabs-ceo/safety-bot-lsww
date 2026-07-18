function formatSummary(observations) {
  const open = observations.filter((o) => o.status === "Open");
  const reopened = observations.filter((o) => o.status === "Reopened");
  const closed = observations.filter((o) => o.status === "Closed");

  let msg = `📊 *OBSERVATION SUMMARY*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🔴 *Open:* ${open.length}   🟡 *Reopened:* ${reopened.length}   ✅ *Closed:* ${closed.length}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (open.length > 0) {
    msg += `🔴 *OPEN CASES*\n`;
    open.forEach((o, i) => {
      msg += `\n${i + 1}. *${o.observationId}*\n`;
      msg += `   📝 ${o.description}\n`;
    });
  }

  if (reopened.length > 0) {
    msg += `🟡 *REOPENED CASES*\n`;
    reopened.forEach((o, i) => {
      msg += `\n${i + 1}. *${o.observationId}*\n`;
      msg += `   📝 ${o.description}\n`;
      msg += `   ⚠️ ${o.flagStatement}\n`;
    });
  }

  if (closed.length > 0) {
    msg += `\n✅ *CLOSED CASES*\n`;
    closed.forEach((o, i) => {
      msg += `\n${i + 1}. *${o.observationId}*\n`;
      msg += `   📝 ${o.description}\n`;
      msg += `   📝 ${o.actionStatement}\n`;
    });
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━`;
  return msg;
}

module.exports = {
  formatSummary,
};
