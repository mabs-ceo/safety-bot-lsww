function formatSummary(observations, daily = false) {
  const open = observations.filter((o) => o.status === "Open");
  const reopened = observations.filter((o) => o.status === "Reopened");
  const closed = observations.filter((o) => o.status === "Closed");
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleString("en-GB", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour12: true,
    hour: "numeric",
    minute: "numeric",
  });
  const header = `🚧 Daily Safety Findings Reminder | ${formattedDate}`;
  let msg = daily ? ` *${header}*\n` : `📊 *OBSERVATION SUMMARY*\n`;

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🔴 *Open:* ${open.length}   🟡 *Reopened:* ${reopened.length}   ✅ *Closed:* ${closed.length}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (open.length > 0) {
    msg += `🔴 *OPEN CASES*\n`;
    open.forEach((o, i) => {
      msg += `\n${i + 1}. *${o.observationId}*\n`;
      msg += `   📝 ${o?.description}\n`;
      msg += `   📝 ${o?.contractor}\n`;
      msg += `   📝 ${o?.location ?? "N/A"}\n`;
    });
  }

  if (reopened.length > 0) {
    msg += `🟡 *REOPENED CASES*\n`;
    reopened.forEach((o, i) => {
      msg += `\n${i + 1}. *${o.observationId}*\n`;
      msg += `   📝 ${o?.description}\n`;
      msg += `   ⚠️ ${o?.flagStatement ?? "N/A"}\n`;
      msg += `   📝 ${o?.contractor ?? "N/A"}\n`;
      msg += `   📝 ${o?.location ?? "N/A"}\n`;
    });
  }

  if (closed.length > 0) {
    msg += `\n✅ *CLOSED CASES*\n`;
    closed.forEach((o, i) => {
      msg += `\n${i + 1}. *${o.observationId}*\n`;
      msg += `   📝 ${o?.description ?? "N/A"}\n`;
      msg += `   📝 ${o?.actionStatement ?? "N/A"}\n`;
      msg += `   📝 ${o?.contractor ?? "N/A"}\n`;
      msg += `   📝 ${o?.location ?? "N/A"}\n`;
      msg += `   📝 ${o?.actionTakenBy ?? "N/A"}\n`;
    });
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━`;
  return msg;
}

module.exports = {
  formatSummary,
};
