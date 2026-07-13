const { formatSummary } = require("../../utils/whatsapp/format.utils");
const SafetyObservationModel = require("./model");
async function safetyFindingsController(props) {
  const { party, observedBy, location, findingsText } = props;
  const todateCount = await SafetyObservationModel.countDocuments({
    observationDate: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lt: new Date(new Date().setHours(23, 59, 59, 999)),
    },
  });
  const number = todateCount + 1 < 10 ? `0${todateCount + 1}` : todateCount + 1;

  const now = new Date();
  const readable = now.toISOString().slice(0, 10).replace(/-/g, ""); // 20260628
  const observationId = `${readable}-${number}`;

  console.log("observationId", observationId);
  const newObservation = new SafetyObservationModel({
    observationId,
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

async function closeSafetyObservationController(observationId) {
  try {
    const observation = await SafetyObservationModel.findOne({
      observationId,
    });
    if (!observation) {
      throw new Error("Observation not found");
    }
    observation.status = "Closed";
    await observation.save();
    return observation;
  } catch (error) {
    console.error("Error closing observation:", error);
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
        status: "Open",
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
};
