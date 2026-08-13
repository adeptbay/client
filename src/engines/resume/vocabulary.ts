/**
 * The word lists the checker judges against.
 *
 * Kept in one file, separate from the rules that use them, for one
 * reason: these are the part that dates. A rule like "a bullet should
 * carry a measurable outcome" is as true in 2035 as it was in 2005. The
 * list of what counts as a hard skill is true for about eighteen months.
 *
 * Everything here is deliberately industry-neutral. A CV checker that
 * only understands software engineering is a software CV checker, and
 * the people most badly served by the existing tools — nurses, teachers,
 * accountants, logistics managers — are exactly the ones it would fail.
 */

/* ═══════════════════════════════════════════════════════════════════
   Section headings
   ═══════════════════════════════════════════════════════════════════ */

export type SectionKind =
  | 'contact'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'publications'
  | 'volunteer'
  | 'languages'
  | 'interests'
  | 'references'
  | 'other';

/**
 * Heading synonyms, longest-match first within each kind.
 *
 * The list is long on purpose. "Professional Experience", "Career
 * History", "Employment", "Work History" and "Relevant Experience" are
 * the same section, and a checker that recognises only the first of
 * those reports a missing Experience section to four out of five people.
 */
export const SECTION_SYNONYMS: { kind: SectionKind; patterns: string[] }[] = [
  {
    kind: 'summary',
    patterns: [
      'professional summary', 'career summary', 'executive summary', 'personal statement',
      'career objective', 'professional profile', 'personal profile', 'career profile',
      'about me', 'summary of qualifications', 'profile summary', 'objective', 'summary',
      'profile', 'overview', 'introduction',
    ],
  },
  {
    kind: 'experience',
    patterns: [
      'professional experience', 'work experience', 'employment history', 'career history',
      'relevant experience', 'industry experience', 'clinical experience', 'teaching experience',
      'research experience', 'work history', 'employment', 'experience', 'career',
      'positions held', 'appointments',
    ],
  },
  {
    kind: 'education',
    patterns: [
      'education and training', 'academic background', 'academic qualifications',
      'educational qualifications', 'education & training', 'qualifications', 'education',
      'academics', 'academic history', 'training',
    ],
  },
  {
    kind: 'skills',
    patterns: [
      'technical skills', 'core competencies', 'key skills', 'areas of expertise',
      'skills and competencies', 'professional skills', 'competencies', 'expertise',
      'skills summary', 'core skills', 'tools and technologies', 'technologies',
      'proficiencies', 'skills',
    ],
  },
  {
    kind: 'projects',
    patterns: [
      'selected projects', 'key projects', 'personal projects', 'academic projects',
      'portfolio', 'projects',
    ],
  },
  {
    kind: 'certifications',
    patterns: [
      'certifications and licenses', 'licenses and certifications', 'professional development',
      'courses and certifications', 'certifications', 'certificates', 'licenses',
      'accreditations', 'courses',
    ],
  },
  {
    kind: 'awards',
    patterns: [
      'awards and honours', 'awards and honors', 'honours and awards', 'achievements',
      'accomplishments', 'awards', 'honours', 'honors', 'recognition',
    ],
  },
  {
    kind: 'publications',
    patterns: ['publications and presentations', 'publications', 'presentations', 'conferences', 'patents'],
  },
  {
    kind: 'volunteer',
    patterns: [
      'volunteer experience', 'community involvement', 'voluntary work', 'volunteering',
      'extracurricular activities', 'leadership and activities', 'volunteer',
    ],
  },
  { kind: 'languages', patterns: ['language skills', 'languages'] },
  { kind: 'interests', patterns: ['interests and hobbies', 'hobbies and interests', 'interests', 'hobbies', 'activities'] },
  { kind: 'references', patterns: ['references available', 'referees', 'references'] },
];

