const axios = require("axios");
const {
  safetyFindingsController,
  getSafetyObservationsummary,
  closeSafetyObservationController,
  closeAllSafetyObservationsController,
  findingsCurrentStatus,
  reopenSafetyObservationController,
} = require("../modules/safety_observation/controller");

const token = process.env.WHATSAPI_TOKEN;
// const groupId = process.env.GROUP_ID;
const groupTmcSafety = process.env.GROUP_TMC_SAFETY;
const groupLswwSafety = process.env.GROUP_LSWW_SAFETY;
/**
 * Sends a text reply back to the WhatsApp group via whapi.cloud.
 */
// async function replyToGroup(text) {
//   try {
//     await axios.post(
//       `https://gate.whapi.cloud/messages/text`,
//       { to: groupId, body: text },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       },
//     );
//     console.log("✅ Reply sent");
//   } catch (error) {
//     console.error("❌ Reply failed:", error.response?.data || error.message);
//     // Re-throw so BullMQ marks the job as failed and retries it.
//     // Without this, a failed reply would be silently swallowed.
//     throw error;
//   }
// }
async function replyToGroup(text, quotedMessageId) {
  const payloadTMC = {
    to: groupTmcSafety,
    body: text,
  };

  if (quotedMessageId) {
    payloadTMC.quoted = quotedMessageId;
  }
  try {
    await axios.post(`https://gate.whapi.cloud/messages/text`, payloadTMC, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Reply sent");
  } catch (error) {
    console.error("❌ Reply failed:", error.response?.data || error.message);
    throw error;
  }
}
async function replyToLSWWGroup(text, quotedMessageId, isAuthorized = false) {
  // replyToLSWWGroup(observations, message.id, isAuthorized);
  // const testId = "120363377757725792@g.us";

  const payloadLSWW = {
    to: groupLswwSafety,
    body: text,
  };

  if (quotedMessageId) {
    payloadLSWW.quoted = quotedMessageId;
  }
  try {
    await axios.post(`https://gate.whapi.cloud/messages/text`, payloadLSWW, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    console.log("✅ Reply sent");
  } catch (error) {
    console.error("❌ Reply failed:", error.response?.data || error.message);
    throw error;
  }
}

async function forwardToGroup(messageId) {
  const payload = {
    to: groupLswwSafety,
    force: true,
  };

  try {
    await axios.post(
      `https://gate.whapi.cloud/messages/${messageId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Image forwarded");
  } catch (error) {
    console.error("❌ Forward failed:", error.response?.data || error.message);
    throw error;
  }
}
async function processWhatsappMessage(message, isAuthorized = false) {
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
  if (
    userText.toLowerCase().includes("finding:") &&
    message.chat_id === groupTmcSafety
  ) {
    const lines = userText.split("\n");
    console.log("✅ Lines");
    // Safe parser - handles colons in values like "9:00am"
    // const getValue = (line) => line.split(":").slice(1).join(":").trim();
    const getValue = (line) =>
      line ? line.split(":").slice(1).join(":").trim() : "";
    const findingsText = getValue(lines[0]) || "unknown";
    const party = getValue(lines[1]) || "unknown";
    const location = getValue(lines[2]) || "unknown";
    console.log("✅ Getvalue");
    const rawFindings = getValue(lines[0]);
    const rawParty = getValue(lines[1]);
    const rawLocation = getValue(lines[2]);

    const observedBy = message.from;
    const id = message.id;
    // if (!findingsText || !party || !location) {
    //   await replyToGroup(
    //     `❌ Wrong format. Please use:\n\nfinding: [description]\nparty: [party]\nlocation: [location]`,
    //     id,
    //   );
    //   return;
    // }

    if (!rawFindings || !rawParty || !rawLocation) {
      await replyToGroup(
        `❌ Wrong format. Please use:\n\nfinding: [description]\nparty: [party]\nlocation: [location]`,
        id,
      );
      return;
    }
    console.log("✅ Raw values");
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
      id,
    );

    // await replyToLSWWGroup(
    //   `✅ Safety Observation with id :${safetyObservationFinding}. If you are responsible for this observation, please provide the Safety Officer with an update on the corrective actions taken.Upon verification, all safety observations will be officially closed in the TMC Safety group .\n ${findingsText} \n Party: ${party} \n Location: ${location}`,
    // );

    await forwardToGroup(message.id);

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
      console.log("✅ Closed all safety observations:", closedObservation);
      await replyToGroup(
        `✅ Closed all safety observations.`,
        closedObservation.messageId,
      );
    } else {
      const currentStatus = await findingsCurrentStatus(observationId);
      if (currentStatus && currentStatus === "Closed") {
        return await replyToGroup(
          `❌ Safety observation ID: ${observationId} is already closed.`,
          message.id,
        );
      }
      closedObservation = await closeSafetyObservationController(
        observationId,
        actionTakenBy,
        actionStatement || "No action statement provided",
      );
      console.log("✅ Closed safety observation:", closedObservation);
      await replyToGroup(
        `✅ Closed safety observation ID: ${closedObservation.observationId} by ${closedObservation.actionTakenBy}. Action statement: ${closedObservation.actionStatment || "No action statement provided"} `,
        closedObservation.messageId,
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
      reopenedObservation.messageId,
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
        message.id,
      );
      return;
    }

    const textToSend = isOpenRequest ? "open" : month;
    const observations = await getSafetyObservationsummary(textToSend);

    if (!observations || observations.length === 0) {
      await replyToGroup(`No safety observations found for ${textToSend}.`);
      return;
    }
    if (isAuthorized && groupLswwSafety) {
      await replyToLSWWGroup(observations, message.id, isAuthorized);

      return;
    }

    await replyToGroup(observations, message.id);

    return;
  }
}
async function processWhatsappMessageToPUB(message, isAuthorized = false) {
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
        message.id,
      );
      return;
    }

    const textToSend = isOpenRequest ? "open" : month;
    const observations = await getSafetyObservationsummary(textToSend);

    if (!observations || observations.length === 0) {
      await replyToGroup(`No safety observations found for ${textToSend}.`);
      return;
    }
    if (isAuthorized && groupLswwSafety) {
      await replyToLSWWGroup(observations, message.id, isAuthorized);

      return;
    }

    await replyToGroup(observations, message.id);

    return;
  }
}
async function dailyWhatsappMessage() {
  const daily = true;
  const observations = await getSafetyObservationsummary("open", daily);

  if (!observations || observations.length === 0) {
    await replyToGroup(
      `All safety observations are closed. No open safety observations found.`,
    );
    return;
  }
  await replyToGroup(observations);

  return;
}
async function replyToUser(to, text) {
  try {
    await axios.post(
      `https://gate.whapi.cloud/messages/text`,
      { to, body: text },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log("✅ DM sent");
  } catch (error) {
    console.error("❌ DM failed:", error.response?.data || error.message);

    throw error;
  }
}
module.exports = {
  replyToGroup,
  replyToLSWWGroup,
  processWhatsappMessage,
  processWhatsappMessageToPUB,
  dailyWhatsappMessage,
};
