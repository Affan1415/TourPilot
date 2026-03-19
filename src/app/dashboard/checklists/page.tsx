"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardList,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  GripVertical,
  Camera,
  CheckCircle2,
  Loader2,
  Ship,
  PlayCircle,
  StopCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ChecklistTemplate, ChecklistItem, Tour } from "@/types";

type ChecklistType = 'pre' | 'post';

interface TemplateFormData {
  name: string;
  description: string;
  tour_id: string | null;
  is_active: boolean;
  checklist_type: ChecklistType;
  items: ChecklistItem[];
}

const emptyFormData: TemplateFormData = {
  name: "",
  description: "",
  tour_id: null,
  is_active: true,
  checklist_type: 'pre',
  items: [],
};

export default function ChecklistTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyFormData);
  const [activeTab, setActiveTab] = useState<ChecklistType>('pre');

  const fetchData = async () => {
    try {
      const supabase = createClient();

      const [templatesRes, toursRes] = await Promise.all([
        supabase
          .from("checklist_templates")
          .select("*, tour:tours(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("tours")
          .select("id, name")
          .eq("status", "active")
          .order("name"),
      ]);

      if (templatesRes.data) {
        setTemplates(templatesRes.data as any);
      }
      if (toursRes.data) {
        setTours(toursRes.data as any);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setFormData({
      ...emptyFormData,
      checklist_type: activeTab,
      items: [
        { id: crypto.randomUUID(), label: "", required: true, requiresPhoto: false },
      ],
    });
    setDialogOpen(true);
  };

  const handleEdit = (template: ChecklistTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      tour_id: template.tour_id,
      is_active: template.is_active,
      checklist_type: (template as any).checklist_type || 'pre',
      items: template.items || [],
    });
    setDialogOpen(true);
  };

  const handleDuplicate = async (template: ChecklistTemplate) => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("checklist_templates").insert({
        name: `${template.name} (Copy)`,
        description: template.description,
        tour_id: template.tour_id,
        is_active: false,
        checklist_type: (template as any).checklist_type || 'pre',
        items: template.items,
      });

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error duplicating template:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("checklist_templates")
        .delete()
        .eq("id", selectedTemplate.id);

      if (error) throw error;
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting template:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    if (formData.items.length === 0) return;
    if (formData.items.some((item) => !item.label.trim())) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        tour_id: formData.tour_id === "all" ? null : formData.tour_id,
        is_active: formData.is_active,
        checklist_type: formData.checklist_type,
        items: formData.items.map((item) => ({
          ...item,
          label: item.label.trim(),
        })),
      };

      if (selectedTemplate) {
        const { error } = await supabase
          .from("checklist_templates")
          .update(payload)
          .eq("id", selectedTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("checklist_templates").insert(payload);
        if (error) throw error;
      }

      setDialogOpen(false);
      setSelectedTemplate(null);
      setFormData(emptyFormData);
      fetchData();
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: crypto.randomUUID(), label: "", required: true, requiresPhoto: false },
      ],
    }));
  };

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const removeItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.items.length) return;

    setFormData((prev) => {
      const items = [...prev.items];
      [items[index], items[newIndex]] = [items[newIndex], items[index]];
      return { ...prev, items };
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  // Filter templates by type
  const preTemplates = templates.filter((t) => (t as any).checklist_type === 'pre' || !(t as any).checklist_type);
  const postTemplates = templates.filter((t) => (t as any).checklist_type === 'post');

  const renderTemplatesTable = (filteredTemplates: ChecklistTemplate[]) => (
    <Card>
      <CardContent className="p-0">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No {activeTab === 'pre' ? 'pre-trip' : 'post-trip'} templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first {activeTab === 'pre' ? 'pre-departure' : 'post-trip'} checklist template
            </p>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.tour ? (
                      <span className="flex items-center gap-1">
                        <Ship className="h-3 w-3 text-muted-foreground" />
                        {(template.tour as any).name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">All Tours</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {template.items?.length || 0} items
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={template.is_active ? "default" : "secondary"}
                      className={cn(
                        template.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {template.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(parseISO(template.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
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
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Safety Checklists
          </h1>
          <p className="text-muted-foreground">
            Create and manage pre-trip and post-trip checklists
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Tabs for Pre/Post Checklists */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ChecklistType)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pre" className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            Pre-Trip
            {preTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-1">{preTemplates.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="post" className="flex items-center gap-2">
            <StopCircle className="h-4 w-4" />
            Post-Trip
            {postTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-1">{postTemplates.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pre" className="mt-4">
          {renderTemplatesTable(preTemplates)}
        </TabsContent>

        <TabsContent value="post" className="mt-4">
          {renderTemplatesTable(postTemplates)}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Edit Template" : "New Checklist Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Pre-Departure Safety Checklist"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of when to use this checklist..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
              />
            </div>

            {/* Tour Selection */}
            <div className="space-y-2">
              <Label>Apply to Tour</Label>
              <Select
                value={formData.tour_id || "all"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    tour_id: value === "all" ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tour" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tours</SelectItem>
                  {tours.map((tour) => (
                    <SelectItem key={tour.id} value={tour.id}>
                      {tour.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave as "All Tours" to use this checklist for every tour
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Active templates are available for captains to use
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Checklist Items *</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 border rounded-lg border-dashed">
                  <p className="text-muted-foreground">No items yet</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={addItem}>
                    Add First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex flex-col gap-1 pt-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveItem(index, "up")}
                          disabled={index === 0}
                        >
                          <GripVertical className="h-4 w-4 rotate-90" />
                        </Button>
                      </div>

                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="e.g., Check life jackets are accessible"
                          value={item.label}
                          onChange={(e) =>
                            updateItem(item.id, { label: e.target.value })
                          }
                        />
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <Switch
                              checked={item.required}
                              onCheckedChange={(checked) =>
                                updateItem(item.id, { required: checked })
                              }
                            />
                            <span className="text-muted-foreground">Required</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <Switch
                              checked={item.requiresPhoto}
                              onCheckedChange={(checked) =>
                                updateItem(item.id, { requiresPhoto: checked })
                              }
                            />
                            <Camera className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Photo</span>
                          </label>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !formData.name.trim() ||
                formData.items.length === 0 ||
                formData.items.some((item) => !item.label.trim())
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {selectedTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedTemplate?.name}". This action
              cannot be undone. Any completed checklists using this template will
              be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