/* ═══════════════════════════════════════════════════════════════════
   Verbs
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Base-form action verbs. Inflections are handled by stemming at the
 * call site, so "led", "leads" and "leading" all resolve to "lead".
 *
 * Grouped by what the verb claims, because the groups are what makes
 * the advice specific: a CV where every bullet is a `built` verb reads
 * as an individual contributor no matter what the job title says.
 */
export const ACTION_VERBS: Record<string, string[]> = {
  leadership: [
    'lead', 'manage', 'direct', 'head', 'supervise', 'oversee', 'chair', 'mentor',
    'coach', 'guide', 'coordinate', 'orchestrate', 'spearhead', 'champion', 'drive',
    'found', 'establish', 'hire', 'recruit', 'onboard', 'delegate', 'mobilise', 'mobilize',
  ],
  achievement: [
    'achieve', 'deliver', 'exceed', 'surpass', 'win', 'secure', 'earn', 'attain',
    'complete', 'close', 'land', 'capture', 'outperform', 'beat', 'accomplish',
  ],
  improvement: [
    'improve', 'increase', 'reduce', 'cut', 'optimise', 'optimize', 'streamline',
    'accelerate', 'boost', 'grow', 'scale', 'enhance', 'strengthen', 'raise', 'lower',
    'minimise', 'minimize', 'maximise', 'maximize', 'eliminate', 'consolidate',
    'standardise', 'standardize', 'simplify', 'refine', 'upgrade', 'modernise', 'modernize',
    'transform', 'turn', 'revamp', 'overhaul', 'restructure',
  ],
  creation: [
    'build', 'create', 'design', 'develop', 'launch', 'ship', 'implement', 'introduce',
    'architect', 'engineer', 'produce', 'author', 'compose', 'construct', 'prototype',
    'pioneer', 'initiate', 'originate', 'formulate', 'draft', 'write', 'publish', 'code',
    'program', 'deploy', 'configure', 'integrate', 'automate', 'migrate', 'rebuild',
  ],
  analysis: [
    'analyse', 'analyze', 'evaluate', 'assess', 'audit', 'investigate', 'research',
    'diagnose', 'measure', 'model', 'forecast', 'benchmark', 'quantify', 'validate',
    'test', 'monitor', 'track', 'identify', 'determine', 'examine', 'review', 'interpret',
  ],
  communication: [
    'present', 'negotiate', 'persuade', 'advise', 'consult', 'brief', 'communicate',
    'collaborate', 'partner', 'liaise', 'facilitate', 'moderate', 'train', 'educate',
    'instruct', 'counsel', 'advocate', 'represent', 'pitch', 'influence', 'align',
  ],
  operations: [
    'execute', 'run', 'operate', 'administer', 'maintain', 'support', 'resolve',
    'troubleshoot', 'process', 'schedule', 'plan', 'organise', 'organize', 'allocate',
    'budget', 'forecast', 'procure', 'source', 'negotiate', 'ensure', 'enforce', 'comply',
    'document', 'report', 'serve', 'treat', 'care', 'teach', 'sell', 'market', 'recruit',
  ],
};

export const ALL_ACTION_VERBS = new Set(Object.values(ACTION_VERBS).flat());

export function verbGroupOf(base: string): string | null {
  for (const [group, verbs] of Object.entries(ACTION_VERBS)) {
    if (verbs.includes(base)) return group;
  }
  return null;
}

/** Irregular past forms that stemming cannot reach. */
export const IRREGULAR_PAST: Record<string, string> = {
  led: 'lead', built: 'build', ran: 'run', won: 'win', wrote: 'write', drove: 'drive',
  grew: 'grow', held: 'hold', made: 'make', met: 'meet', sold: 'sell', spoke: 'speak',
  taught: 'teach', took: 'take', brought: 'bring', bought: 'buy', chose: 'choose',
  cut: 'cut', dealt: 'deal', found: 'find', got: 'get', gave: 'give', kept: 'keep',
  left: 'leave', lost: 'lose', paid: 'pay', put: 'put', rose: 'rise', set: 'set',
  shot: 'shoot', sought: 'seek', spent: 'spend', stood: 'stand', struck: 'strike',
  taken: 'take', thought: 'think', understood: 'understand', oversaw: 'oversee',
  undertook: 'undertake', rebuilt: 'rebuild', shipped: 'ship', began: 'begin',
};

