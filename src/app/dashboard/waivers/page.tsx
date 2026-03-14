'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  History,
  FileSignature,
} from 'lucide-react';
import { toast } from 'sonner';

interface WaiverTemplate {
  id: string;
  name: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  usage_count: number;
  signed_count: number;
}

interface WaiverRecord {
  id: string;
  booking_reference: string;
  guest_name: string;
  tour_name: string;
  template_name: string;
  status: 'pending' | 'signed' | 'expired';
  signed_at: string | null;
  created_at: string;
}

// Mock data
const mockTemplates: WaiverTemplate[] = [
  {
    id: '1',
    name: 'Standard Liability Waiver',
    content: `RELEASE AND WAIVER OF LIABILITY

I, the undersigned, hereby acknowledge that I have voluntarily chosen to participate in boat tour activities provided by TourPilot.

**Assumption of Risk**
I understand that boat tours and water activities involve inherent risks including but not limited to:
- Drowning or near-drowning
- Slipping on wet surfaces
- Weather-related hazards
- Equipment failure
- Physical exertion

**Release of Liability**
In consideration of being permitted to participate, I hereby release, waive, discharge, and covenant not to sue TourPilot, its officers, employees, and agents from any and all liability, claims, demands, actions, and causes of action whatsoever.

**Medical Acknowledgment**
I certify that I am in good physical condition and have no medical conditions that would prevent my participation.

**Emergency Contact Authorization**
I authorize TourPilot to seek emergency medical treatment on my behalf if necessary.

By signing below, I acknowledge that I have read, understood, and agree to all terms of this waiver.`,
    version: 3,
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-02-20T14:30:00Z',
    usage_count: 1250,
    signed_count: 1180,
  },
  {
    id: '2',
    name: 'Sunset Cruise Special Waiver',
    content: `SUNSET CRUISE WAIVER AND RELEASE

This waiver applies specifically to sunset cruise activities which may include:
- Extended time on water during twilight hours
- Alcohol consumption (21+ only with valid ID)
- Photography and media consent

I acknowledge the unique risks associated with evening water activities and agree to follow all safety instructions provided by the crew.

By signing, I confirm I am of legal drinking age if choosing to consume alcohol and will do so responsibly.`,
    version: 1,
    is_active: true,
    created_at: '2024-03-01T09:00:00Z',
    updated_at: '2024-03-01T09:00:00Z',
    usage_count: 340,
    signed_count: 338,
  },
  {
    id: '3',
    name: 'Minor Participant Waiver',
    content: `MINOR PARTICIPANT WAIVER AND PARENTAL CONSENT

This waiver must be signed by a parent or legal guardian for participants under 18 years of age.

I, as the parent/legal guardian, hereby grant permission for my minor child to participate in tour activities.

I understand that my child must:
- Wear a properly fitted life jacket at all times
- Follow all crew instructions
- Remain seated unless directed otherwise

I accept full responsibility for my child's actions and agree to all terms outlined in the standard liability waiver.`,
    version: 2,
    is_active: true,
    created_at: '2024-02-01T11:00:00Z',
    updated_at: '2024-02-15T16:00:00Z',
    usage_count: 420,
    signed_count: 415,
  },
  {
    id: '4',
    name: 'Photography Consent Form',
    content: `PHOTOGRAPHY AND MEDIA CONSENT

I hereby grant TourPilot permission to use photographs and videos taken during my tour for promotional and marketing purposes.

This includes use in:
- Social media posts
- Website content
- Advertising materials
- Press releases

I understand I will not receive compensation for such use and waive any claims related to image rights.`,
    version: 1,
    is_active: false,
    created_at: '2024-01-20T08:00:00Z',
    updated_at: '2024-01-20T08:00:00Z',
    usage_count: 0,
    signed_count: 0,
  },
];

const mockWaiverRecords: WaiverRecord[] = [
  {
    id: '1',
    booking_reference: 'BK-2024-001',
    guest_name: 'John Smith',
    tour_name: 'Sunset Sailing Tour',
    template_name: 'Standard Liability Waiver',
    status: 'signed',
    signed_at: '2024-03-12T14:30:00Z',
    created_at: '2024-03-10T09:00:00Z',
  },
  {
    id: '2',
    booking_reference: 'BK-2024-001',
    guest_name: 'Jane Smith',
    tour_name: 'Sunset Sailing Tour',
    template_name: 'Standard Liability Waiver',
    status: 'signed',
    signed_at: '2024-03-12T14:32:00Z',
    created_at: '2024-03-10T09:00:00Z',
  },
  {
    id: '3',
    booking_reference: 'BK-2024-002',
    guest_name: 'Mike Johnson',
    tour_name: 'Morning Dolphin Watch',
    template_name: 'Standard Liability Waiver',
    status: 'pending',
    signed_at: null,
    created_at: '2024-03-11T10:00:00Z',
  },
  {
    id: '4',
    booking_reference: 'BK-2024-003',
    guest_name: 'Sarah Williams',
    tour_name: 'Sunset Cruise',
    template_name: 'Sunset Cruise Special Waiver',
    status: 'pending',
    signed_at: null,
    created_at: '2024-03-12T08:00:00Z',
  },
  {
    id: '5',
    booking_reference: 'BK-2024-004',
    guest_name: 'Tommy Davis (Minor)',
    tour_name: 'Family Adventure Tour',
    template_name: 'Minor Participant Waiver',
    status: 'signed',
    signed_at: '2024-03-11T16:00:00Z',
    created_at: '2024-03-09T12:00:00Z',
  },
];

