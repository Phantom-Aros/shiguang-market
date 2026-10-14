/** 面向用户的工具业务分类，不暴露内部函数名 */
export type AiToolStatusCategory = 'product_detail';

/** 工具执行阶段 */
export type AiToolStatusPhase = 'started' | 'succeeded' | 'failed';

/** SSE tool_status 事件载荷 */
export interface AiToolStatusEventData {
  callId: string;
  category: AiToolStatusCategory;
  status: AiToolStatusPhase;
}

interface ActiveToolCall {
  category: AiToolStatusCategory;
  status: Exclude<AiToolStatusPhase, 'succeeded'>;
}

const TOOL_STATUS_LABELS: Record<
  AiToolStatusCategory,
  { started: string; failed: string }
> = {
  product_detail: {
    started: '正在查询商品信息…',
    failed: '暂时无法获取最新商品信息',
  },
};

/** 内部 tool 名 → 业务分类；后端可维护同名映射 */
export function mapToolNameToCategory(toolName: string): AiToolStatusCategory | null {
  if (toolName === 'get_product_detail') return 'product_detail';
  return null;
}

export function getToolStatusDisplayMessage(
  category: AiToolStatusCategory,
  status: Exclude<AiToolStatusPhase, 'succeeded'>,
): string {
  return TOOL_STATUS_LABELS[category][status];
}

function resolveToolStatusDisplay(activeCalls: Map<string, ActiveToolCall>): string | null {
  for (const call of activeCalls.values()) {
    if (call.status === 'started') {
      return getToolStatusDisplayMessage(call.category, 'started');
    }
  }

  for (const call of activeCalls.values()) {
    if (call.status === 'failed') {
      return getToolStatusDisplayMessage(call.category, 'failed');
    }
  }

  return null;
}

/** 跟踪并发 tool 调用，返回当前应展示的用户文案 */
export function createToolStatusTracker() {
  const activeCalls = new Map<string, ActiveToolCall>();

  return {
    apply(event: AiToolStatusEventData): string | null {
      if (event.status === 'succeeded') {
        activeCalls.delete(event.callId);
      } else {
        activeCalls.set(event.callId, {
          category: event.category,
          status: event.status,
        });
      }
      return resolveToolStatusDisplay(activeCalls);
    },
    reset() {
      activeCalls.clear();
    },
  };
}

export type ToolStatusTracker = ReturnType<typeof createToolStatusTracker>;
