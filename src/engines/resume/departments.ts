/**
 * Departments — the same CV judged by the field it is aimed at.
 *
 * ── Why a generic CV score is half a score ──────────────────────────
 *
 * The mechanical half of a CV check is universal: a two-column layout
 * fails a parser whether you are a nurse or a solutions architect. The
 * judgement half is not. A sales CV with no revenue figure is a bad
 * sales CV; a nurse's CV with no revenue figure is a normal one. A
 * designer with no portfolio link has omitted the single artefact the
 * screener wanted; an accountant with no portfolio link has omitted
 * nothing at all.
 *
 * So the department a CV is aimed at changes four things, and only
 * these four — everything else in `score.ts` stays universal:
 *
 *   1. which skills the CV is expected to name
 *   2. which link matters (portfolio, repository, profile, none)
 *   3. which extra section is expected (certifications, publications…)
 *   4. what a *result* looks like in this field
 *
 * ── The rule these lists follow ─────────────────────────────────────
 *
 * Every entry is something a screener in that field would actually
 * search for, and every `expects` flag is set only where its absence is
 * a genuine omission. Where a department has no strong convention the
 * field is left off, and the corresponding check returns neutral rather
 * than inventing a standard to mark someone down against.
 */

export type DepartmentId =
  | 'engineering'
  | 'data'
  | 'design'
  | 'product'
  | 'marketing'
  | 'sales'
  | 'finance'
  | 'hr'
  | 'operations'
  | 'support'
  | 'healthcare'
  | 'education'
  | 'legal'
  | 'science'
  | 'other';

export interface Department {
  id: DepartmentId;
  label: string;
  /** One line. Shown under the selector — no more than a dozen words. */
  blurb: string;
  /**
   * Skills a CV in this field is expected to name some of. Never all —
   * the check measures coverage of the list, not completion of it.
   */
  coreSkills: string[];
  /** Which link a screener in this field looks for first. */
  link: 'portfolio' | 'repository' | 'profile' | 'none';
  /** An extra section whose absence is a real omission here. */
  section: 'certifications' | 'publications' | 'projects' | null;
  /**
   * The vocabulary of a result in this field. A bullet carrying a number
   * *and* one of these words is evidence a screener here recognises.
   */
  outcomeWords: string[];
  /** Concrete examples, used verbatim in the fix text. */
  outcomeExample: string;
  /** Who the AI reviewer should be reading as. */
  persona: string;
}

