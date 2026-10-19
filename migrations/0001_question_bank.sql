PRAGMA foreign_keys = ON;

CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE syllabus_versions (
  id TEXT PRIMARY KEY,
  exam TEXT NOT NULL CHECK (exam IN ('JEE Main', 'JEE Advanced')),
  year INTEGER NOT NULL,
  label TEXT NOT NULL,
  source_url TEXT NOT NULL,
  retrieved_at TEXT,
  UNIQUE (exam, year)
);

CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  syllabus_version_id TEXT NOT NULL REFERENCES syllabus_versions(id),
  name TEXT NOT NULL,
  UNIQUE (subject_id, syllabus_version_id, name),
  UNIQUE (id, subject_id, syllabus_version_id)
);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id),
  name TEXT NOT NULL,
  UNIQUE (chapter_id, name),
  UNIQUE (id, chapter_id)
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  chapter_id TEXT NOT NULL,
  topic_id TEXT,
  syllabus_version_id TEXT NOT NULL REFERENCES syllabus_versions(id),
  prompt TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_select', 'numerical')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
  marks REAL NOT NULL CHECK (marks > 0),
  negative_marks REAL NOT NULL DEFAULT 0 CHECK (negative_marks >= 0),
  source_type TEXT NOT NULL CHECK (source_type IN ('official_pyq', 'verified_practice', 'ai_generated_practice')),
  exam TEXT,
  exam_year INTEGER,
  paper TEXT,
  source_url TEXT,
  copyright_permission_status TEXT NOT NULL CHECK (
    copyright_permission_status IN ('original', 'permission_granted', 'public_domain', 'licensed', 'unknown')
  ),
  answer_verification_status TEXT NOT NULL CHECK (
    answer_verification_status IN ('unverified', 'verified', 'disputed')
  ),
  is_demo_sample INTEGER NOT NULL DEFAULT 0 CHECK (is_demo_sample IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chapter_id, subject_id, syllabus_version_id)
    REFERENCES chapters(id, subject_id, syllabus_version_id),
  FOREIGN KEY (topic_id, chapter_id) REFERENCES topics(id, chapter_id),
  CHECK (
    source_type != 'official_pyq' OR (
      exam IS NOT NULL AND exam_year IS NOT NULL AND paper IS NOT NULL AND source_url IS NOT NULL
      AND answer_verification_status = 'verified' AND is_demo_sample = 0
    )
  ),
  CHECK (source_type != 'verified_practice' OR answer_verification_status = 'verified'),
  CHECK (
    source_type != 'ai_generated_practice' OR (
      exam IS NULL AND exam_year IS NULL AND paper IS NULL AND source_url IS NULL
    )
  )
);

CREATE INDEX questions_subject_chapter_idx ON questions(subject_id, chapter_id);
CREATE INDEX questions_filters_idx ON questions(difficulty, question_type, source_type);

CREATE TABLE answer_options (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  PRIMARY KEY (question_id, option_id),
  UNIQUE (question_id, position)
);

CREATE TABLE solutions (
  question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  answer_json TEXT NOT NULL,
  explanation TEXT NOT NULL,
  verified_by TEXT,
  verified_at TEXT
);
