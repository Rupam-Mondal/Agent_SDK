export const getWeather = {
  name: "getWeather",
  description: "Get the current weather for a given city",

  async execute({ city }) {
    return {
      city,
      temperature: "31°C",
      condition: "Sunny",
      humidity: "68%",
    };
  },
};

export const calculator = {
  name: "calculator",
  description: "Perform basic mathematical calculations.",

  async execute({ expression }) {
    try {
      const result = Function(`"use strict"; return (${expression})()`);
      return {
        expression,
        result,
      };
    } catch {
      return {
        error: "Invalid mathematical expression.",
      };
    }
  },
};

export const currentTime = {
  name: "currentTime",
  description: "Get the current date and time.",

  async execute() {
    return {
      time: new Date().toLocaleString(),
    };
  },
};

export const searchWeb = {
  name: "searchWeb",
  description: "Search the web for information.",

  async execute({ query }) {
    return {
      query,
      results: [
        "Result 1",
        "Result 2",
        "Result 3",
      ],
    };
  },
};

export const generateUUID = {
  name: "generateUUID",
  description: "Generate a unique UUID.",

  async execute() {
    return {
      uuid: crypto.randomUUID(),
    };
  },
};