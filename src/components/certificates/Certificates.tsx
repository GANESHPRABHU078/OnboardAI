'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
  Sparkles,
  Calendar,
  Shield,
  FileCheck,
  Printer,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Certificate, Employee } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ============ Config ============
const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string; borderColor: string }> = {
  pending: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10', label: 'Pending Approval', borderColor: 'border-amber-500/30' },
  approved: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10', label: 'Approved', borderColor: 'border-emerald-500/30' },
  rejected: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/10', label: 'Rejected', borderColor: 'border-red-500/30' },
};

// ============ Main Component ============
export default function Certificates() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [genEmployee, setGenEmployee] = useState('');
  const [genTitle, setGenTitle] = useState('');
  const [genDescription, setGenDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    loadCertificates();
    loadEmployees();
  }, []);

  async function loadCertificates() {
    setLoading(true);
    try {
      const res: any = await api.certificates.list();
      const list = res.certificates || res.data || res;
      if (Array.isArray(list)) setCertificates(list);
    } catch {
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const res: any = await api.employees.list({ page: '1', limit: '50' });
      const list = res.employees || res.data || res;
      if (Array.isArray(list)) setEmployees(list);
    } catch {
      setEmployees([]);
    }
  }

  async function handleGenerate() {
    if (!genEmployee || !genTitle) {
      toast.error('Please select an employee and enter a title');
      return;
    }
    setGenerating(true);
    try {
      await api.certificates.generate({
        employeeId: genEmployee,
        title: genTitle,
        description: genDescription || `Certificate of completion for ${genTitle}`,
      });
      toast.success('Certificate generated successfully!');
      setShowGenerate(false);
      setGenEmployee('');
      setGenTitle('');
      setGenDescription('');
      loadCertificates();
    } catch {
      toast.error('Failed to generate certificate');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(id: string) {
    setApprovingId(id);
    try {
      await api.certificates.approve(id);
      toast.success('Certificate approved');
      setCertificates(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' as const, approvedBy: user?.name, approvedAt: new Date().toISOString() } : c));
      if (selectedCert?.id === id) {
        setSelectedCert(prev => prev ? { ...prev, status: 'approved', approvedBy: user?.name, approvedAt: new Date().toISOString() } : null);
      }
    } catch {
      toast.error('Failed to approve certificate');
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(id: string) {
    setApprovingId(id);
    try {
      await api.certificates.reject(id);
      toast.info('Certificate rejected');
      setCertificates(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' as const } : c));
      if (selectedCert?.id === id) {
        setSelectedCert(prev => prev ? { ...prev, status: 'rejected' } : null);
      }
    } catch {
      toast.error('Failed to reject certificate');
    } finally {
      setApprovingId(null);
    }
  }

  function handlePrint() {
    const el = document.getElementById('certificate-design');
    if (!el) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f8fafc; }
            @media print { body { background: white; } }
          </style>
        </head>
        <body>${el.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  const isAdminOrHr = user?.role === 'admin' || user?.role === 'hr';
  const pendingCount = certificates.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Certificates</h2>
          <p className="text-sm text-muted-foreground">
            {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} total
            {pendingCount > 0 && <span className="text-amber-500 ml-1">· {pendingCount} pending</span>}
          </p>
        </div>
        {(isAdminOrHr || user?.role === 'employee') && (
          <Button onClick={() => setShowGenerate(true)} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Generate Certificate
          </Button>
        )}
      </div>

      {/* Certificate List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-2 border-border/50">
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Award className="h-8 w-8 text-emerald-500/50" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Certificates</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">Generate certificates for employees who have completed their onboarding programs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {certificates.map((cert, i) => {
              const config = statusConfig[cert.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-md transition-all group overflow-hidden h-full">
                    {/* Certificate preview header */}
                    <div className={`h-28 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 flex items-center justify-center relative ${config.borderColor} border-b-2`}>
                      <Award className="h-14 w-14 text-emerald-500/20" />
                      <Badge className={`absolute top-3 right-3 text-xs ${config.bgColor} ${config.color} border-0 rounded-lg`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{cert.title}</h3>
                      {cert.employee && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {cert.employee.firstName} {cert.employee.lastName}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>Issued {format(new Date(cert.issuedAt), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1 rounded-xl h-8" onClick={() => setSelectedCert(cert)}>
                          <Eye className="h-3.5 w-3.5 mr-1" />View
                        </Button>
                        {isAdminOrHr && cert.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="rounded-xl h-8 bg-emerald-500 hover:bg-emerald-600 text-white"
                              onClick={() => handleApprove(cert.id)}
                              disabled={approvingId === cert.id}
                            >
                              {approvingId === cert.id ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleReject(cert.id)}
                              disabled={approvingId === cert.id}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Certificate Detail Dialog */}
      <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-0" showCloseButton={false}>
          {selectedCert && (
            <CertificateDesign
              cert={selectedCert}
              onClose={() => setSelectedCert(null)}
              onApprove={handleApprove}
              onReject={handleReject}
              onPrint={handlePrint}
              canApprove={isAdminOrHr}
              isApproving={approvingId === selectedCert.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Certificate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Generate Certificate</DialogTitle>
            <DialogDescription>Create a new certificate of completion for an employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select value={genEmployee} onValueChange={setGenEmployee}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} — {e.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-title">Certificate Title</Label>
              <Input
                id="cert-title"
                value={genTitle}
                onChange={(e) => setGenTitle(e.target.value)}
                placeholder="e.g., Senior Engineer Onboarding Completion"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-desc">Description</Label>
              <Textarea
                id="cert-desc"
                value={genDescription}
                onChange={(e) => setGenDescription(e.target.value)}
                placeholder="Brief description of the achievement..."
                className="rounded-xl"
                rows={3}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowGenerate(false)}>Cancel</Button>
              <Button
                onClick={handleGenerate}
                disabled={generating || !genEmployee || !genTitle}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {generating ? (
                  <><Loader className="h-4 w-4 mr-1.5 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-1.5" />Generate Certificate</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Loader helper ============
function Loader({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ============ Certificate Design ============
function CertificateDesign({
  cert,
  onClose,
  onApprove,
  onReject,
  onPrint,
  canApprove,
  isApproving,
}: {
  cert: Certificate;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPrint: () => void;
  canApprove: boolean;
  isApproving: boolean;
}) {
  const config = statusConfig[cert.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const fullName = cert.employee
    ? `${cert.employee.firstName} ${cert.employee.lastName}`
    : 'Unknown Employee';

  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${config.bgColor} ${config.color} border-0 rounded-lg`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onPrint}>
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Certificate body */}
      <div id="certificate-design" className="p-6 sm:p-8">
        <div className="relative border-2 border-emerald-500/40 rounded-2xl p-6 sm:p-10 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30 dark:from-gray-900 dark:via-emerald-950/20 dark:to-teal-950/20">
          {/* Inner border decoration */}
          <div className="absolute inset-2 border border-emerald-500/15 rounded-xl pointer-events-none" />

          {/* Corner ornaments */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-emerald-400/40 rounded-tl-md" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-400/40 rounded-tr-md" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-md" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-400/40 rounded-br-md" />

          <div className="text-center space-y-5 relative">
            {/* Logo & Brand */}
            <div className="flex items-center justify-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/20">
                AI
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight">OnboardAI</span>
                <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Enterprise Platform</p>
              </div>
            </div>

            <Separator className="max-w-[240px] mx-auto bg-emerald-500/20" />

            {/* Title */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 font-medium">
                Certificate of Completion
              </p>
              <h2 className="text-xl sm:text-2xl font-bold mt-2 leading-tight">
                {cert.title}
              </h2>
            </div>

            <div className="py-2">
              <p className="text-sm text-muted-foreground italic">This certifies that</p>
              <h3 className="text-2xl sm:text-3xl font-bold mt-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {fullName}
              </h3>
            </div>

            {cert.description && (
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {cert.description}
              </p>
            )}

            {/* Info grid */}
            <div className="flex items-center justify-center gap-4 sm:gap-8 pt-3">
              <div className="text-center">
                <Calendar className="h-4 w-4 mx-auto mb-1.5 text-emerald-500" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Issued</p>
                <p className="text-sm font-medium mt-0.5">{format(new Date(cert.issuedAt), 'MMM d, yyyy')}</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <Shield className="h-4 w-4 mx-auto mb-1.5 text-emerald-500" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Certificate ID</p>
                <p className="text-sm font-mono mt-0.5">{cert.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <StatusIcon className={`h-4 w-4 mx-auto mb-1.5 ${config.color}`} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
                <p className={`text-sm font-medium capitalize mt-0.5 ${config.color}`}>{cert.status}</p>
              </div>
            </div>

            {/* Signature line */}
            <div className="pt-4 flex items-center justify-center gap-2">
              <div className="w-32 border-b border-border/50" />
              <p className="text-[10px] text-muted-foreground">Authorized Signature</p>
              <div className="w-32 border-b border-border/50" />
            </div>

            {cert.approvedBy && (
              <p className="text-xs text-muted-foreground pt-1">
                Approved by <span className="font-medium text-foreground">{cert.approvedBy}</span>
                {cert.approvedAt && ` on ${format(new Date(cert.approvedAt), 'MMM d, yyyy')}`}
              </p>
            )}

            {/* Footer */}
            <div className="pt-3">
              <Separator className="max-w-[180px] mx-auto bg-emerald-500/10" />
              <p className="text-[10px] text-muted-foreground mt-2 tracking-wider uppercase">
                OnboardAI Enterprise Platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approve/Reject buttons for HR/Admin */}
      {canApprove && cert.status === 'pending' && (
        <div className="flex justify-center gap-3 p-4 border-t border-border/50">
          <Button
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-6"
            onClick={() => onApprove(cert.id)}
            disabled={isApproving}
          >
            {isApproving ? <Loader className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
            Approve Certificate
          </Button>
          <Button
            variant="outline"
            className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 px-6"
            onClick={() => onReject(cert.id)}
            disabled={isApproving}
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}