/** Root Joopo configuration Zod schema — the full `joopo.json` shape. */
export { JoopoSchema } from "../config/zod-schema.js";
export { validateJsonSchemaValue } from "../plugins/schema-validator.js";
export type { JsonSchemaObject } from "../shared/json-schema.types.js";