/**
 * Reduce an inflected verb to its base form.
 *
 * Crude by design — a full lemmatiser would be a dependency and a
 * megabyte, and the only words reaching this function are the first
 * word of a CV bullet, which is a verb in ninety-odd percent of cases.
 */
export function stemVerb(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length < 3) return w;

  const irregular = IRREGULAR_PAST[w];
  if (irregular !== undefined) return irregular;
  if (ALL_ACTION_VERBS.has(w)) return w;

  if (w.endsWith('ied')) {
    const base = `${w.slice(0, -3)}y`;
    if (ALL_ACTION_VERBS.has(base)) return base;
  }
  if (w.endsWith('ed')) {
    const dropD = w.slice(0, -1);
    if (ALL_ACTION_VERBS.has(dropD)) return dropD; // manage → managed
    const dropEd = w.slice(0, -2);
    if (ALL_ACTION_VERBS.has(dropEd)) return dropEd; // launch → launched
    // Doubled consonant: plan → planned
    if (dropEd.length > 2 && dropEd[dropEd.length - 1] === dropEd[dropEd.length - 2]) {
      const undoubled = dropEd.slice(0, -1);
      if (ALL_ACTION_VERBS.has(undoubled)) return undoubled;
    }
  }
  if (w.endsWith('ing')) {
    const dropIng = w.slice(0, -3);
    if (ALL_ACTION_VERBS.has(dropIng)) return dropIng;
    if (ALL_ACTION_VERBS.has(`${dropIng}e`)) return `${dropIng}e`; // manage → managing
    if (dropIng.length > 2 && dropIng[dropIng.length - 1] === dropIng[dropIng.length - 2]) {
      const undoubled = dropIng.slice(0, -1);
      if (ALL_ACTION_VERBS.has(undoubled)) return undoubled;
    }
  }
  if (w.endsWith('s') && !w.endsWith('ss')) {
    const singular = w.slice(0, -1);
    if (ALL_ACTION_VERBS.has(singular)) return singular;
  }
  return w;
}

export type VerbTense = 'past' | 'present' | 'gerund' | 'unknown';

export function tenseOf(word: string): VerbTense {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (IRREGULAR_PAST[w] !== undefined) return 'past';
  if (w.endsWith('ing')) return 'gerund';
  if (w.endsWith('ed')) return 'past';
  if (ALL_ACTION_VERBS.has(w)) return 'present';
  if (w.endsWith('s') && ALL_ACTION_VERBS.has(w.slice(0, -1))) return 'present';
  return 'unknown';
}

/* ═══════════════════════════════════════════════════════════════════
   Phrases that cost points
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Openers that describe a job description rather than a person's work.
 * "Responsible for the component library" tells a reader what the role
 * was; "Cut component library bundle size 40%" tells them what you did.
 */
export const WEAK_OPENERS: string[] = [
  'responsible for', 'duties included', 'duties involved', 'tasked with', 'in charge of',
  'worked on', 'worked with', 'worked as', 'helped with', 'helped to', 'assisted with',
  'assisted in', 'involved in', 'participated in', 'took part in', 'part of a team',
  'was part of', 'contributed to', 'supported the', 'my role was', 'my job was',
  'accountable for', 'entrusted with', 'handled', 'dealt with', 'looked after',
  'responsibilities include', 'responsibilities included', 'key responsibilities',
  'day to day', 'day-to-day running',
];

/**
 * Claims that every applicant makes and none evidences. They occupy the
 * space a measurable result should be in, which is the actual cost.
 */
