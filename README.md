# Pilot AI SDK

Build AI agents with tools, web search, website analysis, reasoning loops, and
multi-provider handoffs.

```bash
npm install pilot-ai-sdk
```

## Basic agent

```js
import { Agent } from "pilot-ai-sdk";

const model = "your-model-name";
const agent = new Agent(model, process.env.OPEN_AI_API_KEY);

const answer = await agent
  .setInstructions("Explain JavaScript promises in simple words.")
  .run();

console.log(answer);
```

## Agent methods

| Method | Use |
| --- | --- |
| `setInstructions(text)` | Set the prompt for `run()`. |
| `run()` | Get a normal AI response. |
| `liveDataQueryRun(query, tavilyKey)` | Search the web and answer from live results. |
| `setLoop(number)` | Set the number of reasoning steps. |
| `runLoop(query)` | Run step-by-step reasoning for a query. |
| `webScrap(url)` | Read a website and return an AI-generated analysis. |
| `addTools(...tools)` | Add tools to the agent. |
| `useTool(query)` | Let the agent select and use a tool. |

## Handoff agents

A handoff lets you pass one request through one or more specialist agents. Add
the agents in the order they should work:

1. The first agent receives the user's query.
2. Every following agent receives the original query and the previous agent's
   response, then improves or continues it according to its system instruction.
3. `run()` returns the final agent's response.

Each handoff agent can use OpenAI, Claude, or Gemini. Supply the API key for
the provider used by that agent—there is no need to use the same provider or
key for every agent.

### Create a handoff

```js
import "dotenv/config";
import { handOff } from "pilot-ai-sdk";

const agents = new handOff();

agents.addHandOff({
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: process.env.OPEN_AI_API_KEY,
  systemInstructions: "You are a helpful travel-planning assistant.",
});

const answer = await agents.run("Plan a five-day trip to Goa.");

console.log(answer);
```

`addHandOff()` accepts one or more agent objects. Each object must use this
format:

```js
{
  provider: "openai", // "openai", "claude", or "gemini"
  model: "provider-model-name",
  apiKey: process.env.PROVIDER_API_KEY,
  systemInstructions: "Describe the agent's specialty and response limits.",
}
```

| Field | Required | Description |
| --- | --- | --- |
| `provider` | Yes | One of `openai`, `claude`, or `gemini` (lowercase). |
| `model` | Yes | A model name available through that provider and API key. |
| `apiKey` | Yes | The API key for that specific provider. |
| `systemInstructions` | Yes | The role, scope, and rules the agent must follow. |

### Use OpenAI, Claude, and Gemini

Choose the provider per agent. For example, this workflow uses an OpenAI agent
for the itinerary and a Claude agent for the budget review. The second agent
sees both the Goa request and the first agent's itinerary.

```js
import "dotenv/config";
import { handOff } from "pilot-ai-sdk";

const goaWorkflow = new handOff().addHandOff(
  {
    provider: "openai",
    model: "gpt-4o-mini",
    apiKey: process.env.OPEN_AI_API_KEY,
    systemInstructions:
      "You are a travel planner. Create a practical five-day Goa itinerary.",
  },
  {
    provider: "claude",
    model: "your-claude-model-name",
    apiKey: process.env.ANTHROPIC_API_KEY,
    systemInstructions:
      "You are a travel-budget expert. Review the itinerary and provide costs only.",
  },
  {
    provider: "gemini",
    model: "your-gemini-model-name",
    apiKey: process.env.GEMINI_API_KEY,
    systemInstructions:
      "You are a finance editor. Make the Goa budget clear, realistic, and concise.",
  },
);

const answer = await goaWorkflow.run("Give me a five-day plan for Goa.");

console.log(answer);
```

Use only the providers you have API keys for. For example, if you only have an
OpenAI key, add only agents whose `provider` is `"openai"`.

### System instructions: keep an agent in its specialty

`systemInstructions` define the agent's role. They can limit what the agent
answers, not just describe its expertise. For a Goa trip, a financial-expert
instruction makes the agent answer the money-related part of the request,
such as hotel, transport, food, activity, and total costs—not a general
sightseeing plan.

```js
import "dotenv/config";
import { handOff } from "pilot-ai-sdk";

const goaFinanceAgent = new handOff().addHandOff({
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: process.env.OPEN_AI_API_KEY,
  systemInstructions: `
    You are a financial expert for Goa travel.
    Answer only the financial aspects of a five-day Goa journey.
    Include estimated hotel, transport, food, activities, and total costs.
    State the currency and assumptions. Do not provide a sightseeing itinerary.
  `,
});

const answer = await goaFinanceAgent.run(
  "Give me a five-day plan for Goa for two people.",
);

console.log(answer);
```

This agent should return a Goa budget and cost breakdown. If you need a full
travel plan as well, add a travel-planner agent before the finance agent.

## Web search

Use a Tavily API key for live web results.

```js
import { Agent } from "pilot-ai-sdk";

const model = "your-model-name";
const agent = new Agent(model, process.env.OPEN_AI_API_KEY);

const answer = await agent.liveDataQueryRun(
  "What are the latest AI news?",
  process.env.TAVILY_API_KEY,
);

console.log(answer);
```

## Website analysis

```js
import { Agent } from "pilot-ai-sdk";

const model = "your-model-name";
const agent = new Agent(model, process.env.OPEN_AI_API_KEY);
const result = await agent.webScrap("https://example.com");

console.log(result);
```

## Reasoning loop

```js
import { Agent } from "pilot-ai-sdk";

const model = "your-model-name";
const agent = new Agent(model, process.env.OPEN_AI_API_KEY);

const result = await agent
  .setLoop(10)
  .runLoop("Create a simple plan to learn React in 30 days");

console.log(result);
```

## Add your own tools

The SDK does not provide built-in tools. The functions in its internal `tool.js`
file are only used for development/testing and should not be imported or relied
on by your application.

Pass your own tool object to `addTools()`. Every tool must follow this format:

```js
const myTool = {
  name: "toolName",
  description: "Explain clearly what this tool does and the inputs it needs.",

  async execute({ /* arguments selected by the agent */ }) {
    // Perform your application-specific work here.
    return { /* result */ };
  },
};
```

`name` and `description` help the agent choose the right tool. `execute` must
be an async function that accepts an arguments object and returns the tool
result.

For example:

```js
import { Agent } from "pilot-ai-sdk";

const model = "your-model-name";
const wordCounter = {
  name: "wordCounter",
  description: "Count words in a text.",
  async execute({ text }) {
    return { count: text.trim().split(/\s+/).filter(Boolean).length };
  },
};

const agent = new Agent(model, process.env.OPEN_AI_API_KEY);

const result = await agent
  .addTools(wordCounter)
  .useTool("Count words in: Pilot AI SDK is easy to use");

console.log(result);
```
