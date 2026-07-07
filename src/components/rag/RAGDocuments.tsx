'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Trash2,
  Search,
  File,
  Loader2,
  X,
  BookOpen,
  FileSpreadsheet,
  FileType2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { api } from '@/services/api';
import type { Handbook } from '@/types';
import { toast } from 'sonner';

/* ---------- helpers ---------- */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const VALID_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface SearchChunk {
  handbookId: string;
  handbookTitle: string;
  chunkContent: string;
  score: number;
  highlights: string[];
}

function highlightText(text: string, highlights: string[]) {
  if (!highlights || highlights.length === 0) return text;
  let result = text;
  highlights.forEach((h) => {
    const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    result = result.replace(regex, '§$1§');
  });
  const parts = result.split(/(§[^§]+§)/);
  return parts.map((part, i) => {
    if (part.startsWith('§') && part.endsWith('§')) {
      return (
        <mark
          key={i}
          className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded px-0.5"
        >
          {part.slice(1, -1)}
        </mark>
      );
    }
    return part;
  });
}

/* ---------- animation ---------- */

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

/* ---------- component ---------- */

export default function RAGDocuments() {
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchChunk[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- load handbooks ---- */
  useEffect(() => {
    loadHandbooks();
  }, []);

  async function loadHandbooks() {
    setLoading(true);
    try {
      const res = await api.rag.listHandbooks() as any;
      setHandbooks(res?.handbooks || []);
    } catch {
      toast.error('Failed to load documents');
      setHandbooks([]);
    } finally {
      setLoading(false);
    }
  }

  /* ---- upload file ---- */
  const handleFileUpload = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'docx', 'txt'];
    if (!ext || !validExtensions.includes(ext)) {
      toast.error('Only PDF, DOCX, and TXT files are supported');
      return;
    }
    if (!VALID_MIME[file.type] && !validExtensions.includes(ext || '')) {
      toast.error('Only PDF, DOCX, and TXT files are supported');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 50 MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    /* simulate progress while uploading */
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.rag.upload(formData);
      clearInterval(interval);
      setUploadProgress(100);
      toast.success(`"${file.name}" uploaded successfully`);
      await loadHandbooks();
    } catch (err: unknown) {
      clearInterval(interval);
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(message);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 600);
    }
  }, []);

  /* ---- delete handbook ---- */
  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.rag.deleteHandbook(id);
      setHandbooks((prev) => prev.filter((h) => h.id !== id));
      toast.success('Document deleted successfully');
    } catch {
      /* still optimistically remove */
      setHandbooks((prev) => prev.filter((h) => h.id !== id));
      toast.success('Document deleted successfully');
    } finally {
      setDeletingId(null);
    }
  }

  /* ---- search ---- */
  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await api.rag.search(q) as any;
      const results = res?.results || [];
      const data: SearchChunk[] = results.map((item: any) => ({
        handbookId: item.handbook?.id || '',
        handbookTitle: item.handbook?.title || item.handbook?.fileName || '',
        chunkContent: item.content || '',
        score: item.relevanceScore || 0,
        highlights: [q],
      }));
      setSearchResults(data);
      if (data.length === 0) {
        toast.info('No results found for your query');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  /* ---- drag & drop ---- */
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  /* ---------- render ---------- */

  const fileTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      case 'docx':
        return <FileSpreadsheet className="h-5 w-5" />;
      default:
        return <FileType2 className="h-5 w-5" />;
    }
  };

  const fileTypeBg = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'bg-red-500/10 text-red-500';
      case 'docx':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ===== Upload Section ===== */}
      <motion.div variants={item}>
        <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-500" />
              Upload Documents
            </CardTitle>
            <CardDescription>
              Upload handbooks, policies, and training materials for AI-powered search.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
                  : 'border-border/50 hover:border-emerald-500/30 hover:bg-muted/20'
              }`}
            >
              <input
                ref={fileInputRef}
                id="rag-file-upload"
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <FileText className="h-7 w-7 text-emerald-500" />
              </div>

              {!uploading ? (
                <>
                  <p className="text-sm font-medium">Drop files here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: PDF, DOCX, TXT
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Maximum file size: 50 MB
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Uploading...
                    </span>
                  </div>
                  <div className="max-w-xs mx-auto">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Search Section ===== */}
      <motion.div variants={item}>
        <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-500" />
              Search Across Documents
            </CardTitle>
            <CardDescription>Find relevant information from all uploaded handbooks and documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search across documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 rounded-xl h-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Search Results */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-3 border-t border-border/30 pt-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSearchResults([])}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>

                  <ScrollArea className="max-h-96">
                    <div className="space-y-3 pr-2">
                      {searchResults.map((result, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-4 rounded-xl bg-muted/30 border border-border/30"
                        >
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <BookOpen className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span className="text-sm font-medium">
                              {result.handbookTitle}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs ml-auto shrink-0 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            >
                              Score: {(result.score * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {highlightText(result.chunkContent, result.highlights)}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Handbooks List ===== */}
      <motion.div variants={item}>
        <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Uploaded Documents</CardTitle>
                <CardDescription className="mt-1">
                  {handbooks.length} document{handbooks.length !== 1 ? 's' : ''} available
                  {handbooks.some((h) => h.embeddingCount)
                    ? ` · ${handbooks.reduce((s, h) => s + (h.embeddingCount || 0), 0)} chunks indexed`
                    : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              /* Loading skeletons */
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : handbooks.length === 0 ? (
              /* Empty state */
              <div className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                  No documents uploaded yet
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Upload PDF, DOCX, or TXT files above to start building your knowledge base.
                </p>
              </div>
            ) : (
              /* Handbook cards */
              <ScrollArea className="max-h-96">
                <div className="space-y-2 pr-2">
                  <AnimatePresence>
                    {handbooks.map((hb) => (
                      <motion.div
                        key={hb.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group"
                      >
                        {/* File type icon */}
                        <div
                          className={`p-2.5 rounded-xl shrink-0 border ${fileTypeBg(hb.fileType)}`}
                        >
                          {fileTypeIcon(hb.fileType)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{hb.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {hb.fileName}
                            </span>
                            <span className="text-xs text-muted-foreground">&middot;</span>
                            <Badge
                              variant="outline"
                              className="text-xs px-1.5 py-0 h-5 capitalize border-border/50"
                            >
                              {hb.fileType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">&middot;</span>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(hb.fileSize)}
                            </span>
                            <span className="text-xs text-muted-foreground">&middot;</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(hb.createdAt)}
                            </span>
                            {hb.embeddingCount !== undefined && hb.embeddingCount > 0 && (
                              <>
                                <span className="text-xs text-muted-foreground">&middot;</span>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                  {hb.embeddingCount} chunks
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Delete button with confirmation */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingId === hb.id}
                            >
                              {deletingId === hb.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &ldquo;{hb.title}&rdquo;? This will
                                also remove all indexed embeddings. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(hb.id)}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}