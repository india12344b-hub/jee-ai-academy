import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_QUESTIONS,
  QUESTION_SOURCES,
  filterQuestions,
  sourceLabel,
  validateQuestion,
} from './questionBank.js';

test('all demonstration questions satisfy the question schema', () => {
  assert.equal(DEMO_QUESTIONS.length, 6);
  assert.ok(DEMO_QUESTIONS.every(validateQuestion));
  assert.ok(DEMO_QUESTIONS.every((question) => question.demoSample));
  assert.ok(DEMO_QUESTIONS.every((question) => question.answerVerificationStatus === 'unverified'));
});

test('schema rejects false official provenance and unverified verified-practice entries', () => {
  const sample = DEMO_QUESTIONS[0];
  assert.equal(validateQuestion({ ...sample, sourceType: 'official_pyq' }), false);
  assert.equal(validateQuestion({ ...sample, sourceType: 'verified_practice' }), false);
  assert.equal(validateQuestion({ ...sample, questionType: 'single_choice', options: [] }), false);
  assert.equal(validateQuestion({ ...sample, correctOptionIds: ['a', 'b'] }), false);
  assert.equal(validateQuestion({ ...sample, difficulty: 'impossible' }), false);
});

test('official PYQs require matching syllabus-year provenance and verified answers', () => {
  const officialQuestion = {
    ...DEMO_QUESTIONS[0],
    sourceType: 'official_pyq',
    exam: 'JEE Main',
    examYear: 2026,
    paper: 'Paper 1, Session 1',
    sourceUrl: 'https://example.test/official-question',
    answerVerificationStatus: 'verified',
    demoSample: false,
  };
  assert.equal(validateQuestion(officialQuestion), true);
  assert.equal(validateQuestion({ ...officialQuestion, examYear: 2025 }), false);
  assert.equal(validateQuestion({ ...officialQuestion, sourceUrl: 'javascript:alert(1)' }), false);
});

test('filters can be combined across subject, chapter, difficulty and question type', () => {
  const results = filterQuestions(DEMO_QUESTIONS, {
    subjectId: 'physics',
    chapterId: 'current-electricity',
    difficulty: 'basic',
    questionType: 'single_choice',
  });
  assert.deepEqual(results.map((question) => question.id), ['demo-physics-series-resistors']);
  assert.equal(filterQuestions(DEMO_QUESTIONS, { questionType: 'numerical' }).length, 2);
  assert.equal(filterQuestions(DEMO_QUESTIONS, { subjectId: 'chemistry' }).length, 2);
});

test('source labels keep AI-generated samples distinct from official PYQs', () => {
  assert.equal(
    sourceLabel('ai_generated_practice', true),
    'AI-generated practice · Demo sample',
  );
  assert.equal(sourceLabel('official_pyq'), QUESTION_SOURCES.official_pyq.label);
  assert.equal(sourceLabel('verified_practice'), QUESTION_SOURCES.verified_practice.label);
  assert.notEqual(sourceLabel('ai_generated_practice', true), QUESTION_SOURCES.official_pyq.label);
  assert.notEqual(sourceLabel('verified_practice'), sourceLabel('official_pyq'));
  assert.notEqual(sourceLabel('verified_practice'), sourceLabel('ai_generated_practice'));
  assert.throws(() => sourceLabel('unrecognized_source'), /Unknown question source/);
});
