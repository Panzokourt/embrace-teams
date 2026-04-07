import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Find recurring tasks whose due_date has passed and are completed
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .not('recurrence_pattern', 'is', null)
      .lte('due_date', todayStr)
      .eq('status', 'completed');

    if (error) throw error;

    let created = 0;

    for (const task of tasks || []) {
      // Check recurrence_end_date
      if (task.recurrence_end_date && new Date(task.recurrence_end_date) < now) {
        continue;
      }

      // Calculate next due date
      const dueDate = new Date(task.due_date);
      let nextDue: Date;

      switch (task.recurrence_pattern) {
        case 'daily':
          nextDue = new Date(dueDate);
          nextDue.setDate(nextDue.getDate() + 1);
          break;
        case 'weekly':
          nextDue = new Date(dueDate);
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case 'biweekly':
          nextDue = new Date(dueDate);
          nextDue.setDate(nextDue.getDate() + 14);
          break;
        case 'monthly':
          nextDue = new Date(dueDate);
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
        case 'quarterly':
          nextDue = new Date(dueDate);
          nextDue.setMonth(nextDue.getMonth() + 3);
          break;
        default:
          continue;
      }

      // Calculate start date offset
      let nextStart: string | null = null;
      if (task.start_date && task.due_date) {
        const startDate = new Date(task.start_date);
        const diffMs = dueDate.getTime() - startDate.getTime();
        const newStart = new Date(nextDue.getTime() - diffMs);
        nextStart = newStart.toISOString();
      }

      // Check if a task with this due_date already exists (prevent duplicates)
      const nextDueStr = nextDue.toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', task.project_id)
        .eq('title', task.title)
        .eq('is_recurring', true)
        .gte('due_date', nextDueStr)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Create the new task
      const { error: insertError } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description,
          project_id: task.project_id,
          assigned_to: task.assigned_to,
          priority: task.priority,
          task_type: task.task_type,
          task_category: task.task_category,
          deliverable_id: task.deliverable_id,
          estimated_hours: task.estimated_hours,
          is_recurring: true,
          recurrence_pattern: task.recurrence_pattern,
          recurrence_end_date: task.recurrence_end_date,
          status: 'todo',
          due_date: nextDue.toISOString(),
          start_date: nextStart,
          created_by: task.created_by,
        });

      if (!insertError) created++;
    }

    return new Response(
      JSON.stringify({ success: true, created, checked: tasks?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