export const DEPARTMENTS: Department[] = [
  {
    id: 'engineering',
    label: 'Software & Engineering',
    blurb: 'Developers, DevOps, QA, hardware and technical engineering.',
    coreSkills: [
      'javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust', 'sql',
      'react', 'node.js', 'aws', 'azure', 'docker', 'kubernetes', 'git', 'ci/cd',
      'rest', 'graphql', 'microservices', 'unit testing', 'system design', 'linux',
      'terraform', 'postgresql', 'mongodb', 'agile',
    ],
    link: 'repository',
    section: 'projects',
    outcomeWords: [
      'latency', 'uptime', 'throughput', 'performance', 'load time', 'build time',
      'deploy', 'releases', 'requests', 'users', 'bugs', 'incidents', 'coverage',
      'downtime', 'cost', 'scale', 'response time', 'queries',
    ],
    outcomeExample: 'cut p95 latency 340ms → 90ms, or took deploys from weekly to 12 a day',
    persona: 'an engineering manager who reads for scope, ownership and whether the candidate has shipped things that stayed up',
  },
  {
    id: 'data',
    label: 'Data & Analytics',
    blurb: 'Data science, analytics, ML, data engineering and BI.',
    coreSkills: [
      'python', 'sql', 'r', 'pandas', 'numpy', 'machine learning', 'deep learning',
      'tensorflow', 'pytorch', 'scikit-learn', 'statistics', 'a/b testing', 'tableau',
      'power bi', 'looker', 'spark', 'airflow', 'dbt', 'etl', 'bigquery', 'snowflake',
      'data analysis', 'data engineering', 'nlp', 'excel',
    ],
    link: 'repository',
    section: 'projects',
    outcomeWords: [
      'accuracy', 'precision', 'recall', 'auc', 'f1', 'model', 'forecast', 'lift',
      'conversion', 'churn', 'revenue', 'cost', 'runtime', 'pipeline', 'records',
      'rows', 'dashboards', 'experiments', 'baseline',
    ],
    outcomeExample: 'raised model AUC 0.71 → 0.86, or cut pipeline runtime 6h → 40min',
    persona: 'a head of data who is checking whether the candidate has moved a metric, not just built a notebook',
  },
  {
    id: 'design',
    label: 'Design & Creative',
    blurb: 'UX, UI, product, graphic, motion and brand design.',
    coreSkills: [
      'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'after effects',
      'ux design', 'ui design', 'user research', 'wireframing', 'prototyping',
      'design systems', 'accessibility', 'wcag', 'usability testing', 'indesign',
      'typography', 'interaction design', 'webflow',
    ],
    link: 'portfolio',
    section: 'projects',
    outcomeWords: [
      'conversion', 'engagement', 'retention', 'task completion', 'usability',
      'drop-off', 'sign-ups', 'clicks', 'satisfaction', 'nps', 'support tickets',
      'time on task', 'adoption', 'error rate', 'accessibility',
    ],
    outcomeExample: 'lifted checkout completion 61% → 78% after usability testing with 12 users',
    persona: 'a design lead who will open the portfolio first and read the CV only to check the thinking behind it',
  },
  {
    id: 'product',
    label: 'Product & Project Management',
    blurb: 'Product managers, project managers, programme and delivery leads.',
    coreSkills: [
      'product management', 'roadmapping', 'user stories', 'okrs', 'agile', 'scrum',
      'kanban', 'jira', 'confluence', 'stakeholder management', 'product strategy',
      'a/b testing', 'user research', 'prioritisation', 'project management', 'pmp',
      'prince2', 'ms project', 'budget management', 'risk management',
    ],
    link: 'profile',
    section: 'certifications',
    outcomeWords: [
      'revenue', 'adoption', 'retention', 'activation', 'churn', 'nps', 'launch',
      'on time', 'under budget', 'roadmap', 'users', 'engagement', 'conversion',
      'delivery', 'scope', 'stakeholders', 'growth',
    ],
    outcomeExample: 'launched to 40k users in 6 weeks, lifting activation 22%',
    persona: 'a head of product who is looking for decisions the candidate owned and outcomes they can be held to',
  },
  {
    id: 'marketing',
    label: 'Marketing & Growth',
    blurb: 'Digital marketing, SEO, content, brand, growth and PR.',
    coreSkills: [
      'seo', 'sem', 'ppc', 'google ads', 'meta ads', 'content marketing', 'copywriting',
      'email marketing', 'marketing automation', 'hubspot', 'google analytics',
      'social media marketing', 'brand strategy', 'market research', 'semrush',
      'ahrefs', 'wordpress', 'conversion optimisation', 'crm', 'google tag manager',
    ],
    link: 'portfolio',
    section: null,
    outcomeWords: [
      'traffic', 'leads', 'conversion', 'ctr', 'cpa', 'cpc', 'roas', 'revenue',
      'impressions', 'engagement', 'open rate', 'subscribers', 'followers', 'rankings',
      'sessions', 'mql', 'sql', 'pipeline', 'growth', 'retention',
    ],
    outcomeExample: 'grew organic traffic 12k → 47k a month and cut CPA 38%',
    persona: 'a marketing director who reads for channel ownership and whether the numbers are attributable to this person',
  },
  {
    id: 'sales',
    label: 'Sales & Business Development',
    blurb: 'Account executives, BD, partnerships and account management.',
    coreSkills: [
      'b2b sales', 'lead generation', 'cold calling', 'negotiation', 'salesforce',
      'crm', 'account management', 'business development', 'pipeline management',
      'hubspot', 'prospecting', 'contract negotiation', 'upselling', 'forecasting',
      'territory management', 'saas sales', 'customer relationship management',
    ],
    link: 'profile',
    section: null,
    outcomeWords: [
      'quota', 'revenue', 'arr', 'mrr', 'pipeline', 'deals', 'closed', 'bookings',
      'target', 'growth', 'accounts', 'churn', 'renewal', 'upsell', 'win rate',
      'sales cycle', 'territory', 'commission', 'president', 'club',
    ],
    outcomeExample: 'closed £1.4m against a £1m quota, 140% of target, two years running',
    persona: 'a sales director who will look for quota attainment first and stop reading if it is not there',
  },
  {
    id: 'finance',
    label: 'Finance & Accounting',
    blurb: 'Accounting, FP&A, audit, tax, treasury and investment.',
    coreSkills: [
      'financial modelling', 'financial analysis', 'forecasting', 'budgeting',
      'variance analysis', 'accounts payable', 'accounts receivable', 'reconciliation',
      'auditing', 'ifrs', 'gaap', 'taxation', 'sap', 'quickbooks', 'xero', 'excel',
      'risk management', 'compliance', 'valuation', 'cpa', 'acca', 'cfa', 'payroll',
    ],
    link: 'profile',
    section: 'certifications',
    outcomeWords: [
      'revenue', 'cost', 'savings', 'budget', 'margin', 'ebitda', 'cash flow',
      'variance', 'audit', 'compliance', 'portfolio', 'accounts', 'reconciled',
      'close', 'forecast', 'working capital', 'roi', 'write-offs',
    ],
    outcomeExample: 'cut month-end close from 12 days to 4, and found £320k in recoverable VAT',
    persona: 'a finance director who reads for accuracy, ownership of a number, and the qualification behind it',
  },
  {
    id: 'hr',
    label: 'HR & People',
    blurb: 'Recruitment, people ops, L&D and compensation.',
    coreSkills: [
      'recruitment', 'talent acquisition', 'onboarding', 'performance management',
      'employee relations', 'hris', 'workday', 'bamboohr', 'compensation and benefits',
      'learning and development', 'change management', 'employment law', 'payroll',
      'stakeholder management', 'diversity and inclusion', 'succession planning',
    ],
    link: 'profile',
    section: 'certifications',
    outcomeWords: [
      'hires', 'time to hire', 'retention', 'turnover', 'attrition', 'headcount',
      'offer acceptance', 'engagement', 'enps', 'cost per hire', 'training',
      'absence', 'grievances', 'pipeline', 'diversity', 'satisfaction',
    ],
    outcomeExample: 'cut time-to-hire 54 → 27 days while raising offer acceptance to 91%',
    persona: 'a people director who reads for the scale of the population managed and the metric that moved',
  },
  {
    id: 'operations',
    label: 'Operations & Supply Chain',
    blurb: 'Operations, logistics, procurement, manufacturing and QA.',
    coreSkills: [
      'supply chain', 'logistics', 'procurement', 'inventory management', 'warehousing',
      'demand planning', 'lean', 'six sigma', 'process improvement', 'quality assurance',
      'quality control', 'iso 9001', 'production planning', 'erp', 'sap', 'vendor management',
      'root cause analysis', 'health and safety', 'kaizen', 'forecasting',
    ],
    link: 'profile',
    section: 'certifications',
    outcomeWords: [
      'cost', 'savings', 'throughput', 'lead time', 'cycle time', 'downtime', 'defects',
      'waste', 'inventory', 'accuracy', 'on-time', 'otif', 'capacity', 'yield',
      'utilisation', 'suppliers', 'sku', 'incidents', 'efficiency',
    ],
    outcomeExample: 'raised on-time-in-full 82% → 96% and took £480k out of inventory',
    persona: 'an operations director who reads for scale, cost and whether the improvement held',
  },
  {
    id: 'support',
    label: 'Customer Success & Support',
    blurb: 'Support, customer success, service delivery and call centre.',
    coreSkills: [
      'customer service', 'zendesk', 'servicenow', 'crm', 'salesforce', 'account management',
      'technical writing', 'escalation management', 'sla management', 'onboarding',
      'troubleshooting', 'stakeholder management', 'churn reduction', 'knowledge base',
      'itil', 'live chat', 'ticketing',
    ],
    link: 'profile',
    section: null,
    outcomeWords: [
      'csat', 'nps', 'sla', 'resolution', 'first response', 'tickets', 'churn',
      'retention', 'renewal', 'escalations', 'backlog', 'handle time', 'satisfaction',
      'accounts', 'arr', 'onboarding', 'adoption',
    ],
    outcomeExample: 'held CSAT at 94% across 1,200 tickets a month and cut churn 6% → 3.5%',
    persona: 'a customer success lead who reads for volume handled, the satisfaction number, and retained revenue',
  },
  {
    id: 'healthcare',
    label: 'Healthcare & Medical',
    blurb: 'Clinical, nursing, allied health, pharmacy and care.',
    coreSkills: [
      'patient care', 'clinical documentation', 'triage', 'medication administration',
      'electronic health records', 'epic', 'cerner', 'infection control', 'care planning',
      'bls', 'acls', 'cpr', 'phlebotomy', 'nursing', 'pharmacology', 'safeguarding',
      'hipaa', 'clinical governance', 'patient safety',
    ],
    link: 'none',
    section: 'certifications',
    outcomeWords: [
      'patients', 'beds', 'caseload', 'outcomes', 'readmission', 'infection', 'incidents',
      'wait time', 'discharge', 'compliance', 'audit', 'safety', 'satisfaction',
      'mortality', 'medication errors', 'staff', 'shifts',
    ],
    outcomeExample: 'managed a 26-patient caseload and cut readmissions 14% over two quarters',
    persona: 'a clinical lead who checks registration and revalidation first, then caseload, setting and patient outcomes',
  },
  {
    id: 'education',
    label: 'Education & Training',
    blurb: 'Teaching, lecturing, instructional design and training.',
    coreSkills: [
      'curriculum development', 'lesson planning', 'classroom management', 'assessment',
      'differentiated instruction', 'e-learning', 'moodle', 'canvas lms', 'blackboard',
      'safeguarding', 'special educational needs', 'iep', 'instructional design',
      'student engagement', 'training delivery', 'learning and development',
    ],
    link: 'profile',
    section: 'certifications',
    outcomeWords: [
      'students', 'pupils', 'attainment', 'grades', 'pass rate', 'progress', 'attendance',
      'cohort', 'satisfaction', 'completion', 'retention', 'learners', 'results',
      'engagement', 'outcomes', 'classes',
    ],
    outcomeExample: 'raised GCSE pass rate 68% → 84% across a cohort of 120',
    persona: 'a head teacher or training manager who reads for cohort size, attainment data and safeguarding',
  },
  {
    id: 'legal',
    label: 'Legal & Compliance',
    blurb: 'Solicitors, paralegals, contracts, compliance and risk.',
    coreSkills: [
      'legal research', 'contract negotiation', 'litigation', 'corporate law', 'compliance',
      'due diligence', 'risk management', 'gdpr', 'regulatory reporting', 'drafting',
      'case management', 'employment law', 'commercial law', 'aml', 'governance',
      'intellectual property', 'dispute resolution',
    ],
    link: 'profile',
    section: 'certifications',
    outcomeWords: [
      'contracts', 'matters', 'cases', 'caseload', 'value', 'exposure', 'risk',
      'settlement', 'recovery', 'compliance', 'audits', 'breaches', 'savings',
      'turnaround', 'billable', 'clients', 'jurisdictions',
    ],
    outcomeExample: 'negotiated 120+ commercial contracts a year worth £18m, cutting turnaround to 5 days',
    persona: 'a general counsel who reads for jurisdiction, matter value, and whether the candidate is qualified to practise',
  },
  {
    id: 'science',
    label: 'Research & Science',
    blurb: 'Academic research, R&D, laboratory and scientific roles.',
    coreSkills: [
      'research', 'data analysis', 'statistics', 'python', 'r', 'matlab', 'experimental design',
      'literature review', 'laboratory techniques', 'grant writing', 'peer review',
      'scientific writing', 'spss', 'qualitative research', 'quantitative research',
      'clinical trials', 'gmp', 'gcp',
    ],
    link: 'profile',
    section: 'publications',
    outcomeWords: [
      'publications', 'citations', 'grant', 'funding', 'impact factor', 'trials',
      'samples', 'participants', 'cohort', 'accuracy', 'yield', 'experiments',
      'conferences', 'patents', 'peer-reviewed', 'significance',
    ],
    outcomeExample: 'first author on 4 peer-reviewed papers and won a £240k research grant',
    persona: 'a principal investigator who reads publications, funding and methodology before anything else',
  },
  {
    id: 'other',
    label: 'Something else',
    blurb: 'Everything outside the fields above.',
    coreSkills: [],
    link: 'profile',
    section: null,
    outcomeWords: [],
    outcomeExample: 'how many, how much, how fast, or from what to what',
    persona: 'an experienced hiring manager reading against the roles the CV itself claims',
  },
];

const BY_ID = new Map<string, Department>(DEPARTMENTS.map((d) => [d.id, d]));

export const getDepartment = (id: string | undefined): Department | null =>
  (id === undefined ? null : BY_ID.get(id)) ?? null;

/** What each `link` kind is called, and what counts as one. */
export const LINK_LABEL: Record<Department['link'], string> = {
  portfolio: 'portfolio',
  repository: 'code repository or portfolio',
  profile: 'LinkedIn or professional profile',
  none: '',
};
