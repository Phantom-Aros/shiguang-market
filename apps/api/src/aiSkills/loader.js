import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseSkillMd } from './parseSkillMd.js';

const SKILLS_ROOT = join(dirname(fileURLToPath(import.meta.url)), 'skills');

/** @type {import('./types.js').AiSkillDefinition[] | null} */
let cachedSkills = null;

/**
 * @param {Record<string, string | boolean>} meta
 * @param {string} skillDir
 * @returns {import('./types.js').AiSkillType}
 */
function resolveSkillType(meta, skillDir) {
  if (meta.type === 'instruction' || meta.type === 'tool') {
    return meta.type;
  }

  const hasHandler = existsSync(join(skillDir, 'handler.js'));
  const hasParameters = existsSync(join(skillDir, 'parameters.json'));

  if (hasHandler || hasParameters) {
    return 'tool';
  }

  return 'instruction';
}

/**
 * @param {Record<string, string | boolean>} meta
 * @returns {import('./types.js').AiSkillContextScope | undefined}
 */
function parseSkillContext(meta) {
  if (meta.context === 'product' || meta.context === 'general' || meta.context === 'any') {
    return meta.context;
  }
  return undefined;
}

/**
 * @param {import('./types.js').AiSkillDefinition[]} skills
 */
export function getToolSkills(skills) {
  return skills.filter((skill) => skill.type === 'tool');
}

/**
 * @param {import('./types.js').AiSkillDefinition[]} skills
 */
export function getInstructionSkills(skills) {
  return skills.filter((skill) => skill.type === 'instruction');
}

/**
 * @param {import('./types.js').AiSkillDefinition} skill
 * @param {import('./types.js').AiSkillContext} ctx
 */
export function shouldAutoActivateInstruction(skill, ctx) {
  if (skill.type !== 'instruction') return false;
  if (skill.auto === true) return true;
  if (skill.context === 'product' && ctx.productId) return true;
  if (skill.context === 'general' && !ctx.productId) return true;
  return false;
}

/**
 * @param {import('./types.js').AiSkillDefinition[]} skills
 * @param {import('./types.js').AiSkillContext} ctx
 */
export function buildAutoActivatedInstructionsPrompt(skills, ctx) {
  return skills
    .filter((skill) => shouldAutoActivateInstruction(skill, ctx))
    .map(buildActivatedSkillPrompt)
    .filter(Boolean)
    .join('\n\n');
}

/**
 * @param {import('./types.js').AiSkillDefinition} skill
 */
export function toLlmTool(skill) {
  if (skill.type !== 'tool' || !skill.parameters) {
    throw new Error(`Skill ${skill.name} is not a tool skill`);
  }

  return {
    type: 'function',
    function: {
      name: skill.name,
      description: skill.description,
      parameters: skill.parameters,
    },
  };
}

/**
 * @param {import('./types.js').AiSkillDefinition[]} skills
 */
export function toLlmTools(skills) {
  return getToolSkills(skills).map(toLlmTool);
}

/**
 * @param {import('./types.js').AiSkillDefinition[]} skills
 * @returns {import('./types.js').AiSkillCatalogItem[]}
 */
export function getSkillCatalog(skills) {
  return skills.map((skill) => ({
    name: skill.name,
    description: skill.description,
    type: skill.type,
  }));
}

/**
 * @param {import('./types.js').AiSkillDefinition[]} skills
 */
export function buildSkillCatalogPrompt(skills) {
  if (skills.length === 0) return '';

  const lines = skills.map((skill) => {
    const label = skill.type === 'instruction' ? '说明' : '工具';
    return `- ${skill.name}（${label}）: ${skill.description}`;
  });

  return [
    '【可用技能】',
    ...lines,
    '',
    '仅当需要最新价格、库存等实时数据时调用工具类技能；介绍性、场景类问题优先基于商品信息作答，必要时补充标注清楚的选购通识。',
    '调用工具时使用 function calling 机制，禁止在回复正文中输出 <tool_code>、print(...) 等伪代码或函数调用文本。',
    '工具执行完成后，用自然语言向用户说明查询结果。回答时遵守已激活的说明类技能约束。',
  ].join('\n');
}

