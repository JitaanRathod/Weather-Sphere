# WeatherSphere

A sleek, modern weather dashboard built with vanilla JavaScript, HTML, and CSS. Provides live weather data, a 7-day forecast, and an interactive map.

### [Live Demo](https://JitaanRathod.github.io/Weather-Sphere/)

## Features

*   **Live Weather Data:** Get instant access to the current temperature, humidity, wind speed, pressure, and "feels like" temperature.
*   **City Search:** Find weather information for any city in the world.
*   **Interactive Map:** Click anywhere on the map (powered by Leaflet.js) to get the weather for that specific location.
*   **Geolocation:** Instantly fetch weather data for your current location with a single click.
*   **Hourly & 7-Day Forecast:** Plan your week with a detailed 7-day forecast and an hourly breakdown for the next 24 hours.
*   **Responsive Design:** A clean, modern UI that works beautifully on both desktop and mobile devices.
*   **Smart Caching:** API calls are cached to provide a faster experience and reduce redundant network requests.

## Tech Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript
*   **APIs:**
    *   [Open-Meteo](https://open-meteo.com/): For weather forecast data (no API key required).
    *   [OpenCage Geocoder](https://opencagedata.com/): For reverse geocoding (translating coordinates to a location name).
*   **Mapping:** [Leaflet.js](https://leafletjs.com/) with Stadia Maps tiles.

## Local Setup

To run this project on your local machine, follow these simple steps:

1.  **Clone the repository:**
    ```
    git clone https://github.com/JitaanRathod/Weather-Sphere.git
    ```

2.  **Navigate to the project directory:**
    ```
    cd Weather-Sphere
    ```

3.  **Open `index.html` in your browser:**
    Simply double-click the `index.html` file, or right-click and choose "Open with" your preferred web browser.

    > **Note:** For the best experience, it is recommended to serve the files using a local server. If you have VS Code, the **"Live Server"** extension is an excellent tool for this.
