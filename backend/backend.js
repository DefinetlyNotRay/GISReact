import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 5000;

app.use(cors());

const fetchDataFromOpenCage = async (query, lat, lon, retryCount = 3) => {
  const url = "https://api.opencagedata.com/geocode/v1/json";
  const params = {
    q: `${query} near ${lat},${lon}`,
    key: "7358294d2d424275b3c66b8c8a9fda57",
    limit: 10,
    no_annotations: 1,
  };

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await axios.get(url, { params, timeout: 10000 });
      return response.data.results;
    } catch (error) {
      console.error(
        `Attempt ${attempt} - Error fetching data from OpenCage:`,
        error.message
      );
      if (attempt === retryCount) {
        throw error;
      }
      await new Promise((res) => setTimeout(res, 1000)); // Wait 1 second before retrying
    }
  }
};

app.get("/search", async (req, res) => {
  const { query, lat, lon } = req.query;
  try {
    const results = await fetchDataFromOpenCage(query, lat, lon);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Error fetching data from OpenCage" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
