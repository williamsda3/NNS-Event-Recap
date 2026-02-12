export type FieldType = 'text' | 'number' | 'longtext' | 'url' | 'date' | 'calculated';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  category: 'header' | 'metrics' | 'totals' | 'other';
  formula?: string;
  order: number;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

export interface EventEntry {
  id: string;
  projectId: string;
  eventName: string;
  eventDate: string;
  responses: Record<string, string | number>;
  status: 'draft' | 'pending' | 'submitted';
  shareToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  libraryName: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  dateRange: string;
  templateId: string;
  clientId: string;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_TEMPLATE: FormTemplate = {
  id: 'default-event-recap',
  name: 'Event Recap Template',
  description: 'Standard event recap form for outreach events',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  fields: [
    { id: 'event_name', label: 'Event Name', type: 'text', required: true, category: 'header', order: 1 },
    { id: 'event_date_time', label: 'Event Date and Time', type: 'text', required: true, category: 'header', order: 2 },
    { id: 'survey_submissions', label: 'Total Onsite Tablet Survey Submissions', type: 'number', required: false, category: 'metrics', order: 3 },
    { id: 'english_spanish_take_ones', label: 'English/Spanish Take Ones Distributed', type: 'number', required: false, category: 'metrics', order: 4 },
    { id: 'english_korean_take_ones', label: 'English/Korean Take Ones Distributed', type: 'number', required: false, category: 'metrics', order: 5 },
    { id: 'total_take_ones', label: 'Total Take Ones Distributed', type: 'calculated', required: false, category: 'totals', formula: 'english_spanish_take_ones + english_korean_take_ones', order: 6 },
    { id: 'interactions_english', label: 'Total Interactions in English', type: 'number', required: false, category: 'metrics', order: 7 },
    { id: 'interactions_spanish', label: 'Total Interactions in Spanish', type: 'number', required: false, category: 'metrics', order: 8 },
    { id: 'interactions_vietnamese', label: 'Total Interactions in Vietnamese', type: 'number', required: false, category: 'metrics', order: 9 },
    { id: 'total_interactions', label: 'Total Number of Interactions', type: 'calculated', required: false, category: 'totals', formula: 'interactions_english + interactions_spanish + interactions_vietnamese', order: 10 },
    { id: 'goodie_bags', label: 'Goodie Bags Distributed', type: 'number', required: false, category: 'metrics', order: 11 },
    { id: 'photo_album', label: 'Photo Album', type: 'url', required: false, category: 'other', order: 12 },
    { id: 'general_comments', label: 'General Event Comments', type: 'longtext', required: false, category: 'other', order: 13 }
  ]
};