export const CLICHE_CLAIMS: string[] = [
  'team player', 'hard worker', 'hard working', 'hardworking', 'detail oriented',
  'detail-oriented', 'results driven', 'results-driven', 'results oriented',
  'self motivated', 'self-motivated', 'self starter', 'self-starter', 'go getter',
  'go-getter', 'think outside the box', 'thinking outside the box', 'outside the box',
  'proven track record', 'track record of success', 'excellent communication skills',
  'strong communication skills', 'good communication skills', 'excellent interpersonal',
  'strong work ethic', 'works well under pressure', 'work well under pressure',
  'fast learner', 'quick learner', 'passionate about', 'dynamic professional',
  'highly motivated', 'goal oriented', 'goal-oriented', 'people person',
  'synergy', 'synergies', 'value add', 'value-add', 'best of breed', 'win win',
  'wearing many hats', 'wear many hats', 'ninja', 'rockstar', 'rock star', 'guru',
  'thought leader', 'seasoned professional', 'multitasker', 'multi-tasker',
];

/** Vague qualifiers: they weaken a claim without shortening it. */
export const HEDGE_WORDS: string[] = [
  'various', 'several', 'numerous', 'multiple', 'many', 'some', 'a number of',
  'significantly', 'substantially', 'greatly', 'successfully', 'effectively',
  'efficiently', 'consistently', 'actively', 'closely', 'heavily', 'extensively',
  'basically', 'essentially', 'literally', 'really', 'very', 'quite', 'fairly',
];

/** Skill claims with no evidence behind them. */
export const WEAK_SKILL_QUALIFIERS: string[] = [
  'familiar with', 'exposure to', 'knowledge of', 'basic understanding of',
  'working knowledge of', 'some experience with', 'aware of', 'interested in',
];

/** First person breaks CV convention in every market. */
export const FIRST_PERSON: string[] = [
  'i ', 'i,', "i'", 'my ', 'me ', 'mine ', 'myself', 'we ', 'our ', 'us ',
];

/**
 * Personal details that are illegal to ask for in the US, UK, Canada and
 * most of the EU, and that give a screener a reason to discard the file.
 * In parts of South Asia, the Gulf and continental Europe some of these
 * are still conventional — so this is reported as a market-dependent
 * note, never as a straight error.
 */
