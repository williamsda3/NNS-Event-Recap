import { Project, FormTemplate, Client, EventEntry, DEFAULT_TEMPLATE } from '@/types';
import { supabase } from '@/lib/supabase';

// Snake_case <-> camelCase helpers for Supabase
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

function mapClient(row: Record<string, unknown>): Client {
  const c = toCamelCase(row);
  return {
    id: c.id as string,
    name: c.name as string,
    libraryName: c.libraryName as string,
    createdAt: c.createdAt as string,
  };
}

function mapProject(row: Record<string, unknown>): Project {
  const p = toCamelCase(row);
  return {
    id: p.id as string,
    name: p.name as string,
    dateRange: p.dateRange as string,
    templateId: p.templateId as string,
    clientId: p.clientId as string,
    starred: p.starred as boolean,
    createdAt: p.createdAt as string,
    updatedAt: p.updatedAt as string,
  };
}

function mapEvent(row: Record<string, unknown>): EventEntry {
  const e = toCamelCase(row);
  return {
    id: e.id as string,
    projectId: e.projectId as string,
    eventName: e.eventName as string,
    eventDate: (e.eventDate as string) || '',
    responses: (e.responses as Record<string, string | number>) || {},
    status: (e.status as EventEntry['status']) || 'draft',
    shareToken: e.shareToken as string,
    createdAt: e.createdAt as string,
    updatedAt: e.updatedAt as string,
  };
}

function mapTemplate(row: Record<string, unknown>): FormTemplate {
  const t = toCamelCase(row);
  return {
    id: t.id as string,
    name: t.name as string,
    description: (t.description as string) || '',
    fields: t.fields as FormTemplate['fields'],
    createdAt: t.createdAt as string,
    updatedAt: t.updatedAt as string,
  };
}

export const db = {
  // ── Clients ──────────────────────────────────────────────
  getClients: async (): Promise<Client[]> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { console.error('getClients error:', error); return []; }
    return (data || []).map(mapClient);
  },

  getClient: async (id: string): Promise<Client | undefined> => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return undefined;
    return mapClient(data);
  },

  saveClient: async (client: Client): Promise<void> => {
    const row = toSnakeCase(client as unknown as Record<string, unknown>);
    const { error } = await supabase.from('clients').upsert(row);
    if (error) console.error('saveClient error:', error);
  },

  deleteClient: async (id: string): Promise<void> => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) console.error('deleteClient error:', error);
  },

  // ── Templates ────────────────────────────────────────────
  getTemplates: async (): Promise<FormTemplate[]> => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { console.error('getTemplates error:', error); return [DEFAULT_TEMPLATE]; }
    const templates = (data || []).map(mapTemplate);
    // Always include default template
    if (!templates.find(t => t.id === DEFAULT_TEMPLATE.id)) {
      templates.unshift(DEFAULT_TEMPLATE);
    }
    return templates;
  },

  getTemplate: async (id: string): Promise<FormTemplate | undefined> => {
    if (id === DEFAULT_TEMPLATE.id) return DEFAULT_TEMPLATE;
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return undefined;
    return mapTemplate(data);
  },

  saveTemplate: async (template: FormTemplate): Promise<void> => {
    const row = toSnakeCase(template as unknown as Record<string, unknown>);
    const { error } = await supabase.from('templates').upsert(row);
    if (error) console.error('saveTemplate error:', error);
  },

  deleteTemplate: async (id: string): Promise<void> => {
    if (id === DEFAULT_TEMPLATE.id) return;
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) console.error('deleteTemplate error:', error);
  },

  // Seed default template into DB if not present
  ensureDefaultTemplate: async (): Promise<void> => {
    const { data } = await supabase
      .from('templates')
      .select('id')
      .eq('id', DEFAULT_TEMPLATE.id)
      .single();
    if (!data) {
      const row = toSnakeCase(DEFAULT_TEMPLATE as unknown as Record<string, unknown>);
      (row as Record<string, unknown>)['is_default'] = true;
      await supabase.from('templates').insert(row);
    }
  },

  // ── Projects ─────────────────────────────────────────────
  getProjects: async (): Promise<Project[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) { console.error('getProjects error:', error); return []; }
    return (data || []).map(mapProject);
  },

  getProject: async (id: string): Promise<Project | undefined> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return undefined;
    return mapProject(data);
  },

  getProjectsByClient: async (clientId: string): Promise<Project[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false });
    if (error) { console.error('getProjectsByClient error:', error); return []; }
    return (data || []).map(mapProject);
  },

  getProjectCountByClient: async (clientId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId);
    if (error) return 0;
    return count || 0;
  },

  saveProject: async (project: Project): Promise<void> => {
    const row = toSnakeCase(project as unknown as Record<string, unknown>);
    const { error } = await supabase.from('projects').upsert(row);
    if (error) console.error('saveProject error:', error);
  },

  deleteProject: async (id: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) console.error('deleteProject error:', error);
  },

  toggleProjectStar: async (id: string, starred: boolean): Promise<void> => {
    const { error } = await supabase
      .from('projects')
      .update({ starred, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) console.error('toggleProjectStar error:', error);
  },

  // ── Events ───────────────────────────────────────────────
  getEventsByProject: async (projectId: string): Promise<EventEntry[]> => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) { console.error('getEventsByProject error:', error); return []; }
    return (data || []).map(mapEvent);
  },

  getEvent: async (id: string): Promise<EventEntry | undefined> => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return undefined;
    return mapEvent(data);
  },

  getEventByShareToken: async (token: string): Promise<EventEntry | undefined> => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('share_token', token)
      .single();
    if (error || !data) return undefined;
    return mapEvent(data);
  },

  saveEvent: async (event: EventEntry): Promise<EventEntry> => {
    const row = toSnakeCase(event as unknown as Record<string, unknown>);
    const { data, error } = await supabase
      .from('events')
      .upsert(row)
      .select()
      .single();
    if (error) {
      console.error('saveEvent error:', error);
      return event;
    }
    return mapEvent(data);
  },

  createEvent: async (event: Omit<EventEntry, 'id' | 'shareToken'>): Promise<EventEntry | null> => {
    const row = toSnakeCase(event as unknown as Record<string, unknown>);
    // Let Supabase generate id and share_token
    delete row.id;
    delete row.share_token;
    const { data, error } = await supabase
      .from('events')
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error('createEvent error:', error);
      return null;
    }
    return mapEvent(data);
  },

  deleteEvent: async (id: string): Promise<void> => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) console.error('deleteEvent error:', error);
  },

  updateEventResponses: async (id: string, responses: Record<string, string | number>, status: EventEntry['status'] = 'submitted'): Promise<void> => {
    const { error } = await supabase
      .from('events')
      .update({ responses, status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) console.error('updateEventResponses error:', error);
  },
};