export default function WaiversPage() {
  const [templates, setTemplates] = useState<WaiverTemplate[]>(mockTemplates);
  const [waiverRecords] = useState<WaiverRecord[]>(mockWaiverRecords);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WaiverTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error('Please fill in all fields');
      return;
    }

    const template: WaiverTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      content: newTemplate.content,
      version: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
      signed_count: 0,
    };

    setTemplates([template, ...templates]);
    setNewTemplate({ name: '', content: '' });
    setIsCreateOpen(false);
    toast.success('Waiver template created');
  };

  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;

    setTemplates(templates.map(t =>
      t.id === selectedTemplate.id
        ? { ...selectedTemplate, version: t.version + 1, updated_at: new Date().toISOString() }
        : t
    ));
    setIsEditOpen(false);
    toast.success('Waiver template updated (new version created)');
  };

  const handleToggleActive = (id: string) => {
    setTemplates(templates.map(t =>
      t.id === id ? { ...t, is_active: !t.is_active } : t
    ));
    toast.success('Template status updated');
  };

  const handleDuplicate = (template: WaiverTemplate) => {
    const duplicate: WaiverTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      version: 1,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
      signed_count: 0,
    };
    setTemplates([duplicate, ...templates]);
    toast.success('Template duplicated');
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Signed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = waiverRecords.filter(w => w.status === 'pending').length;
  const signedCount = waiverRecords.filter(w => w.status === 'signed').length;
  const activeTemplates = templates.filter(t => t.is_active).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Waivers</h1>
          <p className="text-muted-foreground">Manage waiver templates and track signatures</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Waiver Template</DialogTitle>
              <DialogDescription>
                Create a new waiver template for guests to sign before their tour.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Standard Liability Waiver"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Waiver Content</Label>
                <p className="text-xs text-muted-foreground">
                  Use Markdown formatting: **bold**, *italic*, - bullet points
                </p>
                <Textarea
                  id="content"
                  placeholder="Enter the full waiver text..."
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTemplate}>Create Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Templates</p>
                <p className="text-2xl font-bold">{activeTemplates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Signatures</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Signed Today</p>
                <p className="text-2xl font-bold">{signedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <FileSignature className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Signatures</p>
                <p className="text-2xl font-bold">
                  {templates.reduce((acc, t) => acc + t.signed_count, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="signatures">
            Recent Signatures
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant="outline">v{template.version}</Badge>
                        {template.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <CardDescription>
                        Created {new Date(template.created_at).toLocaleDateString()} •
                        Updated {new Date(template.updated_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 mr-4">
                        <Label htmlFor={`active-${template.id}`} className="text-sm">Active</Label>
                        <Switch
                          id={`active-${template.id}`}
                          checked={template.is_active}
                          onCheckedChange={() => handleToggleActive(template.id)}
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedTemplate(template);
                            setIsPreviewOpen(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedTemplate(template);
                            setIsEditOpen(true);
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <History className="h-4 w-4 mr-2" />
                            Version History
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{template.usage_count.toLocaleString()} uses</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>{template.signed_count.toLocaleString()} signatures</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>
                        {template.usage_count > 0
                          ? Math.round((template.signed_count / template.usage_count) * 100)
                          : 0}% completion rate
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="signatures">
          <Card>
            <CardHeader>
              <CardTitle>Recent Waiver Activity</CardTitle>
              <CardDescription>Track waiver signatures across all bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Tour</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waiverRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">
                        {record.booking_reference}
                      </TableCell>
                      <TableCell className="font-medium">{record.guest_name}</TableCell>
                      <TableCell>{record.tour_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {record.template_name}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.signed_at
                          ? new Date(record.signed_at).toLocaleString()
                          : new Date(record.created_at).toLocaleDateString()
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Waiver
                            </DropdownMenuItem>
                            {record.status === 'pending' && (
                              <DropdownMenuItem>
                                <FileSignature className="h-4 w-4 mr-2" />
                                Resend Link
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Waiver Template</DialogTitle>
            <DialogDescription>
              Editing will create a new version. Existing signed waivers will reference the old version.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name</Label>
                <Input
                  id="edit-name"
                  value={selectedTemplate.name}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Waiver Content</Label>
                <Textarea
                  id="edit-content"
                  value={selectedTemplate.content}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, content: e.target.value })}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTemplate}>Save as New Version</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Version {selectedTemplate?.version} • Preview how this waiver appears to guests
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="prose prose-sm max-w-none bg-muted/50 p-6 rounded-lg whitespace-pre-wrap">
              {selectedTemplate?.content}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
