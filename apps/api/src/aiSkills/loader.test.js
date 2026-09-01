import { afterEach, describe, expect, it } from 'vitest';
import {
  buildActivatedSkillPrompt,
  buildAutoActivatedInstructionsPrompt,
  buildSkillCatalogPrompt,
  clearSkillCache,
  getInstructionSkills,
  getSkillByName,
  getSkillCatalog,
  getToolSkills,
  loadSkills,
  prepareActivatedSkills,
  shouldAutoActivateInstruction,
  toLlmTools,
} from './registry.js';
import { parseSkillMd } from './parseSkillMd.js';

afterEach(() => {
  clearSkillCache();
});

describe('parseSkillMd', () => {
  it('parses frontmatter and instructions', () => {
    const { meta, instructions } = parseSkillMd(`---
name: demo_skill
description: Demo skill
enabled: true
---

# Demo

Use when testing.
`);

    expect(meta).toEqual({
      name: 'demo_skill',
      description: 'Demo skill',
      enabled: true,
    });
    expect(instructions).toContain('# Demo');
  });
});

describe('loadSkills', () => {
  it('loads tool skill with handler and parameters', async () => {
    const skills = await loadSkills();
    const skill = skills.find((item) => item.name === 'get_product_detail');

    expect(skill).toBeDefined();
    expect(skill?.type).toBe('tool');
    expect(skill?.parameters?.required).toEqual(['productId']);
    expect(typeof skill?.execute).toBe('function');
  });

  it('loads instruction-only skill with only skill.md', async () => {
    const skills = await loadSkills();
    const skill = skills.find((item) => item.name === 'product_answer_style');

    expect(skill).toBeDefined();
    expect(skill?.type).toBe('instruction');
    expect(skill?.parameters).toBeNull();
    expect(skill?.execute).toBeNull();
    expect(skill?.auto).toBe(true);
    expect(skill?.context).toBe('product');
  });

  it('finds skill by name', async () => {
    const skill = await getSkillByName('get_product_detail');
    expect(skill?.name).toBe('get_product_detail');
  });
});

describe('strategy C lazy loading', () => {
  it('builds catalog with name, description and type', async () => {
    const skills = await loadSkills();
    const catalog = getSkillCatalog(skills);
    const toolItem = catalog.find((entry) => entry.name === 'get_product_detail');
    const instructionItem = catalog.find((entry) => entry.name === 'product_answer_style');

    expect(toolItem).toEqual({
      name: 'get_product_detail',
      description: expect.stringContaining('查询商品实时详情'),
      type: 'tool',
    });
    expect(instructionItem?.type).toBe('instruction');
  });

  it('builds catalog prompt for system injection', async () => {
    const skills = await loadSkills();
    const prompt = buildSkillCatalogPrompt(skills);

    expect(prompt).toContain('【可用技能】');
    expect(prompt).toContain('get_product_detail（工具）');
    expect(prompt).toContain('product_answer_style（说明）');
    expect(prompt).not.toContain('# 查询商品详情');
  });

  it('tools include only tool skills', async () => {
    const skills = await loadSkills();
    const tools = toLlmTools(skills);

    expect(tools.some((item) => item.function.name === 'get_product_detail')).toBe(true);
    expect(tools.some((item) => item.function.name === 'product_answer_style')).toBe(false);
    expect(getToolSkills(skills)).toHaveLength(tools.length);
    expect(getInstructionSkills(skills).length).toBeGreaterThan(0);
  });

  it('auto-activates instruction skills by context', async () => {
    const skills = await loadSkills();
    const styleSkill = await getSkillByName('product_answer_style');

    expect(shouldAutoActivateInstruction(styleSkill, { productId: 'prod-1' })).toBe(true);
    expect(shouldAutoActivateInstruction(styleSkill, { productId: null })).toBe(true);

    const prompt = buildAutoActivatedInstructionsPrompt(skills, { productId: 'prod-1' });
    expect(prompt).toContain('【技能说明：product_answer_style】');
    expect(prompt).toContain('不要编造折扣');
  });

  it('prepares activated skills with instructions prompt and tools', async () => {
    const skills = await loadSkills();
    const skill = await getSkillByName('get_product_detail');
    const activated = prepareActivatedSkills(skills, ['get_product_detail']);

    expect(activated.skills).toHaveLength(1);
    expect(activated.tools).toHaveLength(1);
    expect(activated.instructionsPrompt).toBe(buildActivatedSkillPrompt(skill));
    expect(activated.instructionsPrompt).toContain('【技能说明：get_product_detail】');
    expect(activated.instructionsPrompt).toContain('仅基于工具返回的数据作答');
  });
});
