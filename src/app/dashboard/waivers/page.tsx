'use client';

import { useState, useEffect } from 'react';
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
  FileSignature,
  Loader2,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useLocation } from '@/lib/location/context';

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
  booking_id: string;
  status: 'pending' | 'signed' | 'expired';
  signed_at: string | null;
  created_at: string;
  guest?: {
    first_name: string;
    last_name: string;
  };
  template?: {
    name: string;
  };
  booking?: {
    booking_reference: string;
    availability?: {
      tour?: {
        name: string;
      };
    };
  };
}

export default function WaiversPage() {
  const { selectedLocation } = useLocation();
  const [templates, setTemplates] = useState<WaiverTemplate[]>([]);
  const [waiverRecords, setWaiverRecords] = useState<WaiverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WaiverTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [newTemplate, setNewTemplate] = useState<{ name: string; content: string }>({
    name: '',
    content: '',
  });

  const supabase = createClient();

  // Load all data
  useEffect(() => {
    loadData();
  }, [selectedLocation]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTemplates(),
        loadWaiverRecords()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('waiver_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load waiver templates');
    }
  };

  const loadWaiverRecords = async () => {
    try {
      // Include tour's location_id in the query for filtering
      const { data, error } = await supabase
        .from('waivers')
        .select(`
          id,
          booking_id,
          status,
          signed_at,
          created_at,
          guest:booking_guests(first_name, last_name),
          template:waiver_templates(name),
          booking:bookings(
            booking_reference,
            availability:availabilities(
              tour:tours(name, location_id)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Transform and filter by location if selected
      let transformedData: WaiverRecord[] = (data || []).map((w: any) => ({
        id: w.id,
        booking_id: w.booking_id,
        status: w.status,
        signed_at: w.signed_at,
        created_at: w.created_at,
        guest: w.guest?.[0],
        template: w.template?.[0],
        booking: w.booking?.[0] ? {
          booking_reference: w.booking[0].booking_reference,
          availability: w.booking[0].availability?.[0] ? {
            tour: w.booking[0].availability[0].tour?.[0],
          } : undefined,
          _location_id: w.booking[0].availability?.[0]?.tour?.[0]?.location_id,
        } : undefined,
      }));

      // Filter by location if one is selected
      if (selectedLocation?.id) {
        transformedData = transformedData.filter(record =>
          (record.booking as any)?._location_id === selectedLocation.id
        );
      }

      // Limit to 50 after filtering
      setWaiverRecords(transformedData.slice(0, 50));
    } catch (error) {
      console.error('Error loading waiver records:', error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('waiver_templates')
        .insert({
          name: newTemplate.name,
          content: newTemplate.content,
          version: 1,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates([{ ...data, usage_count: 0, signed_count: 0 }, ...templates]);
      setNewTemplate({ name: '', content: '' });
      setIsCreateOpen(false);
      toast.success('Waiver template created', {
        description: 'Assign to tours from the Tours page'
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('waiver_templates')
        .update({
          name: selectedTemplate.name,
          content: selectedTemplate.content,
          version: selectedTemplate.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      setTemplates(templates.map(t =>
        t.id === selectedTemplate.id
          ? { ...selectedTemplate, version: t.version + 1, updated_at: new Date().toISOString() }
          : t
      ));
      setIsEditOpen(false);
      toast.success('Waiver template updated');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('waiver_templates')
        .update({ is_active: !currentValue })
        .eq('id', id);

      if (error) throw error;

      setTemplates(templates.map(t =>
        t.id === id ? { ...t, is_active: !t.is_active } : t
      ));
      toast.success('Template status updated');
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Failed to update template status');
    }
  };

  const handleDuplicate = async (template: WaiverTemplate) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('waiver_templates')
        .insert({
          name: `${template.name} (Copy)`,
          content: template.content,
          version: 1,
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates([{ ...data, usage_count: 0, signed_count: 0 }, ...templates]);
      toast.success('Template duplicated');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('waiver_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Template deleted');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Waivers</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {selectedLocation ? (
              <>
                <MapPin className="h-4 w-4" />
                {selectedLocation.name}
              </>
            ) : (
              "Manage waiver templates and track signatures"
            )}
          </p>
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
                  className="min-h-[250px] font-mono text-sm"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p>After creating this template, assign it to tours from the Tours page.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Template
              </Button>
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
                <p className="text-sm text-muted-foreground">Signed (Recent)</p>
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
                  {templates.reduce((acc, t) => acc + (t.signed_count || 0), 0).toLocaleString()}
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
          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No waiver templates yet</h3>
                <p className="text-muted-foreground mb-4">Create your first waiver template to get started.</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
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
                            onCheckedChange={() => handleToggleActive(template.id, template.is_active)}
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
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{(template.usage_count || 0).toLocaleString()} uses</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>{(template.signed_count || 0).toLocaleString()} signatures</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>
                          {(template.usage_count || 0) > 0
                            ? Math.round(((template.signed_count || 0) / template.usage_count) * 100)
                            : 0}% completion rate
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="signatures">
          <Card>
            <CardHeader>
              <CardTitle>Recent Waiver Activity</CardTitle>
              <CardDescription>Track waiver signatures across all bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {waiverRecords.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FileSignature className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No waiver records found</p>
                </div>
              ) : (
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
                          {record.booking?.booking_reference || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.guest ? `${record.guest.first_name} ${record.guest.last_name}` : '-'}
                        </TableCell>
                        <TableCell>
                          {record.booking?.availability?.tour?.name || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {record.template?.name || '-'}
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
              )}
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
                  className="min-h-[250px] font-mono text-sm"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p>Assign this waiver to tours from the Tours page.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUpdateTemplate}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save as New Version
            </Button>
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
