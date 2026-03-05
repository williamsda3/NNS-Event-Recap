const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ktjwolxjoxnwkdreoftb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0andvbHhqb3hud2tkcmVvZnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDg3OTIsImV4cCI6MjA4NjMyNDc5Mn0.ZVVGfQSECGdcrxssN31RmiR6GvsEl_ZS7WAkJVuqWgk'
);

async function updateTemplates() {
  const { data: templates, error } = await supabase.from('templates').select('*');
  if (error) { console.error('Fetch error:', error); return; }

  for (const tmpl of templates) {
    const fields = tmpl.fields;
    if (!Array.isArray(fields)) continue;

    const hasOld = fields.some(f => f.id === 'general_comments');
    const hasNew = fields.some(f => f.id === 'comments_1');

    if (hasOld && !hasNew) {
      const newFields = fields.filter(f => f.id !== 'general_comments');
      const maxOrder = Math.max(...newFields.map(f => f.order || 0));
      newFields.push(
        { id: 'comments_1', label: 'Event Comments 1', type: 'longtext', required: false, category: 'other', order: maxOrder + 1 },
        { id: 'comments_2', label: 'Event Comments 2', type: 'longtext', required: false, category: 'other', order: maxOrder + 2 },
        { id: 'comments_3', label: 'Event Comments 3', type: 'longtext', required: false, category: 'other', order: maxOrder + 3 },
        { id: 'comments_4', label: 'Event Comments 4', type: 'longtext', required: false, category: 'other', order: maxOrder + 4 }
      );

      const { error: updateError } = await supabase
        .from('templates')
        .update({ fields: newFields })
        .eq('id', tmpl.id);

      if (updateError) console.error('Update error for', tmpl.id, updateError);
      else console.log('Updated template:', tmpl.id, '-', tmpl.name);
    } else if (hasNew) {
      console.log('Already updated:', tmpl.id, '-', tmpl.name);
    } else {
      console.log('No general_comments field:', tmpl.id, '-', tmpl.name);
    }
  }
  console.log('Done.');
}

updateTemplates();
