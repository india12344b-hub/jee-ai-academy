import { useMemo, useState } from 'react';
import {
  DEMO_QUESTIONS,
  SUBJECTS,
  SYLLABUS_VERSIONS,
  filterQuestions,
  sourceLabel,
  validateQuestion,
} from './questionBank.js';

export default function QuestionBank() {
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [revealedIds, setRevealedIds] = useState(() => new Set());
  const selectedSubject = SUBJECTS.find((subject) => subject.id === subjectId);
  const questions = useMemo(
    () =>
      filterQuestions(DEMO_QUESTIONS, {
        subjectId,
        chapterId,
        difficulty,
        questionType,
      }),
    [subjectId, chapterId, difficulty, questionType],
  );

  function updateSubject(value) {
    setSubjectId(value);
    setChapterId('');
  }

  function toggleSolution(questionId) {
    setRevealedIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  return (
    <section className="dashboard-section full-section question-bank" aria-labelledby="question-bank-title">
      <div className="question-bank-intro">
        <div>
          <div className="section-eyebrow">LOCAL DEMO DATASET · 6 SAMPLE QUESTIONS</div>
          <h2 id="question-bank-title">Question bank</h2>
          <p>These are demonstration items, not official or verified exam questions. Solutions have not been independently checked.</p>
        </div>
        <span className="question-count">{questions.length} {questions.length === 1 ? 'question' : 'questions'}</span>
      </div>

      <div className="question-filters" aria-label="Filter questions">
        <label>
          Subject
          <select value={subjectId} onChange={(event) => updateSubject(event.target.value)}>
            <option value="">All subjects</option>
            {SUBJECTS.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label>
          Chapter
          <select value={chapterId} onChange={(event) => setChapterId(event.target.value)} disabled={!selectedSubject}>
            <option value="">All chapters</option>
            {selectedSubject?.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
          </select>
        </label>
        <label>
          Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="">All levels</option>
            <option value="basic">Basic</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label>
          Question type
          <select value={questionType} onChange={(event) => setQuestionType(event.target.value)}>
            <option value="">All types</option>
            <option value="single_choice">Single choice</option>
            <option value="multiple_select">Multiple select</option>
            <option value="numerical">Numerical</option>
          </select>
        </label>
      </div>

      <p className="syllabus-note">
        Syllabus mapping uses the 2026 official syllabus versions for JEE Main and JEE Advanced. This is a sample mapping, not a complete syllabus.
        {' '}
        {SYLLABUS_VERSIONS.map((version, index) => (
          <span key={version.id}>
            {index > 0 && ' · '}
            <a href={version.sourceUrl} target="_blank" rel="noreferrer">{version.exam} {version.year}</a>
          </span>
        ))}
      </p>

      <div className="question-list" aria-live="polite">
        {questions.map((question) => {
          if (!validateQuestion(question)) return null;
          const subject = SUBJECTS.find((item) => item.id === question.subjectId);
          const chapter = subject.chapters.find((item) => item.id === question.chapterId);
          const syllabus = SYLLABUS_VERSIONS.find((item) => item.id === question.syllabusVersionId);
          const revealed = revealedIds.has(question.id);
          return (
            <article className="question-card" key={question.id}>
              <div className="question-card-meta">
                <span className="question-source-label">{sourceLabel(question.sourceType, question.demoSample)}</span>
                <span>{subject.name} · {chapter.name} · {question.topic}</span>
              </div>
              <p className="question-prompt">{question.prompt}</p>
              {question.options.length > 0 && (
                <ol className="answer-options" type="A">
                  {question.options.map((option) => <li key={option.id}>{option.text}</li>)}
                </ol>
              )}
              <div className="question-card-footer">
                <span>{question.difficulty} · {question.questionType.replace('_', ' ')} · +{question.marks}/−{question.negativeMarks}</span>
                <span>{syllabus.exam} syllabus {syllabus.year}</span>
                <span>Answer: {question.answerVerificationStatus}</span>
                <span>Copyright/permission: {question.copyrightPermissionStatus.replace('_', ' ')}</span>
              </div>
              <button className="solution-toggle" type="button" onClick={() => toggleSolution(question.id)} aria-expanded={revealed}>
                {revealed ? 'Hide solution' : 'Show solution'}
              </button>
              {revealed && (
                <div className="question-solution">
                  <strong>Sample answer: {question.correctOptionIds.length
                    ? question.options.filter((option) => question.correctOptionIds.includes(option.id)).map((option) => option.text).join(', ')
                    : question.numericalAnswer}</strong>
                  <p>{question.solution}</p>
                </div>
              )}
            </article>
          );
        })}
        {!questions.length && <p className="empty-copy">No sample questions match these filters.</p>}
      </div>
    </section>
  );
}
