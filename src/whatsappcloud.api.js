const dotenv = require("dotenv");
dotenv.config();

const url = process.env.WHATSAPI_URL;
const token = process.env.WHATSAPI_TOKEN;
const callingUrl = `${url}groups/?count=200`;
const callingSelectedGroup = `${url}groups/${process.env.GROUP_ID}`;

async function getGroups() {
  try {
    const response = await axios.get(callingUrl, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = response.data;
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}
async function getSelectedGroup() {
  try {
    const response = await axios.get(callingSelectedGroup, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = response.data;
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

getGroups();

module.exports = {
  getGroups,
  getSelectedGroup,
};