/**
 * @param {import('./types.js').AiSkillDefinition} skill
 */
export function getSkillInstructions(skill) {
  return skill.instructions ?? '';
}

/**
 * @param {import('./types.js').AiSkillDefinition} skill
 */
export function buildActivatedSkillPrompt(skill) {
  const instructions = getSkillInstructions(skill);
  if (!instructions) return '';
  return `【技能说明：${skill.name}】\n${instructions}`;
}

/**
 * @param {import('./types.js').AiSkillDefinition[]} allSkills
 * @param {string[]} skillNames
 */
export function prepareActivatedSkills(allSkills, skillNames) {
  const selected = allSkills.filter((skill) => skillNames.includes(skill.name));

  const instructionsPrompt = selected
    .map(buildActivatedSkillPrompt)
    .filter(Boolean)
    .join('\n\n');

  return {
    skills: selected,
    tools: toLlmTools(selected),
    instructionsPrompt,
  };
}

/**
 * @param {string} skillDir
 */
async function loadSkillFromDir(skillDir) {
  const skillMdPath = join(skillDir, 'skill.md');
  if (!existsSync(skillMdPath)) {
    return null;
  }

  const { meta, instructions } = parseSkillMd(readFileSync(skillMdPath, 'utf8'));

  if (!meta.name || !meta.description) {
    throw new Error(`Invalid skill at ${skillDir}: name and description are required`);
  }

  if (meta.enabled === false) {
    return null;
  }

  const type = resolveSkillType(meta, skillDir);

  if (type === 'instruction') {
    return {
      id: meta.name,
      name: meta.name,
      type,
      description: meta.description,
      parameters: null,
      instructions,
      skillDir,
      auto: meta.auto === true,
      context: parseSkillContext(meta),
      execute: null,
    };
  }

  const parametersPath = join(skillDir, 'parameters.json');
  if (!existsSync(parametersPath)) {
    throw new Error(`Tool skill at ${skillDir}: parameters.json is required`);
  }

  const handlerPath = join(skillDir, 'handler.js');
  if (!existsSync(handlerPath)) {
    throw new Error(`Tool skill at ${skillDir}: handler.js is required`);
  }

  const parameters = JSON.parse(readFileSync(parametersPath, 'utf8'));
  const handlerModule = await import(pathToFileURL(handlerPath).href);
  if (typeof handlerModule.execute !== 'function') {
    throw new Error(`Tool skill at ${skillDir}: handler.js must export execute()`);
  }

  return {
    id: meta.name,
    name: meta.name,
    type,
    description: meta.description,
    parameters,
    instructions,
    skillDir,
    auto: meta.auto === true,
    context: parseSkillContext(meta),
    execute: handlerModule.execute,
  };
}

/**
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<import('./types.js').AiSkillDefinition[]>}
 */
export async function loadSkills(options = {}) {
  if (cachedSkills && !options.force) {
    return cachedSkills;
  }

  if (!existsSync(SKILLS_ROOT)) {
    cachedSkills = [];
    return cachedSkills;
  }

  const skills = [];

  for (const entry of readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const skill = await loadSkillFromDir(join(SKILLS_ROOT, entry.name));
    if (skill) {
      skills.push(skill);
    }
  }

  cachedSkills = skills;
  return skills;
}

/**
 * @param {string} name
 * @param {{ force?: boolean }} [options]
 */
export async function getSkillByName(name, options = {}) {
  const skills = await loadSkills(options);
  return skills.find((skill) => skill.name === name) ?? null;
}

/**
 * @param {import('./types.js').AiSkillDefinition} skill
 * @param {Record<string, unknown>} args
 * @param {import('./types.js').AiSkillContext} ctx
 */
export async function executeSkill(skill, args, ctx) {
  if (skill.type !== 'tool' || !skill.execute) {
    throw new Error(`Skill ${skill.name} is not executable`);
  }

  return skill.execute(args, ctx);
}

export function clearSkillCache() {
  cachedSkills = null;
}
