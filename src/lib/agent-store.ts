// ---------------------------------------------------------------------------
// Shared in-memory conversation store for the AI agent
// ---------------------------------------------------------------------------
// This module provides a singleton store accessible from any route handler.

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ToolResult {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

const MAX_MESSAGES = 20;
const MAX_CONVERSATIONS_PER_USER = 50;

// Use globalThis to survive HMR in development
const CONVERSATIONS_KEY = '__onboardai_conversations__';
const USER_CONVO_IDS_KEY = '__onboardai_user_conversation_ids__';

function getConversationMap(): Map<string, Conversation> {
  if (!(globalThis as Record<string, unknown>)[CONVERSATIONS_KEY]) {
    (globalThis as Record<string, unknown>)[CONVERSATIONS_KEY] = new Map<string, Conversation>();
  }
  return (globalThis as Record<string, unknown>)[CONVERSATIONS_KEY] as Map<string, Conversation>;
}

function getUserConversationIdsMap(): Map<string, string[]> {
  if (!(globalThis as Record<string, unknown>)[USER_CONVO_IDS_KEY]) {
    (globalThis as Record<string, unknown>)[USER_CONVO_IDS_KEY] = new Map<string, string[]>();
  }
  return (globalThis as Record<string, unknown>)[USER_CONVO_IDS_KEY] as Map<string, string[]>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get or create a conversation for the given user.
 * If conversationId is provided and belongs to the user, return it.
 * Otherwise, create a new one.
 */
export function getOrCreateConversation(
  userId: string,
  conversationId?: string,
): { conversation: Conversation; isNew: boolean } {
  const conversations = getConversationMap();

  if (conversationId) {
    const existing = conversations.get(conversationId);
    if (existing && existing.userId === userId) {
      return { conversation: existing, isNew: false };
    }
  }

  // Create a new conversation
  const id = crypto.randomUUID();
  const conversation: Conversation = {
    id,
    userId,
    title: 'New Conversation',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  conversations.set(id, conversation);

  // Track by user
  const userConvoIds = getUserConversationIdsMap();
  const userConvs = userConvoIds.get(userId) || [];
  userConvs.unshift(id);

  // Limit conversations per user
  if (userConvs.length > MAX_CONVERSATIONS_PER_USER) {
    const removed = userConvs.splice(MAX_CONVERSATIONS_PER_USER);
    for (const rId of removed) {
      conversations.delete(rId);
    }
  }

  userConvoIds.set(userId, userConvs);
  return { conversation, isNew: true };
}

/**
 * Add a message to a conversation. Trims to MAX_MESSAGES.
 */
export function addConversationMessage(
  conversation: Conversation,
  role: 'user' | 'assistant' | 'system',
  content: string,
) {
  conversation.messages.push({ role, content, timestamp: Date.now() });

  if (conversation.messages.length > MAX_MESSAGES) {
    conversation.messages = conversation.messages.slice(-MAX_MESSAGES);
  }

  conversation.updatedAt = Date.now();
}

/**
 * Build message history for LLM consumption.
 */
export function buildMessageHistory(
  conversation: Conversation,
): { role: string; content: string }[] {
  return conversation.messages.map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Get all conversations for a given user (summary view).
 */
export function getUserConversations(
  userId: string,
): Array<{
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
  lastMessageAt: string;
}> {
  const userConvoIds = getUserConversationIdsMap();
  const conversationIds = userConvoIds.get(userId) || [];
  const conversations = getConversationMap();

  const result: Array<{
    id: string;
    title: string;
    createdAt: string;
    messageCount: number;
    lastMessageAt: string;
  }> = [];

  for (const convId of conversationIds) {
    const conv = conversations.get(convId);
    if (!conv || conv.userId !== userId) continue;

    result.push({
      id: conv.id,
      title: conv.title,
      createdAt: new Date(conv.createdAt).toISOString(),
      messageCount: conv.messages.filter((m) => m.role !== 'system').length,
      lastMessageAt: new Date(conv.updatedAt).toISOString(),
    });
  }

  result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  return result;
}

/**
 * Delete a conversation.
 */
export function deleteConversation(conversationId: string, userId: string): boolean {
  const conversations = getConversationMap();
  const conv = conversations.get(conversationId);
  if (!conv || conv.userId !== userId) return false;

  conversations.delete(conversationId);

  const userConvoIds = getUserConversationIdsMap();
  const userConvs = userConvoIds.get(userId) || [];
  const idx = userConvs.indexOf(conversationId);
  if (idx >= 0) userConvs.splice(idx, 1);

  return true;
}