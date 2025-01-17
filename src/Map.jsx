import React, { useEffect, useState } from "react";
import tt from "@tomtom-international/web-sdk-maps";
import ttServices from "@tomtom-international/web-sdk-services";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import "./marker.css";
import axios from "axios";

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
  return (R * c).toFixed(2); // Distance in km, rounded to 2 decimal places
};

const Map = () => {
  const [isSearchResultsVisible, setIsSearchResultsVisible] = useState(false);
  const [userCoords, setUserCoords] = useState([106.741905, -6.403254]); // Default to Jakarta
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState([]);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [routeLayer, setRouteLayer] = useState(null);

  const clearMarkers = () => {
    markers.forEach((marker) => marker.remove());
    setMarkers([]);
  };

  const clearRoute = () => {
    if (map.getLayer("route")) {
      map.removeLayer("route");
    }
    if (map.getSource("route")) {
      map.removeSource("route");
    }
  };

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

  useEffect(() => {
    const mapInstance = tt.map({
      key: "oQpDT61lYsQpX376bAf3aK1myogYGLLR",
      container: "map",
      center: userCoords,
      zoom: 13,
    });

    // User marker
    const userMarker = new tt.Marker({ className: "user-marker" })
      .setLngLat(userCoords)
      .addTo(mapInstance);

    setMap(mapInstance);

    return () => mapInstance.remove();
  }, [userCoords]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setLocations([]);
      setIsSearchResultsVisible(false);
      clearMarkers();
      clearRoute();

      return;
    }

    try {
      const response = await axios.get(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(
          query
        )}.json?key=oQpDT61lYsQpX376bAf3aK1myogYGLLR&lon=${userCoords[0]}&lat=${
          userCoords[1]
        }&radius=10000&limit=10`
      );

      const results = response.data.results.map((result) => ({
        lat: result.position.lat,
        lon: result.position.lon,
        display_name: result.poi?.name || "Unnamed location",
        address: result.address?.freeformAddress || "Address not available",
        distance: calculateDistance(
          userCoords[1],
          userCoords[0],
          result.position.lat,
          result.position.lon
        ),
      }));

      const sortedResults = results.sort((a, b) => a.distance - b.distance);
      setLocations(sortedResults);
      setIsSearchResultsVisible(sortedResults.length > 0);

      clearMarkers();
      clearRoute();

      const newMarkers = sortedResults.map((location) => {
        const marker = new tt.Marker({ className: "search-marker" })
          .setLngLat([location.lon, location.lat])
          .addTo(map);

        const popup = new tt.Popup({ offset: 35 }).setHTML(
          `<div>
            <strong>${location.display_name}</strong><br />
            ${location.address}<br />
            <span>Distance: ${location.distance} km</span>
          </div>`
        );

        marker.setPopup(popup);

        marker.getElement().addEventListener("click", () => {
          drawRoute(location.lat, location.lon);
        });

        return marker;
      });

      setMarkers(newMarkers);
    } catch (error) {
      console.error("Error fetching location data from TomTom:", error.message);
    }
  };

  const drawRoute = async (destLat, destLon) => {
    clearRoute();

    try {
      const routeData = await ttServices.services.calculateRoute({
        key: "oQpDT61lYsQpX376bAf3aK1myogYGLLR",
        locations: `${userCoords[0]},${userCoords[1]}:${destLon},${destLat}`,
      });

      const geoJson = routeData.toGeoJson();

      map.addSource("route", {
        type: "geojson",
        data: geoJson,
      });

      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#4a90e2",
          "line-width": 6,
        },
      });
    } catch (error) {
      console.error("Error fetching route:", error.message);
    }
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
        {isSearchResultsVisible && (
          <div className="w-full overflow-y-scroll bg-transparent shadow-lg max-h-[85vh]">
            {locations.map((location, index) => (
              <div
                key={index}
                onClick={() => drawRoute(location.lat, location.lon)}
                className="p-2 mb-6 bg-white border-b border-gray-300 rounded-md cursor-pointer hover:bg-gray-100"
              >
                <p className="font-semibold">{location.display_name}</p>
                <p className="text-sm text-gray-600">{location.address}</p>
                <p className="text-xs text-gray-500">
                  Distance: {location.distance} km
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div id="map" className="w-full h-full" />
    </div>
  );
};

export default Map;
