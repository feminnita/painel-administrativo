import type { ColorInput } from "./types";

export function emptyColor(): ColorInput {
  return {
    name: "",
    image_url: "",
  };
}
