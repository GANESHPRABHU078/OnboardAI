import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, badRequestResponse, serverErrorResponse } from '@/lib/auth';

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function generateQueryEmbedding(query: string): number[] {
  const embedding: number[] = [];
  const words = query.toLowerCase().split(/\s+/);
  const wordSet = new Set(words);

  for (let i = 0; i < 128; i++) {
    const word = words[i % words.length] || '';
    const charCodes = [...word].map((c) => c.charCodeAt(0));
    const base = wordSet.has(word) ? 0.6 : 0.1;
    const variation = charCodes.reduce((sum, code) => sum + (code % 100) / 400, 0);
    embedding.push(Math.min(1, Math.max(-1, base + (i % 2 === 0 ? variation : -variation))));
  }
  return embedding;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyToken(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, handbookId, topK = 5 } = body;

    if (!query || query.trim().length === 0) {
      return badRequestResponse('Query is required');
    }

    const k = Math.min(Math.max(parseInt(String(topK)) || 5, 1), 20);

    const where: Record<string, unknown> = {
      handbook: { isActive: true },
    };
    if (handbookId) {
      where.handbookId = handbookId;
    }

    const embeddings = await db.embedding.findMany({
      where,
      include: {
        handbook: {
          select: { id: true, title: true, fileName: true },
        },
      },
      orderBy: { chunkIndex: 'asc' },
    });

    const queryEmbedding = generateQueryEmbedding(query);

    const scored = embeddings.map((emb) => {
      const embVector = JSON.parse(emb.embedding);
      const score = cosineSimilarity(queryEmbedding, embVector);
      return {
        content: emb.content,
        chunkIndex: emb.chunkIndex,
        score,
        handbook: emb.handbook,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, k).map((item) => ({
      content: item.content,
      chunkIndex: item.chunkIndex,
      relevanceScore: Math.round(item.score * 100) / 100,
      handbook: item.handbook,
    }));

    const combinedContext = results.map((r) => r.content).join('\n\n---\n\n');

    return NextResponse.json({
      query,
      results,
      context: combinedContext,
      totalChunks: embeddings.length,
    });
  } catch (error) {
    console.error('RAG search error:', error);
    return serverErrorResponse('Failed to search knowledge base');
  }
}