export const SENSITIVE_FIELDS: { label: string; patterns: RegExp[] }[] = [
  { label: 'date of birth', patterns: [/\bdate of birth\b/i, /\bd\.?o\.?b\.?\b/i, /\bborn on\b/i] },
  { label: 'age', patterns: [/\bage\s*[:–-]\s*\d{2}\b/i, /\b\d{2}\s+years?\s+old\b/i] },
  { label: 'marital status', patterns: [/\bmarital status\b/i, /\bmarried\b|\bunmarried\b|\bsingle\b(?=\s*[,.\n])/i] },
  { label: 'gender', patterns: [/\bgender\s*[:–-]/i, /\bsex\s*[:–-]\s*(male|female)/i] },
  { label: 'nationality or religion', patterns: [/\bnationality\s*[:–-]/i, /\breligion\s*[:–-]/i, /\bcaste\s*[:–-]/i] },
  { label: "father's or spouse's name", patterns: [/\bfather'?s? name\b/i, /\bspouse'?s? name\b/i, /\bmother'?s? name\b/i] },
  { label: 'a full home address', patterns: [/\b(house|flat|apt|apartment)\s*(no\.?|#)\s*\d+/i, /\b\d{1,4}\s+[A-Z][a-z]+\s+(street|road|avenue|lane)\b.*\b\d{4,6}\b/] },
  { label: 'national ID or passport number', patterns: [/\b(nid|national id|passport)\s*(no\.?|number|#)?\s*[:–-]?\s*[A-Z0-9]{6,}/i, /\bssn\b/i] },
];

/* ═══════════════════════════════════════════════════════════════════
   Quantification
   ═══════════════════════════════════════════════════════════════════ */

/**
 * What counts as a measurable outcome.
 *
 * Deliberately excludes a bare year — "Joined in 2019" is a date, not a
 * result, and counting it would let a CV full of dates score as a CV
 * full of achievements. Scale words ("team of 12", "40+ clients") do
 * count, because headcount and volume are results in most industries.
 */
export const METRIC_PATTERNS: { kind: string; pattern: RegExp }[] = [
  // The `\b` belongs to the spelled-out forms only. Putting one after the
  // `%` alternative made "cut churn 34%" unmatchable, because a word
  // boundary cannot follow `%` at the end of a clause — and that is the
  // single most common way a CV states a result.
  { kind: 'percentage', pattern: /\b\d{1,3}(?:\.\d+)?\s*(?:%|percent(?:age)?(?:\s+points?)?\b|pp\b)/gi },
  { kind: 'money', pattern: /(?:[$£€¥₹৳]|\b(?:usd|eur|gbp|inr|bdt|aud|cad)\b)\s?\d[\d,.]*\s?(?:k|m|bn|b|million|billion|thousand|lakh|crore)?/gi },
  { kind: 'multiple', pattern: /\b\d+(?:\.\d+)?\s?x\b/gi },
  // Up to three words may sit between the figure and the thing counted:
  // "12 responsive marketing sites" is as quantified as "12 sites".
  { kind: 'scale', pattern: /\b\d[\d,]*\+?\s+(?:[a-z][a-z-]*\s+){0,3}(?:users?|customers?|clients?|patients?|students?|employees?|staff|people|members?|accounts?|stores?|sites?|units?|orders?|tickets?|calls?|articles?|records?|transactions?|downloads?|installs?|subscribers?|visitors?|projects?|campaigns?|reports?|markets?|countries|branches|vendors?|suppliers?)\b/gi },
  { kind: 'team size', pattern: /\bteam of\s+\d+|\b\d+[\s-]+(?:person|member|engineer|developer|analyst|nurse|volunteer)s?\b/gi },
  { kind: 'time saved', pattern: /\b\d+(?:\.\d+)?\s*(?:hours?|hrs?|days?|weeks?|months?|minutes?|mins?|seconds?|secs?|ms)\b/gi },
  { kind: 'rank', pattern: /\b(?:top|first|no\.?|#)\s?\d{1,3}(?:%|st|nd|rd|th)?\b/gi },
  { kind: 'volume', pattern: /\b\d[\d,]*(?:\.\d+)?\s?(?:k|m|bn|million|billion|thousand|lakh|crore)\b/gi },
];

/* ═══════════════════════════════════════════════════════════════════
   Skills

   Not a taxonomy — a recogniser. It exists so the tool can say "you
   list 14 skills, 9 of which the advert asks for" without the user
   having to tag anything. Cross-industry on purpose.
   ═══════════════════════════════════════════════════════════════════ */

export const KNOWN_SKILLS: string[] = [
  // software and data
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'perl', 'r', 'matlab', 'dart', 'elixir',
  'react', 'next.js', 'vue', 'angular', 'svelte', 'node.js', 'express', 'django',
  'flask', 'fastapi', 'spring', 'spring boot', '.net', 'laravel', 'rails', 'jquery',
  'html', 'css', 'sass', 'tailwind', 'bootstrap', 'webpack', 'vite', 'graphql', 'rest',
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
  'dynamodb', 'sqlite', 'oracle', 'snowflake', 'bigquery', 'redshift', 'databricks',
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ansible',
  'jenkins', 'github actions', 'gitlab ci', 'ci/cd', 'linux', 'bash', 'git', 'nginx',
  'kafka', 'rabbitmq', 'airflow', 'spark', 'hadoop', 'dbt', 'etl',
  'machine learning', 'deep learning', 'nlp', 'computer vision', 'tensorflow',
  'pytorch', 'scikit-learn', 'pandas', 'numpy', 'keras', 'llm', 'generative ai',
  'data analysis', 'data science', 'data engineering', 'statistics', 'a/b testing',
  'tableau', 'power bi', 'looker', 'qlik', 'excel', 'vba', 'google analytics',
  'jest', 'cypress', 'playwright', 'selenium', 'pytest', 'junit', 'unit testing',
  'agile', 'scrum', 'kanban', 'jira', 'confluence', 'devops', 'sre', 'microservices',
  'api design', 'system design', 'oop', 'functional programming', 'tdd',
  'cybersecurity', 'penetration testing', 'siem', 'iso 27001', 'soc 2', 'gdpr',
  'android', 'ios', 'react native', 'flutter', 'unity', 'unreal',

  // design and product
  'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'indesign', 'after effects',
  'premiere pro', 'canva', 'ux design', 'ui design', 'user research', 'wireframing',
  'prototyping', 'design systems', 'accessibility', 'wcag', 'usability testing',
  'product management', 'roadmapping', 'user stories', 'product strategy', 'okrs',

  // marketing, sales and comms
  'seo', 'sem', 'ppc', 'google ads', 'meta ads', 'linkedin ads', 'content marketing',
  'copywriting', 'email marketing', 'marketing automation', 'hubspot', 'mailchimp',
  'klaviyo', 'salesforce', 'crm', 'social media marketing', 'brand strategy',
  'market research', 'conversion optimisation', 'conversion optimization',
  'google tag manager', 'wordpress', 'shopify', 'webflow', 'hootsuite', 'semrush',
  'ahrefs', 'lead generation', 'account management', 'b2b sales', 'cold calling',
  'negotiation', 'public relations', 'event management', 'community management',

  // finance, legal and admin
  'financial modelling', 'financial modeling', 'financial analysis', 'forecasting',
  'budgeting', 'variance analysis', 'accounts payable', 'accounts receivable',
  'bookkeeping', 'reconciliation', 'payroll', 'taxation', 'auditing', 'ifrs', 'gaap',
  'sap', 'oracle financials', 'quickbooks', 'xero', 'netsuite', 'tally',
  'risk management', 'compliance', 'due diligence', 'valuation', 'm&a',
  'contract negotiation', 'legal research', 'litigation', 'corporate law',
  'cpa', 'acca', 'cfa', 'cima', 'frm',

  // operations, supply chain and manufacturing
  'supply chain', 'logistics', 'procurement', 'inventory management', 'warehousing',
  'demand planning', 'lean', 'six sigma', 'kaizen', '5s', 'process improvement',
  'quality assurance', 'quality control', 'iso 9001', 'production planning',
  'autocad', 'solidworks', 'revit', 'ms project', 'primavera', 'erp', 'wms',
  'hse', 'health and safety', 'root cause analysis', 'vendor management',

  // healthcare and education
  'patient care', 'clinical documentation', 'triage', 'phlebotomy', 'medication administration',
  'electronic health records', 'epic', 'cerner', 'hipaa', 'bls', 'acls', 'cpr',
  'infection control', 'care planning', 'nursing', 'pharmacology', 'radiology',
  'curriculum development', 'lesson planning', 'classroom management', 'assessment',
  'differentiated instruction', 'iep', 'e-learning', 'moodle', 'blackboard', 'canvas lms',

  // people and general
  'recruitment', 'talent acquisition', 'onboarding', 'performance management',
  'employee relations', 'hris', 'workday', 'bamboohr', 'compensation and benefits',
  'learning and development', 'stakeholder management', 'change management',
  'project management', 'pmp', 'prince2', 'budget management', 'team leadership',
  'cross-functional collaboration', 'strategic planning', 'business development',
  'customer service', 'technical writing', 'data entry', 'microsoft office',
  'powerpoint', 'word', 'outlook', 'google workspace', 'slack', 'notion', 'asana',
  'trello', 'monday.com', 'zendesk', 'servicenow',
];

const SKILL_SET = new Set(KNOWN_SKILLS);

/** Words that would otherwise be mistaken for skills in a job advert. */
export const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'will', 'have', 'has',
  'this', 'that', 'from', 'they', 'their', 'them', 'about', 'into', 'more', 'most',
  'other', 'some', 'such', 'than', 'then', 'these', 'those', 'been', 'being', 'were',
  'was', 'work', 'working', 'team', 'teams', 'role', 'job', 'company', 'business',
  'experience', 'experienced', 'years', 'year', 'skills', 'skill', 'ability', 'able',
  'strong', 'good', 'great', 'excellent', 'must', 'should', 'would', 'could', 'can',
  'who', 'what', 'when', 'where', 'why', 'how', 'all', 'any', 'each', 'every', 'both',
  'well', 'also', 'across', 'within', 'while', 'well', 'plus', 'etc', 'via', 'per',
  'new', 'high', 'level', 'part', 'full', 'time', 'help', 'helping', 'looking', 'seeking',
  'candidate', 'candidates', 'applicant', 'applicants', 'position', 'opportunity',
  'responsibilities', 'requirements', 'qualifications', 'preferred', 'required',
  'including', 'include', 'includes', 'ensure', 'ensuring', 'support', 'supporting',
  'apply', 'please', 'offer', 'benefits', 'salary', 'remote', 'hybrid', 'office',
]);

export const isKnownSkill = (token: string): boolean => SKILL_SET.has(token.toLowerCase());

/* ═══════════════════════════════════════════════════════════════════
   Degrees and dates
   ═══════════════════════════════════════════════════════════════════ */

export const DEGREE_PATTERNS: RegExp[] = [
  /\b(b\.?\s?(?:sc|a|s|eng|com|ba|tech|ed)|bachelor(?:'?s)?)\b/i,
  /\b(m\.?\s?(?:sc|a|s|eng|ba|com|tech|ed|phil)|master(?:'?s)?|mba)\b/i,
  /\b(ph\.?\s?d|doctorate|doctoral|d\.?phil)\b/i,
  /\b(associate(?:'?s)? degree|diploma|hnd|hnc|foundation degree)\b/i,
  /\b(high school|secondary school|a[- ]levels?|gcse|hsc|ssc|matriculation|intermediate)\b/i,
  /\b(md|dds|dvm|jd|llb|llm|bds|mbbs|pharmd|bsn|msn)\b/i,
];

export const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

export const PRESENT_WORDS = ['present', 'current', 'currently', 'now', 'today', 'ongoing', 'to date', 'date'];

/* ═══════════════════════════════════════════════════════════════════
   Bullet glyphs

   A CV can mark a list with any of these, and a checker that only knows
   "•" reports "no bullet points found" on a CV written in Word with
   dashes. All of them count.
   ═══════════════════════════════════════════════════════════════════ */

export const BULLET_GLYPHS = ['•', '·', '‣', '▪', '▫', '◦', '●', '○', '■', '□', '–', '—', '-', '*', '>', '»', '❖', '✓', '✔', '★', '+'];

const BULLET_SET = new Set(BULLET_GLYPHS);

export function stripBullet(line: string): { text: string; hadGlyph: boolean } {
  const trimmed = line.trim();
  const first = trimmed[0];
  if (first !== undefined && BULLET_SET.has(first)) {
    return { text: trimmed.slice(1).trim(), hadGlyph: true };
  }
  // Numbered lists: "1." / "1)" / "(1)"
  const numbered = /^\(?\d{1,2}[.)]\s+/.exec(trimmed);
  if (numbered) return { text: trimmed.slice(numbered[0].length).trim(), hadGlyph: true };
  return { text: trimmed, hadGlyph: false };
}
