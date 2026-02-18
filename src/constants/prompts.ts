export const IMAGE_EXTRACT_PROMPT = `Extract the text from the image. Be very detailed and specific. Also have tags for the image.

### **Format the response in the following JSON format:**
\`\`\`
{
  "desc": "a short description of the image under 200 words",
  "tags": ["tag1", "tag2", "tag3"]
}
\`\`\`

### **Do not include any backticks or code blocks or any other formatting.**

- **correct json syntax**:

{
  "desc": "a short description of the image under 200 words",
  "tags": ["tag1", "tag2", "tag3"]
}

- **incorrect json syntax**:

\`\`\`json
{
  "desc": "The text from the image",
  "tags": ["tag1", "tag2", "tag3"]
}
\`\`\`
`;
