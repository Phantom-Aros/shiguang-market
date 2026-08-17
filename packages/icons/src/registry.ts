/**
 * 语义化图标注册表
 *
 * 换图标：只改此处的 Iconify ID，无需手抄 SVG path。
 * 图标集：https://icon-sets.iconify.design/mdi-light/
 *
 * mdi-light 为单线稿风格，无 -outline 变体；激活态可用 filled 指向另一图标（如 heart / heart-off）。
 * 改完后运行：npm run generate --workspace=@shiguang/icons
 */
export const ICON_REGISTRY = {
  heart: { filled: 'mdi-light:heart', outline: 'mdi-light:heart' },
  star: { filled: 'mdi-light:star', outline: 'mdi-light:star' },
  cart: { filled: 'mdi-light:cart', outline: 'mdi-light:cart' },
  search: { filled: 'mdi-light:magnify', outline: 'mdi-light:magnify' },
  close: { filled: 'mdi-light:cancel', outline: 'mdi-light:cancel' },
  chevronRight: { filled: 'mdi-light:chevron-right', outline: 'mdi-light:chevron-right' },
  user: { filled: 'mdi-light:account', outline: 'mdi-light:account' },
  image: { filled: 'mdi-light:image', outline: 'mdi-light:image' },
  clock: { filled: 'mdi-light:clock', outline: 'mdi-light:clock' },
  upload: { filled: 'mdi-light:upload', outline: 'mdi-light:upload' },
  home: { filled: 'mdi-light:home', outline: 'mdi-light:home' },
  order: { filled: 'mdi-light:clipboard-text', outline: 'mdi-light:clipboard-text' },
  share: { filled: 'mdi-light:share-variant', outline: 'mdi-light:share-variant' },
  discover: { filled: 'mdi-light:home', outline: 'mdi-light:home' },
} as const;

export type SemanticIconName = keyof typeof ICON_REGISTRY;

export function getIconifyId(name: SemanticIconName, options?: { filled?: boolean }): string {
  const entry = ICON_REGISTRY[name];
  return options?.filled ? entry.filled : entry.outline;
}
