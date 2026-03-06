import { z } from "zod";

export const ImageExtractSchema = z.object({
  desc: z.string().describe("A short description of the image under 200 words"),
  tags: z.array(z.string()).describe("Relevant tags for the image"),
  color_palette: z.array(z.string()).describe("The color palette of the image in hex codes"),
});

export type ImageExtract = z.infer<typeof ImageExtractSchema>;

const IMAGE_SCHEMA_EXAMPLE: ImageExtract = {
  desc: "a short description of the image under 200 words",
  tags: ["tag1", "tag2", "tag3"],
  color_palette: ["#000000", "#FFFFFF"],
};

export const IMAGE_EXTRACT_PROMPT = `Extract the text from the image. Be very detailed and specific. Also have tags for the image.

### **Format the response in the following JSON format:**

${JSON.stringify(IMAGE_SCHEMA_EXAMPLE, null, 2)}

### **Do not include any backticks or code blocks or any other formatting.**

- **correct json syntax**:

${JSON.stringify(IMAGE_SCHEMA_EXAMPLE, null, 2)}

- **incorrect json syntax**:

\`\`\`json
${JSON.stringify(IMAGE_SCHEMA_EXAMPLE, null, 2)}
\`\`\`
`;
