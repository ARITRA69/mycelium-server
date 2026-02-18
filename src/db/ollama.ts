import { Ollama } from "ollama";
import { env } from "@/constants/env";

export const ollama = new Ollama({
  host: env.ollama_url,
});
