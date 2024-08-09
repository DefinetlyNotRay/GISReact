import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";

// Custom icon for the main location marker
const redIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32], // size of the icon
});

const arrowIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // Change this to your preferred arrow icon URL
  iconSize: [24, 24], // Adjust the size as needed
});

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const SetViewOnCoordsChange = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, map.getZoom());
    }
  }, [coords, map]);

  return null;
};

const Map = () => {
  const [userCoords, setUserCoords] = useState([-6.2088, 106.8456]); // Default to Jakarta, Indonesia
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedCoords, setSelectedCoords] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords([latitude, longitude]);
      },
      (error) => {
        console.error("Error getting the user's location:", error);
      }
    );
  }, []);

  const handleSearch = async () => {
    if (!query) return;

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=10`
      );
      const results = response.data;

      // Sort results by distance from user's current location
      const sortedResults = results.sort((a, b) => {
        const distanceA = calculateDistance(
          userCoords[0],
          userCoords[1],
          a.lat,
          a.lon
        );
        const distanceB = calculateDistance(
          userCoords[0],
          userCoords[1],
          b.lat,
          b.lon
        );
        return distanceA - distanceB;
      });

      setLocations(sortedResults);
    } catch (error) {
      console.error("Error fetching location data:", error);
    }
  };

  const handleLocationClick = (lat, lon) => {
    setSelectedCoords([lat, lon]);
  };

  return (
    <div className="relative w-screen h-screen">
      <div className="absolute z-50 w-64 top-4 left-4">
        <input
          type="text"
          className="w-full p-2 mb-5 bg-white border rounded-sm"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <div className="w-full overflow-y-auto bg-transparent  shadow-lg max-h-[85vh]">
          {locations.map((location, index) => (
            <div
              key={index}
              onClick={() => handleLocationClick(location.lat, location.lon)}
              className="p-2 mb-6 bg-white border-b border-gray-300 rounded-md cursor-pointer hover:bg-gray-100"
            >
              {location.display_name}
            </div>
          ))}
        </div>
      </div>
      <MapContainer
        center={userCoords}
        zoom={13}
        style={{ height: "100vh", width: "100%" }}
        zoomControl={false} // Disable the default zoom control
        className="z-10"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* User's current location marker */}
        <Marker position={userCoords} icon={redIcon}>
          <Tooltip permanent>Current Location</Tooltip>
        </Marker>

        {/* Display search result markers */}
        {locations.map((location, index) => {
          const distance = calculateDistance(
            userCoords[0],
            userCoords[1],
            location.lat,
            location.lon
          ).toFixed(2);

          return (
            <Marker
              key={index}
              position={[location.lat, location.lon]}
              icon={arrowIcon}
            >
              <Tooltip direction="top" offset={[0, -10]} permanent>
                {`${distance} km`}
              </Tooltip>
            </Marker>
          );
        })}

        {/* Update map view on user location change or when a location is selected */}
        <SetViewOnCoordsChange coords={selectedCoords || userCoords} />
      </MapContainer>
    </div>
  );
};

export default Map;
