import { useEffect, useState } from 'react';
import { Input, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { Button, Empty, Loading } from '@shiguang/ui-taro';
import { useAuth } from '../../contexts/AuthContext';
import { useAiProductChat } from '../../hooks/useAiProductChat';
import './index.scss';

export default function AiChatPage() {
  const router = useRouter();
  const productId = router.params.productId ?? '';
  const productName = decodeURIComponent(router.params.productName ?? '商品');
  const { isLoggedIn } = useAuth();
  const [scrollIntoView, setScrollIntoView] = useState('');

  const requireLogin = () => {
    Taro.showToast({ title: '请先登录', icon: 'none' });
    Taro.switchTab({ url: '/pages/profile/index' });
  };

  const {
    conversationId,
    conversations,
    conversationsLoading,
    messages,
    input,
    setInput,
    status,
    streamingContent,
    toolStatus,
    errorMessage,
    creatingConversation,
    sendMessage,
    handleStop,
    handleRetry,
    handleNewChat,
    loadConversation,
  } = useAiProductChat({
    productId,
    isLoggedIn,
    onRequireLogin: requireLogin,
  });

  useEffect(() => {
    if (productName) {
      Taro.setNavigationBarTitle({ title: '问 AI' });
    }
  }, [productName]);

  useEffect(() => {
    setScrollIntoView(`msg-anchor-${Date.now()}`);
  }, [messages, streamingContent, toolStatus]);

  if (!productId) {
    return (
      <Empty
        title="缺少商品信息"
        action={
          <Button variant="primary" onClick={() => Taro.navigateBack()}>
            返回
          </Button>
        }
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <View className="ai-chat-page ai-chat-login safe-bottom">
        <Text className="ai-chat-login-title">登录后使用 AI 导购</Text>
        <Text className="ai-chat-login-desc">可询问关于「{productName}」的价格、特点与适用场景</Text>
        <Button variant="primary" onClick={requireLogin}>
          去登录
        </Button>
      </View>
    );
  }

  return (
    <View className="ai-chat-page">
      <View className="ai-chat-header">
        <Text className="ai-chat-subtitle">关于「{productName}」有什么想了解的？</Text>
        <View className="ai-chat-toolbar">
          <Text className="ai-chat-new" onClick={handleNewChat}>
            + 新对话
          </Text>
        </View>
      </View>

      {conversationsLoading ? (
        <View className="ai-chat-history">
          <Text className="ai-chat-subtitle">加载历史…</Text>
        </View>
      ) : conversations.length > 0 ? (
        <ScrollView className="ai-chat-history" scrollX enableFlex>
          {conversations.map((conversation) => (
            <Text
              key={conversation.conversationId}
              className={`ai-chat-history-item ${
                conversation.conversationId === conversationId ? 'ai-chat-history-item--active' : ''
              }`}
              onClick={() => void loadConversation(conversation.conversationId)}
            >
              {conversation.title}
            </Text>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        className="ai-chat-messages"
        scrollY
        scrollWithAnimation
        scrollIntoView={scrollIntoView}
      >
        <View className="ai-chat-message-list">
          {messages.length === 0 && !streamingContent && status !== 'streaming' && (
            <Empty
              title="开始提问吧"
              description={`例如：这款「${productName}」适合什么场景？`}
            />
          )}

          {messages.map((msg) => (
            <View
              key={msg.messageId}
              id={`msg-${msg.messageId}`}
              className={`ai-chat-bubble ai-chat-bubble--${msg.role === 'user' ? 'user' : 'assistant'}`}
            >
              <Text>{msg.content}</Text>
            </View>
          ))}

          {status === 'streaming' && toolStatus && !streamingContent ? (
            <View className="ai-chat-bubble ai-chat-bubble--assistant">
              <Text className="ai-chat-tool">{toolStatus}</Text>
            </View>
          ) : null}

          {status === 'streaming' && !streamingContent && !toolStatus ? (
            <View className="ai-chat-bubble ai-chat-bubble--assistant">
              <Text className="ai-chat-thinking">思考中…</Text>
            </View>
          ) : null}

          {streamingContent ? (
            <View className="ai-chat-bubble ai-chat-bubble--assistant">
              <Text>
                {streamingContent}
                <Text className="ai-chat-cursor">|</Text>
              </Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View className="ai-chat-error">
              <Text>{errorMessage}</Text>
              <Button variant="ghost" size="sm" onClick={() => void handleRetry()}>
                重试
              </Button>
            </View>
          ) : null}

          <View id="msg-anchor-bottom" />
        </View>
      </ScrollView>

      <View className="ai-chat-footer">
        <Input
          className="ai-chat-input"
          type="text"
          placeholder="输入你的问题…"
          value={input}
          disabled={status === 'streaming'}
          confirmType="send"
          onInput={(e) => setInput(e.detail.value)}
          onConfirm={() => void sendMessage(input)}
        />
        {status === 'streaming' ? (
          <Button variant="secondary" size="sm" onClick={handleStop}>
            停止
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            loading={creatingConversation}
            disabled={!input.trim()}
            onClick={() => void sendMessage(input)}
          >
            发送
          </Button>
        )}
      </View>
    </View>
  );
}
