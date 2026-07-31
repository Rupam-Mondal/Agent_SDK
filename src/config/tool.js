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

export const randomJoke = {
  name: "randomJoke",
  description: "Get a random programming joke.",

  async execute() {
    const joke = await fetch(
      "https://official-joke-api.appspot.com/jokes/programming/random"
    ).then(res => res.json());

    return joke[0];
  }
};

export const predictGender = {
  name: "predictGender",
  description: "Predict gender from a first name.",

  async execute({ name }) {
    return await fetch(
      `https://api.genderize.io?name=${encodeURIComponent(name)}`
    ).then(res => res.json());
  }
};

export const predictAge = {
  name: "predictAge",
  description: "Predict a person's age from their first name.",

  async execute({ name }) {
    return await fetch(
      `https://api.agify.io?name=${encodeURIComponent(name)}`
    ).then(res => res.json());
  }
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