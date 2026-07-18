const axios = require("axios");
const {
  safetyFindingsController,
  getSafetyObservationsummary,
  closeSafetyObservationController,
  closeAllSafetyObservationsController,
  reopenSafetyObservationController,
} = require("../modules/safety_observation/controller");

const token = process.env.WHATSAPI_TOKEN;
const groupId = process.env.GROUP_ID;
/**
 * Sends a text reply back to the WhatsApp group via whapi.cloud.
 */
async function replyToGroup(text) {
  try {
    await axios.post(
      `https://gate.whapi.cloud/messages/text`,
      { to: groupId, body: text },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log("✅ Reply sent");
  } catch (error) {
    console.error("❌ Reply failed:", error.response?.data || error.message);
    // Re-throw so BullMQ marks the job as failed and retries it.
    // Without this, a failed reply would be silently swallowed.
    throw error;
  }
}

/**
 * Core message-handling logic — this is exactly what used to live inline
 * inside app.post("/webhook", ...). It's now a plain function that the
 * BullMQ worker calls per job, decoupled from Express/req/res entirely.
 *
 * @param {object} message - a single WhatsApp message object from whapi.cloud
 * @param {string} allowedGroupId - the group ID the bot listens to
 */
async function processWhatsappMessage(message) {
  console.log("✅ Processing message:", message);
  const userText = message.text?.body || message.image?.caption;

  // Admin override command
  if (message.from_me && userText === "!listen") {
    console.log("✅ Admin command: listening mode on");
    await replyToGroup("✅ I am now listening.");
    return;
  }

  if (!userText) return;

  console.log("✅ Received message:", message);
  console.log(
    "✅ Message from:",
    message.from === "6588062313" ? "Abu" : message.from,
  );
  console.log("✅ Text:", userText);

  // --- "finding:" → create a new safety observation ---
  if (userText.toLowerCase().includes("finding:")) {
    const lines = userText.split("\n");

    // Safe parser - handles colons in values like "9:00am"
    const getValue = (line) => line.split(":").slice(1).join(":").trim();

    const findingsText = getValue(lines[0]) || "unknown";
    const party = getValue(lines[1]) || "unknown";
    const location = getValue(lines[2]) || "unknown";
    const observedBy = message.from;
    const id = message.id;
    if (!findingsText || !party || !location) {
      await replyToGroup(
        allowedGroupId,
        `❌ Wrong format. Please use:\n\nfinding: [description]\nparty: [party]\nlocation: [location]`,
      );
      return;
    }

    console.log("✅ Findings:", { findingsText, party, location });

    const safetyObservationFinding = await safetyFindingsController({
      party,
      observedBy,
      location,
      findingsText,
      id,
    });

    await replyToGroup(
      `✅ Safety observation ID for finding "${findingsText}": ${safetyObservationFinding}`,
    );

    // Whatever this function returns becomes the job's "return value" in
    // BullMQ — retrievable later via job.returnvalue. This is what the
    // frontend polling endpoint below will read, instead of a DB query
    // or a socket emit.
    return {
      type: "new-safety-observation",
      id: safetyObservationFinding,
      party,
      location,
      findingsText,
      observedBy,
      createdAt: new Date().toISOString(),
    };
  }

  // --- "close:" → close an existing safety observation ---
  if (userText.toLowerCase().includes("close$")) {
    console.log("✅ Closing safety observation:", userText);
    const actionTakenBy = message.from;
    const observationId = userText.split("$")[1].trim();
    const actionStatement = userText.split("$")[2]?.trim() || null;
    const closeAll = observationId.toLowerCase() === "all";
    let closedObservation;
    if (closeAll) {
      closedObservation = await closeAllSafetyObservationsController();

      await replyToGroup(allowedGroupId, `✅ Closed all safety observations.`);
    } else {
      closedObservation = await closeSafetyObservationController(
        observationId,
        actionTakenBy,
        actionStatement || "No action statement provided",
      );
      console.log("✅ Closed safety observation:", closedObservation);
      await replyToGroup(
        `✅ Closed safety observation ID: ${closedObservation.observationId} by ${closedObservation.actionTakenBy}. Action statement: ${closedObservation.actionStatment || "No action statement provided"} `,
      );
    }
    return;
  }
  if (userText.toLowerCase().includes("no$")) {
    console.log("✅ Reopening safety observation:", userText);
    const actionTakenBy = message.from;

    const observationId = userText.split("$")[1].trim();
    const flagStatement = userText.split("$")[2]?.trim() || null;
    const closeAll = observationId.toLowerCase() === "all";
    let reopenedObservation;

    reopenedObservation = await reopenSafetyObservationController(
      observationId,
      flagStatement || "No flag statement provided",
    );
    console.log("✅ Reopened safety observation:", reopenedObservation);
    await replyToGroup(
      `✅ Reopened safety observation ID: ${reopenedObservation.observationId}. Flag statement: ${reopenedObservation.flagStatement || "No flag statement provided"} `,
    );

    return;
  }

  // --- "view$" → get a monthly summary (or all "open" observations) ---
  if (userText.toLowerCase().includes("view$")) {
    const months = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];

    // "view$ open" bypasses the month check entirely and asks the
    // controller for every observation that's still open, regardless
    // of when it was created.
    const isOpenRequest = userText.toLowerCase().includes("open");

    let month = userText.split("$")[1].trim();
    if (!month) {
      month = new Date()
        .toLocaleString("default", { month: "short" })
        .toLowerCase();
    }

    if (!isOpenRequest && !months.includes(month.toLowerCase())) {
      await replyToGroup(
        `❌ Invalid month. Please use one of the following: ${months.join(", ")}`,
      );
      return;
    }

    const textToSend = isOpenRequest ? "open" : month;
    const observations = await getSafetyObservationsummary(textToSend);

    await replyToGroup(
      observations || `No safety observations found for ${textToSend}.`,
    );
    return;
  }
}

module.exports = { replyToGroup, processWhatsappMessage };
