(() => {
  "use strict";

  // Character sets
  const CHARSETS = {
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lower: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.<>?/|~",
  };

  /**
   * Secure random integer in [0, maxExclusive)
   * Uses crypto.getRandomValues with rejection sampling to avoid modulo bias.
   */
  function secureRandomInt(maxExclusive) {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error("maxExclusive must be a positive integer");
    }

    const cryptoObj = window.crypto;
    if (!cryptoObj || !cryptoObj.getRandomValues) {
      // Fallback: not ideal, but keeps the UI working in very old browsers.
      return Math.floor(Math.random() * maxExclusive);
    }

    const uint32Max = 0xffffffff;
    const limit = uint32Max - (uint32Max % maxExclusive);

    const buffer = new Uint32Array(1);
    while (true) {
      cryptoObj.getRandomValues(buffer);
      const value = buffer[0];
      if (value < limit) return value % maxExclusive;
    }
  }

  function pickOne(str) {
    return str[secureRandomInt(str.length)];
  }

  function shuffleInPlace(array) {
    // Fisher–Yates shuffle (secure indices)
    for (let i = array.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function formatNow() {
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    });
    return formatter.format(new Date());
  }

  function weatherCodeToText(code) {
    // Open-Meteo weather codes: https://open-meteo.com/en/docs
    if (code === 0) return "Clear";
    if (code === 1) return "Mainly clear";
    if (code === 2) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if (code === 45 || code === 48) return "Fog";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
    if ([71, 73, 75, 77].includes(code)) return "Snow";
    if ([80, 81, 82].includes(code)) return "Rain showers";
    if ([85, 86].includes(code)) return "Snow showers";
    if (code === 95) return "Thunderstorm";
    if (code === 96 || code === 99) return "Thunderstorm (hail)";
    return "Unknown";
  }

  function startClock() {
    const dateTimeEl = document.getElementById("dateTime");
    if (!dateTimeEl) return;

    const tick = () => {
      dateTimeEl.textContent = formatNow();
    };

    tick();
    window.setInterval(tick, 1000);
  }

  function startWeather() {
    const weatherEl = document.getElementById("weatherText");
    if (!weatherEl) return;

    if (!navigator.geolocation) {
      weatherEl.textContent = "Weather unavailable (no geolocation)";
      return;
    }

    let lastCoords = null;

    async function fetchWeather(latitude, longitude) {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}` +
        `&longitude=${encodeURIComponent(longitude)}` +
        `&current=temperature_2m,weather_code,wind_speed_10m` +
        `&timezone=auto`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Weather request failed");
      const data = await res.json();

      const current = data.current;
      if (!current) throw new Error("Weather data missing");

      const temp = typeof current.temperature_2m === "number" ? current.temperature_2m : null;
      const code = typeof current.weather_code === "number" ? current.weather_code : null;

      const desc = code == null ? "Unknown" : weatherCodeToText(code);
      const tempText = temp == null ? "—" : `${Math.round(temp)}°C`;
      return `${tempText} • ${desc}`;
    }

    function updateFromCoords() {
      if (!lastCoords) return;
      weatherEl.textContent = "Updating weather…";
      fetchWeather(lastCoords.latitude, lastCoords.longitude)
        .then((text) => {
          weatherEl.textContent = text;
        })
        .catch(() => {
          weatherEl.textContent = "Weather unavailable";
        });
    }

    weatherEl.textContent = "Fetching location…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        updateFromCoords();
        // Refresh every 10 minutes
        window.setInterval(updateFromCoords, 10 * 60 * 1000);
      },
      (err) => {
        if (err && err.code === 1) weatherEl.textContent = "Weather needs location permission";
        else weatherEl.textContent = "Weather unavailable";
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      }
    );
  }

  function getSelectedOptions() {
    const upper = document.getElementById("optUpper").checked;
    const lower = document.getElementById("optLower").checked;
    const numbers = document.getElementById("optNumbers").checked;
    const symbols = document.getElementById("optSymbols").checked;

    return { upper, lower, numbers, symbols };
  }

  function buildPools(options) {
    const pools = [];

    if (options.upper) pools.push(CHARSETS.upper);
    if (options.lower) pools.push(CHARSETS.lower);
    if (options.numbers) pools.push(CHARSETS.numbers);
    if (options.symbols) pools.push(CHARSETS.symbols);
    return pools;
  }

  function showStatus(message, kind) {
    const el = document.getElementById("statusMsg");
    el.textContent = message || "";
    el.classList.remove("is-error", "is-success");
    if (kind === "error") el.classList.add("is-error");
    if (kind === "success") el.classList.add("is-success");
  }

  function setStrength(password, selectedPoolCount) {
    const strengthText = document.getElementById("strengthText");
    const strengthBar = document.getElementById("strengthBar");

    if (!password) {
      strengthText.textContent = "—";
      strengthBar.style.width = "0%";
      return;
    }

    // Simple heuristic: length + variety
    const lengthScore = Math.min(32, password.length) / 32; // 0..1
    const varietyScore = Math.min(4, selectedPoolCount) / 4; // 0..1

    const score = 0.55 * lengthScore + 0.45 * varietyScore; // 0..1

    let label = "Weak";
    if (score >= 0.7) label = "Strong";
    else if (score >= 0.45) label = "Medium";

    strengthText.textContent = label;
    strengthBar.style.width = `${Math.round(score * 100)}%`;
  }

  function generatePassword(length, options) {
    const pools = buildPools(options);

    if (pools.length === 0) {
      return { password: "", error: "Select at least one character option." };
    }

    if (length < pools.length) {
      // Should not happen with min length 4, but keep it safe.
      return {
        password: "",
        error: `Length must be at least ${pools.length} to include each selected type.`,
      };
    }

    // 1) Guarantee at least one from each selected pool
    const chars = pools.map((pool) => pickOne(pool));

    // 2) Fill remaining characters from the combined pool
    const combinedPool = pools.join("");
    if (!combinedPool) {
      return { password: "", error: "No characters available with current options." };
    }

    while (chars.length < length) {
      chars.push(pickOne(combinedPool));
    }

    // 3) Shuffle so the guaranteed characters aren't in a predictable position
    shuffleInPlace(chars);

    return { password: chars.join(""), error: "" };
  }

  async function copyToClipboard(text) {
    if (!text) return false;

    // Prefer Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through
      }
    }

    // Fallback for older browsers
    try {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.setAttribute("readonly", "");
      temp.style.position = "absolute";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(temp);
      return ok;
    } catch {
      return false;
    }
  }

  function wireUI() {
    const lengthSlider = document.getElementById("lengthSlider");
    const lengthValue = document.getElementById("lengthValue");
    const output = document.getElementById("passwordOutput");
    const generateBtn = document.getElementById("generateBtn");
    const copyBtn = document.getElementById("copyBtn");

    function readLength() {
      return Number.parseInt(lengthSlider.value, 10);
    }

    function updateLengthUI() {
      lengthValue.textContent = String(readLength());
    }

    function updateStrengthUI() {
      const options = getSelectedOptions();
      const poolCount = buildPools(options).length;
      setStrength(output.value, poolCount);
    }

    function doGenerate({ silent } = { silent: false }) {
      const length = readLength();
      const options = getSelectedOptions();

      const { password, error } = generatePassword(length, options);
      if (error) {
        output.value = "";
        setStrength("", 0);
        if (!silent) showStatus(error, "error");
        return;
      }

      output.value = password;
      showStatus("Password generated.", "success");
      updateStrengthUI();
    }

    // Initial UI state
    updateLengthUI();
    setStrength("", 0);

    // Slider updates
    lengthSlider.addEventListener("input", () => {
      updateLengthUI();
      // Auto-generate on length change
      doGenerate({ silent: true });
    });

    // Recompute strength when options change
    ["optUpper", "optLower", "optNumbers", "optSymbols"].forEach((id) => {
      document.getElementById(id).addEventListener("change", () => {
        // Clear old errors if the user is fixing options
        showStatus("", undefined);
        updateStrengthUI();
      });
    });

    generateBtn.addEventListener("click", () => doGenerate());

    copyBtn.addEventListener("click", async () => {
      const text = output.value;
      const ok = await copyToClipboard(text);

      if (!text) {
        showStatus("Generate a password first.", "error");
        return;
      }

      if (ok) {
        const original = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        showStatus("Copied to clipboard.", "success");
        setTimeout(() => {
          copyBtn.textContent = original;
        }, 900);
      } else {
        showStatus("Could not copy. Please copy manually.", "error");
      }
    });

    // Top bar widgets
    startClock();
    startWeather();
  }

  // Boot
  document.addEventListener("DOMContentLoaded", wireUI);
})();
