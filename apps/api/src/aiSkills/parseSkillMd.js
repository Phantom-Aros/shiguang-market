/**
 * 解析 skill.md：YAML frontmatter + Markdown 正文
 * @param {string} content
 * @returns {{ meta: Record<string, string | boolean>; instructions: string }}
 */
export function parseSkillMd(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Invalid skill.md: missing YAML frontmatter');
  }

  const meta = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();

    if (rawValue === 'true') meta[key] = true;
    else if (rawValue === 'false') meta[key] = false;
    else meta[key] = rawValue;
  }

  return {
    meta,
    instructions: match[2].trim(),
  };
}
