/**
 * @typedef {Record<string, unknown>} JsonSchema
 */

/**
 * @typedef {'tool' | 'instruction'} AiSkillType
 */

/**
 * @typedef {'product' | 'general' | 'any'} AiSkillContextScope
 */

/**
 * @typedef {Object} AiSkillContext
 * @property {string} [userId]
 * @property {string} [conversationId]
 * @property {string | null} [productId]
 */

/**
 * @typedef {Object} AiSkillDefinition
 * @property {string} id
 * @property {string} name
 * @property {AiSkillType} type
 * @property {string} description
 * @property {JsonSchema | null} parameters
 * @property {string} instructions
 * @property {string} skillDir
 * @property {boolean} [auto]
 * @property {AiSkillContextScope} [context]
 * @property {((args: Record<string, unknown>, ctx: AiSkillContext) => Promise<unknown>) | null} execute
 */

/**
 * @typedef {Object} AiSkillCatalogItem
 * @property {string} name
 * @property {string} description
 * @property {AiSkillType} type
 */

/**
 * @typedef {Object} ActivatedSkillsContext
 * @property {AiSkillDefinition[]} skills
 * @property {ReturnType<import('./loader.js').toLlmTools>} tools
 * @property {string} instructionsPrompt
 */

export {};
