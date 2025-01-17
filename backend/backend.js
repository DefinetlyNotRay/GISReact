import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 5000;

app.use(cors());

const fetchDataFromOverpass = async (query, lat, lon, radius = 10000) => {
  // Overpass API query to search around a specific location within a radius
  const overpassQuery = `
    [out:json];
    node
      ["name"~"${query}", i]
      (around:${radius}, ${lat}, ${lon});
    out body;
  `;

  const url = "https://overpass-api.de/api/interpreter";

  try {
    const response = await axios.post(
      url,
      overpassQuery,
      { headers: { "Content-Type": "text/plain" }, timeout: 10000 }
    );
    return response.data.elements;
  } catch (error) {
    console.error("Error fetching data from Overpass API:", error.message);
    throw error;
  }
};

app.get("/search", async (req, res) => {
  const { query, lat, lon } = req.query;
  try {
    const results = await fetchDataFromOverpass(query, lat, lon);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Error fetching data from Overpass API" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
