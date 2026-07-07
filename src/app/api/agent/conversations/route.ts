import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, unauthorizedResponse, serverErrorResponse } from '@/lib/auth';
import { getUserConversations } from '@/lib/agent-store';

// ---------------------------------------------------------------------------
// GET /api/agent/conversations
// Returns the authenticated user's conversation history (summary list).
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    // 1. Verify auth
    const tokenPayload = await verifyToken(request);
    if (!tokenPayload) {
      return unauthorizedResponse();
    }

    // 2. Retrieve all conversations for this user
    const conversations = getUserConversations(tokenPayload.userId);

    return NextResponse.json({
      conversations,
      total: conversations.length,
    });
  } catch (error) {
    console.error('Conversations list error:', error);
    return serverErrorResponse('Failed to retrieve conversations');
  }
}