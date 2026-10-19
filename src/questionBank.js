export const SYLLABUS_VERSIONS = [
  {
    id: 'jee-main-2026',
    exam: 'JEE Main',
    year: 2026,
    label: 'JEE Main 2026 official syllabus',
    sourceUrl: 'https://jeemain.nta.nic.in/',
  },
  {
    id: 'jee-advanced-2026',
    exam: 'JEE Advanced',
    year: 2026,
    label: 'JEE Advanced 2026 official syllabus',
    sourceUrl: 'https://jeeadv.ac.in/documents/jee-advanced-2026-syllabus.pdf',
  },
];

export const SUBJECTS = [
  {
    id: 'physics',
    name: 'Physics',
    chapters: [
      { id: 'current-electricity', name: 'Current Electricity', topics: ['Resistors in series'] },
      { id: 'kinematics', name: 'Kinematics', topics: ['Uniform acceleration'] },
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    chapters: [
      { id: 'some-basic-concepts', name: 'Some Basic Concepts in Chemistry', topics: ['Mole concept'] },
      { id: 'chemical-bonding', name: 'Chemical Bonding and Molecular Structure', topics: ['Molecular geometry'] },
    ],
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    chapters: [
      { id: 'limits', name: 'Limits, Continuity and Differentiability', topics: ['Standard limits'] },
      { id: 'quadratic-equations', name: 'Quadratic Equations', topics: ['Roots and discriminant'] },
    ],
  },
];

export const QUESTION_SOURCES = {
  official_pyq: {
    label: 'Official previous-year question',
    shortLabel: 'Official PYQ',
  },
  verified_practice: {
    label: 'Verified practice question',
    shortLabel: 'Verified practice',
  },
  ai_generated_practice: {
    label: 'AI-generated practice',
    shortLabel: 'AI-generated',
  },
};

export const DEMO_QUESTIONS = [
  {
    id: 'demo-physics-series-resistors',
    subjectId: 'physics',
    chapterId: 'current-electricity',
    topic: 'Resistors in series',
    syllabusVersionId: 'jee-main-2026',
    prompt: 'A 2 Ω resistor and a 4 Ω resistor are connected in series across an ideal 12 V battery. What is the current in the circuit?',
    questionType: 'single_choice',
    difficulty: 'basic',
    marks: 4,
    negativeMarks: 1,
    options: [
      { id: 'a', text: '1 A' },
      { id: 'b', text: '2 A' },
      { id: 'c', text: '3 A' },
      { id: 'd', text: '6 A' },
    ],
    correctOptionIds: ['b'],
    numericalAnswer: null,
    solution: 'In series, the equivalent resistance is 2 + 4 = 6 Ω. Ohm’s law gives I = V/R = 12/6 = 2 A.',
    sourceType: 'ai_generated_practice',
    exam: null,
    examYear: null,
    paper: null,
    sourceUrl: null,
    copyrightPermissionStatus: 'unknown',
    answerVerificationStatus: 'unverified',
    demoSample: true,
  },
  {
    id: 'demo-physics-kinematics',
    subjectId: 'physics',
    chapterId: 'kinematics',
    topic: 'Uniform acceleration',
    syllabusVersionId: 'jee-main-2026',
    prompt: 'A particle starts from rest and moves with constant acceleration 2 m/s² for 3 s. How far does it travel?',
    questionType: 'numerical',
    difficulty: 'basic',
    marks: 4,
    negativeMarks: 0,
    options: [],
    correctOptionIds: [],
    numericalAnswer: '9 m',
    solution: 'Using s = ut + ½at² with u = 0, a = 2 m/s² and t = 3 s gives s = ½ × 2 × 9 = 9 m.',
    sourceType: 'ai_generated_practice',
    exam: null,
    examYear: null,
    paper: null,
    sourceUrl: null,
    copyrightPermissionStatus: 'unknown',
    answerVerificationStatus: 'unverified',
    demoSample: true,
  },
  {
    id: 'demo-chemistry-mole-concept',
    subjectId: 'chemistry',
    chapterId: 'some-basic-concepts',
    topic: 'Mole concept',
    syllabusVersionId: 'jee-main-2026',
    prompt: 'How many moles of oxygen atoms are present in 0.50 mol of CO₂ molecules?',
    questionType: 'single_choice',
    difficulty: 'basic',
    marks: 4,
    negativeMarks: 1,
    options: [
      { id: 'a', text: '0.25 mol' },
      { id: 'b', text: '0.50 mol' },
      { id: 'c', text: '1.00 mol' },
      { id: 'd', text: '2.00 mol' },
    ],
    correctOptionIds: ['c'],
    numericalAnswer: null,
    solution: 'Each CO₂ molecule contains two oxygen atoms. Therefore, 0.50 mol of CO₂ contains 2 × 0.50 = 1.00 mol of oxygen atoms.',
    sourceType: 'ai_generated_practice',
    exam: null,
    examYear: null,
    paper: null,
    sourceUrl: null,
    copyrightPermissionStatus: 'unknown',
    answerVerificationStatus: 'unverified',
    demoSample: true,
  },
  {
    id: 'demo-chemistry-bonding',
    subjectId: 'chemistry',
    chapterId: 'chemical-bonding',
    topic: 'Molecular geometry',
    syllabusVersionId: 'jee-advanced-2026',
    prompt: 'According to the VSEPR model, what is the molecular shape of a water molecule?',
    questionType: 'single_choice',
    difficulty: 'intermediate',
    marks: 4,
    negativeMarks: 1,
    options: [
      { id: 'a', text: 'Linear' },
      { id: 'b', text: 'Trigonal planar' },
      { id: 'c', text: 'Bent (angular)' },
      { id: 'd', text: 'Tetrahedral' },
    ],
    correctOptionIds: ['c'],
    numericalAnswer: null,
    solution: 'Oxygen has two bonding pairs and two lone pairs in H₂O. The electron-pair arrangement is tetrahedral, while the molecular shape (considering atom positions) is bent.',
    sourceType: 'ai_generated_practice',
    exam: null,
    examYear: null,
    paper: null,
    sourceUrl: null,
    copyrightPermissionStatus: 'unknown',
    answerVerificationStatus: 'unverified',
    demoSample: true,
  },
  {
    id: 'demo-mathematics-limit',
    subjectId: 'mathematics',
    chapterId: 'limits',
    topic: 'Standard limits',
    syllabusVersionId: 'jee-main-2026',
    prompt: 'Evaluate limₓ→0 (sin 3x)/(2x).',
    questionType: 'single_choice',
    difficulty: 'intermediate',
    marks: 4,
    negativeMarks: 1,
    options: [
      { id: 'a', text: '0' },
      { id: 'b', text: '1' },
      { id: 'c', text: '3/2' },
      { id: 'd', text: '2/3' },
    ],
    correctOptionIds: ['c'],
    numericalAnswer: null,
    solution: 'Rewrite the expression as (3/2) × (sin 3x)/(3x). Since limᵤ→0 sin u/u = 1, the limit is 3/2.',
    sourceType: 'ai_generated_practice',
    exam: null,
    examYear: null,
    paper: null,
    sourceUrl: null,
    copyrightPermissionStatus: 'unknown',
    answerVerificationStatus: 'unverified',
    demoSample: true,
  },
  {
    id: 'demo-mathematics-quadratic',
    subjectId: 'mathematics',
    chapterId: 'quadratic-equations',
    topic: 'Roots and discriminant',
    syllabusVersionId: 'jee-main-2026',
    prompt: 'For what value of k does x² − 4x + k = 0 have equal real roots?',
    questionType: 'numerical',
    difficulty: 'basic',
    marks: 4,
    negativeMarks: 0,
    options: [],
    correctOptionIds: [],
    numericalAnswer: '4',
    solution: 'Equal roots require discriminant zero: (−4)² − 4(1)(k) = 0. Thus 16 − 4k = 0 and k = 4.',
    sourceType: 'ai_generated_practice',
    exam: null,
    examYear: null,
    paper: null,
    sourceUrl: null,
    copyrightPermissionStatus: 'unknown',
    answerVerificationStatus: 'unverified',
    demoSample: true,
  },
];

const SUBJECT_IDS = new Set(SUBJECTS.map((subject) => subject.id));
const SOURCE_TYPES = new Set(Object.keys(QUESTION_SOURCES));
const QUESTION_TYPES = new Set(['single_choice', 'multiple_select', 'numerical']);
const DIFFICULTIES = new Set(['basic', 'intermediate', 'advanced']);
const COPYRIGHT_STATUSES = new Set([
  'original',
  'permission_granted',
  'public_domain',
  'licensed',
  'unknown',
]);
const VERIFICATION_STATUSES = new Set(['unverified', 'verified', 'disputed']);

export function validateQuestion(question) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) return false;

  const subject = SUBJECTS.find((item) => item.id === question.subjectId);
  const chapter = subject?.chapters.find((item) => item.id === question.chapterId);
  const syllabusVersion = SYLLABUS_VERSIONS.find(
    (version) => version.id === question.syllabusVersionId,
  );
  const optionsAreValid =
    Array.isArray(question.options) &&
    question.options.every(
      (option) =>
        option &&
        typeof option === 'object' &&
        !Array.isArray(option) &&
        typeof option.id === 'string' &&
        option.id.length > 0 &&
        typeof option.text === 'string' &&
        option.text.length > 0,
    );
  const optionIds = optionsAreValid ? question.options.map((option) => option.id) : [];
  const hasChoiceOptions = question.questionType === 'single_choice' || question.questionType === 'multiple_select';
  const validSourceType = SOURCE_TYPES.has(question.sourceType);
  const hasOfficialProvenance =
    typeof question.exam === 'string' &&
    Number.isInteger(question.examYear) &&
    typeof question.paper === 'string' &&
    typeof question.sourceUrl === 'string' &&
    /^https?:\/\/\S+$/.test(question.sourceUrl);

  return Boolean(
    typeof question.id === 'string' &&
      question.id.length > 0 &&
      subject &&
      chapter &&
      chapter.topics.includes(question.topic) &&
      syllabusVersion &&
      typeof question.prompt === 'string' &&
      question.prompt.length > 0 &&
      QUESTION_TYPES.has(question.questionType) &&
      DIFFICULTIES.has(question.difficulty) &&
      Number.isFinite(question.marks) &&
      question.marks > 0 &&
      Number.isFinite(question.negativeMarks) &&
      question.negativeMarks >= 0 &&
      optionsAreValid &&
      new Set(optionIds).size === optionIds.length &&
      Array.isArray(question.correctOptionIds) &&
      typeof question.solution === 'string' &&
      question.solution.length > 0 &&
      validSourceType &&
      COPYRIGHT_STATUSES.has(question.copyrightPermissionStatus) &&
      VERIFICATION_STATUSES.has(question.answerVerificationStatus) &&
      typeof question.demoSample === 'boolean' &&
      (hasChoiceOptions
        ? optionIds.length >= 2 &&
          question.correctOptionIds.length >= 1 &&
          (question.questionType !== 'single_choice' || question.correctOptionIds.length === 1) &&
          question.correctOptionIds.every((id) => optionIds.includes(id)) &&
          question.numericalAnswer === null
        : optionIds.length === 0 &&
          question.correctOptionIds.length === 0 &&
          typeof question.numericalAnswer === 'string' &&
          question.numericalAnswer.length > 0) &&
      (question.sourceType !== 'official_pyq' ||
        (hasOfficialProvenance &&
          syllabusVersion.exam === question.exam &&
          syllabusVersion.year === question.examYear &&
          question.answerVerificationStatus === 'verified' &&
          question.demoSample === false)) &&
      (question.sourceType !== 'verified_practice' ||
        question.answerVerificationStatus === 'verified') &&
      (question.sourceType !== 'ai_generated_practice' ||
        (!question.exam && !question.examYear && !question.paper && !question.sourceUrl)) &&
      SUBJECT_IDS.has(question.subjectId),
  );
}

export function filterQuestions(questions, filters = {}) {
  return questions.filter((question) => {
    if (filters.subjectId && question.subjectId !== filters.subjectId) return false;
    if (filters.chapterId && question.chapterId !== filters.chapterId) return false;
    if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
    if (filters.questionType && question.questionType !== filters.questionType) return false;
    return true;
  });
}

export function sourceLabel(sourceType, demoSample = false) {
  const source = QUESTION_SOURCES[sourceType];
  if (!source) throw new Error(`Unknown question source: ${sourceType}`);
  return demoSample && sourceType === 'ai_generated_practice'
    ? `${source.label} · Demo sample`
    : source.label;
}
