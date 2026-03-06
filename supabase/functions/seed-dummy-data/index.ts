import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

const USERS = [
  { email: 'maria@advize.gr', full_name: 'Μαρία Παπαδοπούλου', role: 'admin', dept: 'Digital', job_title: 'Digital Director' },
  { email: 'giorgos@advize.gr', full_name: 'Γιώργος Νικολάου', role: 'manager', dept: 'Creative', job_title: 'Creative Manager' },
  { email: 'eleni@advize.gr', full_name: 'Ελένη Κωστοπούλου', role: 'member', dept: 'Digital', job_title: 'Social Media Specialist' },
  { email: 'dimitris@advize.gr', full_name: 'Δημήτρης Αθανασίου', role: 'member', dept: 'Creative', job_title: 'Graphic Designer' },
  { email: 'sofia@advize.gr', full_name: 'Σοφία Μαυρίδου', role: 'viewer', dept: 'Digital', job_title: 'Junior Analyst' },
  { email: 'nikos@advize.gr', full_name: 'Νίκος Παπαγεωργίου', role: 'billing', dept: null, job_title: 'Λογιστής' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth validation — seed is admin-only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Verify caller is admin
    const callerUserId = claimsData.claims.sub as string;
    const { data: callerRole } = await anonClient.from('user_company_roles').select('role').eq('user_id', callerUserId).in('role', ['owner', 'super_admin', 'admin']).limit(1).single();
    if (!callerRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const summary: string[] = [];

    // ─── 1. USERS ───
    const userIds: Record<string, string> = {};
    const deptMap: Record<string, string> = {};

    // Get existing departments
    const { data: existingDepts } = await admin.from('departments').select('id, name').eq('company_id', COMPANY_ID);
    for (const d of existingDepts || []) deptMap[d.name] = d.id;

    for (const u of USERS) {
      // Check if user already exists
      const { data: existingProfile } = await admin.from('profiles').select('id').eq('email', u.email).maybeSingle();
      if (existingProfile) {
        userIds[u.email] = existingProfile.id;
        summary.push(`User ${u.email} already exists`);
        continue;
      }

      const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email: u.email,
        password: 'Test123!',
        email_confirm: true,
        user_metadata: { full_name: u.full_name }
      });
      if (authErr) { summary.push(`User ${u.email} error: ${authErr.message}`); continue; }
      const uid = authUser.user.id;
      userIds[u.email] = uid;

      await admin.from('profiles').update({
        full_name: u.full_name,
        job_title: u.job_title,
        department: u.dept,
        department_id: u.dept && deptMap[u.dept] ? deptMap[u.dept] : null,
        status: 'active',
        hire_date: '2024-01-15',
        phone: `+3069${Math.floor(10000000 + Math.random() * 90000000)}`,
      }).eq('id', uid);

      // Company role
      await admin.from('user_company_roles').insert({
        user_id: uid, company_id: COMPANY_ID,
        role: u.role === 'member' ? 'standard' : u.role,
        status: 'active',
        access_scope: ['admin', 'manager'].includes(u.role) ? 'company' : 'assigned',
      });

      // Legacy user_roles
      const legacyRole = ['admin', 'manager'].includes(u.role) ? u.role : 'user';
      await admin.from('user_roles').insert({ user_id: uid, role: legacyRole }).maybeSingle();

      summary.push(`Created user: ${u.full_name} (${u.role})`);
    }

    // ─── 2. DEPARTMENTS ───
    const newDepts = [
      { name: 'Διοίκηση', description: 'C-level & Heads', color: '#6366F1' },
      { name: 'Λογιστήριο', description: 'Λογιστικό τμήμα', color: '#F59E0B' },
      { name: 'Γραμματεία', description: 'Γραμματειακή υποστήριξη', color: '#EC4899' },
      { name: 'Εκδηλώσεις', description: 'Events & BTL', color: '#10B981' },
    ];
    for (const d of newDepts) {
      if (deptMap[d.name]) continue;
      const { data } = await admin.from('departments').insert({
        name: d.name, description: d.description, color: d.color, company_id: COMPANY_ID
      }).select('id').single();
      if (data) { deptMap[d.name] = data.id; summary.push(`Created dept: ${d.name}`); }
    }

    // Update department heads
    if (userIds['maria@advize.gr'] && deptMap['Digital']) {
      await admin.from('departments').update({ head_user_id: userIds['maria@advize.gr'] }).eq('id', deptMap['Digital']);
    }
    if (userIds['giorgos@advize.gr'] && deptMap['Creative']) {
      await admin.from('departments').update({ head_user_id: userIds['giorgos@advize.gr'] }).eq('id', deptMap['Creative']);
    }

    // Assign department_id to users
    for (const u of USERS) {
      if (u.dept && deptMap[u.dept] && userIds[u.email]) {
        await admin.from('profiles').update({ department_id: deptMap[u.dept] }).eq('id', userIds[u.email]);
      }
    }

    // ─── 3. ORG CHART ───
    const ownerUserId = 'f6fee19b-cde1-4f8e-b4a1-6a3866b2e7bf';
    const { data: existingPositions } = await admin.from('org_chart_positions').select('id').eq('company_id', COMPANY_ID).limit(1);
    if (!existingPositions || existingPositions.length === 0) {
      const { data: ceoPos } = await admin.from('org_chart_positions').insert({
        company_id: COMPANY_ID, position_title: 'CEO', user_id: ownerUserId,
        department: 'Διοίκηση', level: 0, sort_order: 0
      }).select('id').single();

      if (ceoPos) {
        const heads = [
          { title: 'Digital Director', email: 'maria@advize.gr', dept: 'Digital' },
          { title: 'Creative Manager', email: 'giorgos@advize.gr', dept: 'Creative' },
        ];
        for (const h of heads) {
          const { data: headPos } = await admin.from('org_chart_positions').insert({
            company_id: COMPANY_ID, position_title: h.title,
            user_id: userIds[h.email] || null,
            parent_position_id: ceoPos.id, department: h.dept, level: 1, sort_order: 1
          }).select('id').single();

          if (headPos) {
            const members = USERS.filter(u => u.dept === h.dept && u.role === 'member');
            for (const m of members) {
              await admin.from('org_chart_positions').insert({
                company_id: COMPANY_ID, position_title: m.job_title,
                user_id: userIds[m.email] || null,
                parent_position_id: headPos.id, department: h.dept, level: 2, sort_order: 2
              });
            }
          }
        }
        summary.push('Created org chart');
      }
    }

    // ─── 4. CLIENTS ───
    const clientNames = [
      { name: 'Vodafone Greece', email: 'contact@vodafone.gr', phone: '+302109876543' },
      { name: 'Cosmote', email: 'info@cosmote.gr', phone: '+302101234567' },
      { name: 'Alpha Bank', email: 'corporate@alphabank.gr', phone: '+302103456789' },
    ];
    const clientIds: Record<string, string> = {};
    for (const c of clientNames) {
      const { data: existing } = await admin.from('clients').select('id').eq('name', c.name).maybeSingle();
      if (existing) { clientIds[c.name] = existing.id; continue; }
      const { data } = await admin.from('clients').insert({
        name: c.name, contact_email: c.email, contact_phone: c.phone, company_id: COMPANY_ID
      }).select('id').single();
      if (data) { clientIds[c.name] = data.id; summary.push(`Created client: ${c.name}`); }
    }

    // ─── 5. PROJECTS ───
    const projects = [
      { name: 'Vodafone Social Media 2026', client: 'Vodafone Greece', status: 'active', budget: 45000, progress: 65 },
      { name: 'Cosmote Rebranding', client: 'Cosmote', status: 'active', budget: 80000, progress: 30 },
      { name: 'Alpha Bank Digital Campaign', client: 'Alpha Bank', status: 'proposal', budget: 120000, progress: 0 },
      { name: 'Vodafone Summer Campaign', client: 'Vodafone Greece', status: 'completed', budget: 35000, progress: 100 },
      { name: 'Cosmote SEO Optimization', client: 'Cosmote', status: 'active', budget: 25000, progress: 45 },
      { name: 'Alpha Bank App Launch', client: 'Alpha Bank', status: 'proposal', budget: 95000, progress: 10 },
    ];
    const projectIds: Record<string, string> = {};
    for (const p of projects) {
      const { data: existing } = await admin.from('projects').select('id').eq('name', p.name).maybeSingle();
      if (existing) { projectIds[p.name] = existing.id; continue; }
      const { data } = await admin.from('projects').insert({
        name: p.name, client_id: clientIds[p.client], company_id: COMPANY_ID,
        status: p.status, budget: p.budget, progress: p.progress,
        start_date: '2026-01-01', end_date: '2026-06-30',
        description: `Έργο ${p.name} για τον πελάτη ${p.client}`
      }).select('id').single();
      if (data) { projectIds[p.name] = data.id; summary.push(`Created project: ${p.name}`); }
    }

    // Project user access
    const allUserIds = Object.values(userIds);
    for (const pid of Object.values(projectIds)) {
      for (const uid of allUserIds) {
        await admin.from('project_user_access').upsert(
          { project_id: pid, user_id: uid },
          { onConflict: 'project_id,user_id', ignoreDuplicates: true }
        );
      }
      // Also add owner
      await admin.from('project_user_access').upsert(
        { project_id: pid, user_id: ownerUserId },
        { onConflict: 'project_id,user_id', ignoreDuplicates: true }
      );
    }

    // ─── 6. DELIVERABLES ───
    const deliverableIds: Record<string, string[]> = {};
    const deliverableData = [
      { project: 'Vodafone Social Media 2026', items: ['Content Plan Q1', 'Monthly Reports', 'Campaign Creatives'] },
      { project: 'Cosmote Rebranding', items: ['Brand Guidelines', 'Logo Design', 'Marketing Collateral'] },
      { project: 'Alpha Bank Digital Campaign', items: ['Strategy Document', 'Digital Ads', 'Landing Pages'] },
      { project: 'Vodafone Summer Campaign', items: ['Summer Creatives', 'Media Plan'] },
      { project: 'Cosmote SEO Optimization', items: ['SEO Audit', 'Keyword Research', 'Technical Fixes'] },
      { project: 'Alpha Bank App Launch', items: ['App UI/UX Design', 'App Marketing Campaign'] },
    ];
    for (const dd of deliverableData) {
      if (!projectIds[dd.project]) continue;
      deliverableIds[dd.project] = [];
      for (const name of dd.items) {
        const { data: existing } = await admin.from('deliverables').select('id').eq('project_id', projectIds[dd.project]).eq('name', name).maybeSingle();
        if (existing) { deliverableIds[dd.project].push(existing.id); continue; }
        const { data } = await admin.from('deliverables').insert({
          name, project_id: projectIds[dd.project], budget: Math.floor(Math.random() * 15000) + 5000,
          due_date: '2026-04-30'
        }).select('id').single();
        if (data) deliverableIds[dd.project].push(data.id);
      }
    }
    summary.push('Created deliverables');

    // ─── 7. TASKS ───
    const taskStatuses: Array<'todo' | 'in_progress' | 'in_review' | 'done'> = ['todo', 'in_progress', 'in_review', 'done'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const assignableUsers = Object.values(userIds);
    let taskCount = 0;

    const taskTemplates = [
      'Δημιουργία περιεχομένου', 'Σχεδιασμός banner', 'Ανάλυση δεδομένων', 'Παρουσίαση στον πελάτη',
      'Copywriting', 'Photo editing', 'Video production', 'Social media posting',
      'Report generation', 'Client meeting prep', 'Strategy review', 'Budget planning',
      'A/B Testing setup', 'Analytics dashboard', 'Content calendar', 'Campaign launch',
      'Performance review', 'Creative brief', 'Media buying setup', 'SEO audit',
      'Keyword research', 'Link building', 'UX wireframes', 'UI mockups',
      'Responsive design', 'Landing page development', 'Email campaign', 'Newsletter design',
      'Brand identity review', 'Competitor analysis',
    ];

    let taskIdx = 0;
    for (const [pName, pId] of Object.entries(projectIds)) {
      const delIds = deliverableIds[pName] || [];
      const tasksForProject = 5;
      for (let i = 0; i < tasksForProject; i++) {
        const title = taskTemplates[taskIdx % taskTemplates.length];
        taskIdx++;
        const { data: existing } = await admin.from('tasks').select('id').eq('project_id', pId).eq('title', title).maybeSingle();
        if (existing) { taskCount++; continue; }
        await admin.from('tasks').insert({
          title,
          project_id: pId,
          deliverable_id: delIds.length > 0 ? delIds[i % delIds.length] : null,
          status: taskStatuses[i % taskStatuses.length],
          priority: priorities[i % priorities.length],
          assigned_to: assignableUsers[i % assignableUsers.length],
          due_date: `2026-0${(i % 5) + 2}-${15 + i}`,
          estimated_hours: Math.floor(Math.random() * 16) + 2,
          actual_hours: Math.floor(Math.random() * 10),
          progress: Math.floor(Math.random() * 100),
          start_date: '2026-01-15',
        });
        taskCount++;
      }
    }
    summary.push(`Created/verified ${taskCount} tasks`);

    // ─── 8. SERVICES ───
    const services = [
      { name: 'Social Media Management', category: 'retainer', pricing_unit: 'monthly', list_price: 2500, internal_cost: 1500 },
      { name: 'Web Development', category: 'project', pricing_unit: 'project', list_price: 15000, internal_cost: 8000 },
      { name: 'Branding', category: 'project', pricing_unit: 'project', list_price: 20000, internal_cost: 10000 },
      { name: 'SEO', category: 'retainer', pricing_unit: 'monthly', list_price: 1800, internal_cost: 900 },
      { name: 'Media Buying', category: 'project', pricing_unit: 'project', list_price: 5000, internal_cost: 2000 },
      { name: 'Content Creation', category: 'retainer', pricing_unit: 'monthly', list_price: 3000, internal_cost: 1800 },
    ];
    for (const s of services) {
      const { data: existing } = await admin.from('services').select('id').eq('name', s.name).maybeSingle();
      if (existing) continue;
      await admin.from('services').insert({
        name: s.name, category: s.category, pricing_unit: s.pricing_unit,
        list_price: s.list_price, internal_cost: s.internal_cost,
        company_id: COMPANY_ID, target_margin: 40, is_active: true
      });
      summary.push(`Created service: ${s.name}`);
    }

    // ─── 9. CONTRACTS ───
    const contractData = [
      { project: 'Vodafone Social Media 2026', status: 'active', amount: 45000, type: 'retainer' },
      { project: 'Cosmote Rebranding', status: 'active', amount: 80000, type: 'fixed' },
      { project: 'Vodafone Summer Campaign', status: 'completed', amount: 35000, type: 'fixed' },
      { project: 'Alpha Bank Digital Campaign', status: 'draft', amount: 120000, type: 'fixed' },
    ];
    for (const c of contractData) {
      if (!projectIds[c.project]) continue;
      const { data: existing } = await admin.from('contracts').select('id').eq('project_id', projectIds[c.project]).maybeSingle();
      if (existing) continue;
      await admin.from('contracts').insert({
        project_id: projectIds[c.project], status: c.status, total_amount: c.amount,
        contract_type: c.type, company_id: COMPANY_ID,
        contract_number: `CNT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        start_date: '2026-01-01', end_date: '2026-12-31',
        billing_frequency: c.type === 'retainer' ? 'monthly' : 'milestone',
        payment_terms: 'Net 30',
      });
      summary.push(`Created contract for: ${c.project}`);
    }

    // ─── 10. INVOICES ───
    const invoiceData = [
      { project: 'Vodafone Social Media 2026', amount: 7500, status: 'paid', num: 'INV-2026-001' },
      { project: 'Vodafone Social Media 2026', amount: 7500, status: 'paid', num: 'INV-2026-002' },
      { project: 'Vodafone Social Media 2026', amount: 7500, status: 'unpaid', num: 'INV-2026-003' },
      { project: 'Cosmote Rebranding', amount: 20000, status: 'paid', num: 'INV-2026-004' },
      { project: 'Cosmote Rebranding', amount: 20000, status: 'unpaid', num: 'INV-2026-005' },
      { project: 'Vodafone Summer Campaign', amount: 35000, status: 'paid', num: 'INV-2026-006' },
      { project: 'Cosmote SEO Optimization', amount: 5400, status: 'overdue', num: 'INV-2026-007' },
      { project: 'Alpha Bank App Launch', amount: 25000, status: 'unpaid', num: 'INV-2026-008' },
    ];
    for (const inv of invoiceData) {
      if (!projectIds[inv.project]) continue;
      const { data: existing } = await admin.from('invoices').select('id').eq('invoice_number', inv.num).maybeSingle();
      if (existing) continue;
      const clientName = projects.find(p => p.name === inv.project)?.client;
      const netAmount = inv.amount;
      const vatAmount = Math.round(netAmount * 0.24);
      await admin.from('invoices').insert({
        project_id: projectIds[inv.project],
        client_id: clientName ? clientIds[clientName] : null,
        invoice_number: inv.num, amount: netAmount + vatAmount,
        net_amount: netAmount, vat_amount: vatAmount, vat_rate: 24,
        status: inv.status,
        paid: inv.status === 'paid',
        paid_amount: inv.status === 'paid' ? netAmount + vatAmount : 0,
        paid_date: inv.status === 'paid' ? '2026-02-01' : null,
        issued_date: '2026-01-15',
        due_date: inv.status === 'overdue' ? '2026-01-30' : '2026-03-15',
      });
      summary.push(`Created invoice: ${inv.num}`);
    }

    // ─── 11. EXPENSES ───
    const expenseData = [
      { desc: 'Facebook Ads - Vodafone', amount: 5000, type: 'media_spend', project: 'Vodafone Social Media 2026', vendor: 'Meta' },
      { desc: 'Google Ads - Cosmote', amount: 8000, type: 'media_spend', project: 'Cosmote SEO Optimization', vendor: 'Google' },
      { desc: 'Stock Photos License', amount: 500, type: 'vendor', project: 'Cosmote Rebranding', vendor: 'Shutterstock' },
      { desc: 'Print Materials', amount: 2200, type: 'vendor', project: 'Cosmote Rebranding', vendor: 'PrintShop' },
      { desc: 'Hosting & Infrastructure', amount: 350, type: 'overhead', project: null, vendor: 'AWS' },
      { desc: 'Software Licenses (Adobe)', amount: 1200, type: 'overhead', project: null, vendor: 'Adobe' },
      { desc: 'Office Supplies', amount: 180, type: 'overhead', project: null, vendor: 'Πλαίσιο' },
      { desc: 'Instagram Ads - Alpha Bank', amount: 3500, type: 'media_spend', project: 'Alpha Bank Digital Campaign', vendor: 'Meta' },
      { desc: 'Video Production - Vodafone', amount: 4500, type: 'vendor', project: 'Vodafone Summer Campaign', vendor: 'StudioX' },
      { desc: 'LinkedIn Ads', amount: 2000, type: 'media_spend', project: 'Alpha Bank App Launch', vendor: 'LinkedIn' },
    ];
    const approvalStatuses = ['approved', 'approved', 'approved', 'pending', 'approved', 'approved', 'draft', 'approved', 'approved', 'pending'];
    for (let i = 0; i < expenseData.length; i++) {
      const e = expenseData[i];
      const { data: existing } = await admin.from('expenses').select('id').eq('description', e.desc).maybeSingle();
      if (existing) continue;
      await admin.from('expenses').insert({
        description: e.desc, amount: e.amount, expense_type: e.type,
        project_id: e.project ? projectIds[e.project] || null : null,
        vendor_name: e.vendor,
        expense_date: `2026-0${(i % 2) + 1}-${10 + i}`,
        approval_status: approvalStatuses[i],
        category: e.type === 'media_spend' ? 'advertising' : e.type === 'vendor' ? 'services' : 'operations',
      });
    }
    summary.push('Created expenses');

    // ─── 12. LEAVE TYPES & REQUESTS ───
    const leaveTypes = [
      { name: 'Κανονική Άδεια', code: 'ANNUAL', default_days: 20, color: '#3B82F6' },
      { name: 'Άδεια Ασθένειας', code: 'SICK', default_days: 10, color: '#EF4444' },
      { name: 'Άδεια Άνευ Αποδοχών', code: 'UNPAID', default_days: 0, color: '#6B7280' },
    ];
    const leaveTypeIds: Record<string, string> = {};
    for (const lt of leaveTypes) {
      const { data: existing } = await admin.from('leave_types').select('id').eq('code', lt.code).eq('company_id', COMPANY_ID).maybeSingle();
      if (existing) { leaveTypeIds[lt.code] = existing.id; continue; }
      const { data } = await admin.from('leave_types').insert({
        name: lt.name, code: lt.code, default_days: lt.default_days,
        color: lt.color, company_id: COMPANY_ID, is_active: true, requires_approval: true
      }).select('id').single();
      if (data) { leaveTypeIds[lt.code] = data.id; summary.push(`Created leave type: ${lt.name}`); }
    }

    // Leave balances for all users
    for (const uid of [...Object.values(userIds), ownerUserId]) {
      for (const [code, ltId] of Object.entries(leaveTypeIds)) {
        const { data: existing } = await admin.from('leave_balances').select('id')
          .eq('user_id', uid).eq('leave_type_id', ltId).eq('year', 2026).maybeSingle();
        if (existing) continue;
        const entitled = code === 'ANNUAL' ? 20 : code === 'SICK' ? 10 : 0;
        await admin.from('leave_balances').insert({
          user_id: uid, leave_type_id: ltId, company_id: COMPANY_ID,
          year: 2026, entitled_days: entitled, used_days: Math.floor(Math.random() * 5),
          pending_days: 0, carried_over: code === 'ANNUAL' ? 3 : 0
        });
      }
    }
    summary.push('Created leave balances');

    // Leave requests
    const leaveRequests = [
      { email: 'maria@advize.gr', type: 'ANNUAL', start: '2026-03-10', end: '2026-03-14', days: 5, status: 'approved' },
      { email: 'giorgos@advize.gr', type: 'SICK', start: '2026-02-05', end: '2026-02-06', days: 2, status: 'approved' },
      { email: 'eleni@advize.gr', type: 'ANNUAL', start: '2026-04-01', end: '2026-04-05', days: 5, status: 'pending' },
      { email: 'dimitris@advize.gr', type: 'UNPAID', start: '2026-03-20', end: '2026-03-22', days: 3, status: 'rejected' },
      { email: 'sofia@advize.gr', type: 'ANNUAL', start: '2026-05-10', end: '2026-05-14', days: 5, status: 'pending' },
    ];
    for (const lr of leaveRequests) {
      if (!userIds[lr.email] || !leaveTypeIds[lr.type]) continue;
      const { data: existing } = await admin.from('leave_requests').select('id')
        .eq('user_id', userIds[lr.email]).eq('start_date', lr.start).maybeSingle();
      if (existing) continue;
      await admin.from('leave_requests').insert({
        user_id: userIds[lr.email], company_id: COMPANY_ID,
        leave_type_id: leaveTypeIds[lr.type],
        start_date: lr.start, end_date: lr.end, days_count: lr.days,
        status: lr.status, reason: 'Προσωπικοί λόγοι',
        reviewer_id: lr.status !== 'pending' ? ownerUserId : null,
        reviewed_at: lr.status !== 'pending' ? new Date().toISOString() : null,
      });
    }
    summary.push('Created leave requests');

    // ─── 13. TIME ENTRIES ───
    const { data: allTasks } = await admin.from('tasks').select('id, project_id, assigned_to')
      .in('project_id', Object.values(projectIds))
      .not('assigned_to', 'is', null)
      .limit(30);

    if (allTasks && allTasks.length > 0) {
      let teCount = 0;
      for (const task of allTasks) {
        // 2 entries per task over last 2 weeks
        for (let d = 0; d < 2; d++) {
          const dayOffset = Math.floor(Math.random() * 14);
          const date = new Date();
          date.setDate(date.getDate() - dayOffset);
          const startHour = 9 + Math.floor(Math.random() * 4);
          const duration = 60 + Math.floor(Math.random() * 180); // 1-4 hours
          const startTime = new Date(date);
          startTime.setHours(startHour, 0, 0, 0);
          const endTime = new Date(startTime.getTime() + duration * 60000);

          await admin.from('time_entries').insert({
            user_id: task.assigned_to,
            task_id: task.id,
            project_id: task.project_id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: duration,
            is_running: false,
            description: `Εργασία σε task`,
          });
          teCount++;
        }
      }
      summary.push(`Created ${teCount} time entries`);
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Seed error:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
