import { ClaudeHandOff, GeminiHandOff, OpenAIHandOff } from "./handoffAgents.js";

export class handOff {
  handOffarr = [];
  constructor() {}

  addHandOff(...objs) {
    for (const obj of objs) {
      if (obj.provider === "openai") {
        this.handOffarr.push(
          new OpenAIHandOff(obj.apiKey, obj.model, obj.systemInstructions),
        );
      }
      else if (obj.provider === "claude") {
        this.handOffarr.push(
          new ClaudeHandOff(
            obj.apiKey,
            obj.model,
            obj.systemInstructions,
          ),
        );
      } 
      else if (obj.provider === "gemini") {
        this.handOffarr.push(
          new GeminiHandOff(
            obj.apiKey,
            obj.model,
            obj.systemInstructions,
          ),
        );
      }
      else{
        throw new Error(
            `Unknown provider : ${obj.provider}`
        )
      }
    }

    return this;
  }

  getAll() {
    return this.handOffs;
  }

  run(query) {
    let response = query;
  }
}
