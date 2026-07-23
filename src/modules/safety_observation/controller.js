const { formatSummary } = require("../../utils/whatsapp/format.utils");
const SafetyObservationModel = require("./model");
async function safetyFindingsController(props) {
  const { party, observedBy, location, findingsText, id } = props;
  const todateCount = await SafetyObservationModel.countDocuments({
    observationDate: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lt: new Date(new Date().setHours(23, 59, 59, 999)),
    },
  });
  const number = todateCount + 1 < 10 ? `0${todateCount + 1}` : todateCount + 1;

  const now = new Date(); // Get the current date and time
  const month = now.getMonth() + 1; // Months are zero-based, so add 1
  const day = now.getDate();
  const newFormate = `${month > 9 ? month : `0${month}`}${day > 9 ? day : `0${day}`}`;

  const readable = newFormate.replace(/-/g, ""); // 0628
  const observationId = `${readable}-${number}`;

  console.log("observationId", observationId);
  const newObservation = new SafetyObservationModel({
    observationId,
    messageId: id,
    observedBy,
    location,
    category: "Near Miss",
    severity: "Low",
    description: findingsText,
    correctionsTaken: "None",
    status: "Open",
  });
  await newObservation.save();

  // This function's only job is to save the record and hand back the ID.
  // Sending the WhatsApp reply is whatsapp.service.js's responsibility —
  // it already does `await replyToGroup(..., safetyObservationFinding)`
  // right after calling this function. Replying from both places would
  // double-send the message, and importing replyToGroup here is what
  // caused the circular-dependency crash (controller.js -> service.js
  // -> controller.js).
  return observationId;
}

async function closeSafetyObservationController(
  observationId,
  actionTakenBy,
  actionStatment,
) {
  try {
    const observation = await SafetyObservationModel.findOne({
      observationId,
    });
    if (!observation) {
      throw new Error("Observation not found");
    }
    observation.status = "Closed";
    observation.actionTakenBy = actionTakenBy;
    observation.actionStatment = actionStatment;
    observation.rectificationDate = new Date();
    await observation.save();
    return observation;
  } catch (error) {
    console.error("Error closing observation:", error);
    throw error;
  }
}
async function reopenSafetyObservationController(observationId, flagStatement) {
  try {
    const observation = await SafetyObservationModel.findOne({
      observationId,
    });
    if (!observation) {
      throw new Error("Observation not found");
    }

    observation.status = "Reopened";
    observation.flagStatement = flagStatement;
    observation.rectificationDate = null; // Reset rectification date when reopening
    await observation.save();
    return observation;
  } catch (error) {
    console.error("Error reopening observation:", error);
    throw error;
  }
}
async function closeAllSafetyObservationsController() {
  try {
    const result = await SafetyObservationModel.updateMany(
      { status: "Open" },
      { status: "Closed" },
    );
    return result;
  } catch (error) {
    console.error("Error closing all observations:", error);
    throw error;
  }
}
async function findingsCurrentStatus(x) {
  try {
    const result = await SafetyObservationModel.findOne({
      observationId: x,
    });
    if (!result) {
      throw new Error("Observation not found");
    }
    if (result.status === "Closed") {
      return "Closed";
    }
    if (result.status === "Reopened") {
      return "Reopened";
    }
    if (result.status === "Open") {
      return "Open";
    }
  } catch (error) {
    console.error("Error closing all observations:", error);
    throw error;
  }
}

async function getSafetyObservationsummary(text) {
  const month = text.toLowerCase() !== "open" && text.toLowerCase();
  console.log("Fetching safety observations summary...");
  const monthMap = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };

  try {
    if (text.toLowerCase() === "open") {
      const openFindings = await SafetyObservationModel.find({
        status: ["Open", "In Progress", "Reopened"],
      }).sort({ observationDate: -1 });
      if (!openFindings || openFindings.length === 0) {
        return "No open observations found";
      }
      const summary = formatSummary(openFindings);
      return summary;
    }

    const monthNumber = monthMap[month?.toLowerCase()];
    if (!monthNumber) {
      return "Invalid month";
    }
    const currentYear = new Date().getFullYear();
    const findings = await SafetyObservationModel.find({
      observationDate: {
        $gte: new Date(`${currentYear}-${monthNumber}-01`),
        $lt: new Date(`${currentYear}-${monthNumber}-31`),
      },
    }).sort({ observationDate: -1 });
    if (!findings || findings.length === 0) {
      return "No observations found for the specified month";
    }
    const summary = formatSummary(findings);
    return summary;
  } catch (error) {
    console.error("Error fetching observation:", error);
    throw error;
  }
}

module.exports = {
  safetyFindingsController,
  closeSafetyObservationController,
  getSafetyObservationsummary,
  closeAllSafetyObservationsController,
  reopenSafetyObservationController,
  findingsCurrentStatus,
};
