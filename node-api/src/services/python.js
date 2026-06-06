const axios = require("axios");
const FormData = require("form-data");

async function extractFaces(buffer) {
  const form = new FormData();

  form.append("file", buffer, {
    filename: "image.jpg",
  });

  const response = await axios.post(
    `${process.env.PYTHON_API}/extract`,
    form,
    {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    }
  );

  return response.data;
}

module.exports = {
  extractFaces,
};