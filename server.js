const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3030;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(DATA_DIR, 'concept-coach.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const conceptSeeds = {
  rag: {
    title: 'RAG',
    category: 'Retrieval',
    summaryShort: 'RAG 是“先找资料，再让模型回答”的方法。',
    summaryPlain: '你可以把 RAG 理解成开卷考试：模型先去知识库里找和问题最相关的内容，再基于这些内容组织答案。这样能降低胡编乱造，也更容易接企业内部知识。',
    summaryTechnical: 'RAG（Retrieval-Augmented Generation）通常包含检索、重排、上下文拼接和生成四个环节。系统先将文档切片并向量化，再在用户提问时召回相关片段，把这些片段与问题一同送入模型生成答案。',
    analogy: '像一个助教先去图书馆翻资料，再回来帮你回答问题，而不是完全靠记忆硬答。',
    keyPoints: ['先检索再生成', '适合私有知识库问答', '质量关键在切片、召回和上下文组织'],
    weakSpots: ['经常分不清 RAG 和 fine-tuning 的边界', '容易忽视切片和召回质量对最终答案的影响'],
    quiz: [
      {
        type: 'single',
        question: 'RAG 的核心价值最接近下面哪一项？',
        options: ['让模型参数永久记住新知识', '先从外部资料中找信息，再组织答案', '把图片直接转成文字', '降低推理成本'],
        answer: '先从外部资料中找信息，再组织答案',
        explanation: 'RAG 的本质是 retrieval + generation，而不是直接改模型参数。'
      },
      {
        type: 'single',
        question: '下面哪一项最可能直接影响 RAG 的回答质量？',
        options: ['文档切片策略', '显示器尺寸', '页面字体', '浏览器主题'],
        answer: '文档切片策略',
        explanation: '切片和召回会直接影响送进模型的上下文质量。'
      },
      {
        type: 'boolean',
        question: 'RAG 一定可以完全消除幻觉。',
        options: ['对', '错'],
        answer: '错',
        explanation: 'RAG 可以降低幻觉，但不能保证完全消除。'
      }
    ]
  },
  transformer: {
    title: 'Transformer',
    category: 'Model Architecture',
    summaryShort: 'Transformer 是基于注意力机制的信息处理架构。',
    summaryPlain: '它不再像传统序列模型那样一步一步看，而是让每个 token 都能同时关注别的 token，从而更高效地理解上下文。',
    summaryTechnical: 'Transformer 使用 self-attention 建模序列内部关系，通过 Q、K、V 计算注意力分布，再结合前馈网络、残差连接和位置编码完成表征学习。',
    analogy: '像开会时每个人都能同时听所有人发言，再决定该重点关注谁。',
    keyPoints: ['核心是 self-attention', '适合并行训练', '通常需要位置编码处理顺序信息'],
    weakSpots: ['容易把 attention 和位置编码的作用混淆', '只记住“并行”而忽略表达能力来源'],
    quiz: [
      {
        type: 'single',
        question: 'Transformer 能比很多传统序列模型更容易并行，主要因为？',
        options: ['它不需要任何训练数据', '它不依赖严格的逐步递归计算', '它不使用矩阵运算', '它只处理图片'],
        answer: '它不依赖严格的逐步递归计算',
        explanation: 'Transformer 通过 attention 让序列内元素可并行处理。'
      },
      {
        type: 'single',
        question: 'Self-attention 主要想解决什么问题？',
        options: ['让模型只看当前位置', '让 token 之间建立上下文关联', '压缩图片分辨率', '替代损失函数'],
        answer: '让 token 之间建立上下文关联',
        explanation: 'Attention 的核心是建模元素之间的关系。'
      },
      {
        type: 'boolean',
        question: 'Transformer 完全不需要任何顺序信息。',
        options: ['对', '错'],
        answer: '错',
        explanation: '通常还需要位置编码来补充顺序信息。'
      }
    ]
  },
  'rl-hf': {
    title: 'RLHF',
    category: 'Alignment',
    summaryShort: 'RLHF 是利用人类反馈来调整模型输出偏好的方法。',
    summaryPlain: '它不是单纯让模型“更会做题”，而是让模型更符合人类偏好，比如更有帮助、更安全、更像人想要的回答风格。',
    summaryTechnical: 'RLHF 通常先做监督微调，再基于偏好数据训练 reward model，最后使用 PPO 等方法优化策略模型，使其在奖励模型下表现更好。',
    analogy: '像老师先示范标准答案，再根据学生作业的优劣打分，最后不断训练学生朝更高分方向改进。',
    keyPoints: ['核心是人类偏好信号', '常见阶段包括 SFT、reward model、policy optimization', '目标是对齐而非单纯记忆知识'],
    weakSpots: ['容易和普通监督微调混为一谈', '会忽略 reward model 的中间作用'],
    quiz: [
      {
        type: 'single',
        question: 'RLHF 更关注下面哪种目标？',
        options: ['让模型输出更符合人类偏好', '让 GPU 更便宜', '把文本转成音频', '只提升检索速度'],
        answer: '让模型输出更符合人类偏好',
        explanation: 'RLHF 的关键是 alignment，不是硬件优化。'
      },
      {
        type: 'single',
        question: '在经典 RLHF 流程中，reward model 的作用是什么？',
        options: ['替代 tokenizer', '给输出偏好打分', '压缩数据库', '存储 embedding'],
        answer: '给输出偏好打分',
        explanation: 'reward model 负责把人类偏好转成可优化的奖励信号。'
      },
      {
        type: 'boolean',
        question: 'RLHF 和监督微调完全是同一个过程。',
        options: ['对', '错'],
        answer: '错',
        explanation: '监督微调通常只是 RLHF 前面的一个阶段。'
      }
    ]
  }
};

function defaultUsers() {
  return [
    {
      id: 'cai-sijia',
      name: 'Sijia',
      email: 'sijia@conceptcoach.local',
      role: 'Candidate',
      streak: 4,
      focus: 'RAG / Agents'
    },
    {
      id: 'product-demo',
      name: 'Ava',
      email: 'ava@conceptcoach.local',
      role: 'PM Demo',
      streak: 7,
      focus: 'Alignment / Eval'
    },
    {
      id: 'engineer-demo',
      name: 'Leo',
      email: 'leo@conceptcoach.local',
      role: 'Engineer Demo',
      streak: 2,
      focus: 'Transformer / Infra'
    }
  ].map((user) => ({ ...user, createdAt: new Date().toISOString() }));
}

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    streak INTEGER NOT NULL,
    focus TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    summary_short TEXT NOT NULL,
    summary_plain TEXT NOT NULL,
    summary_technical TEXT NOT NULL,
    analogy TEXT NOT NULL,
    key_points_json TEXT NOT NULL,
    weak_spots_json TEXT NOT NULL,
    quiz_template_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    status TEXT NOT NULL,
    questions_json TEXT NOT NULL,
    answers_json TEXT NOT NULL,
    score INTEGER,
    weak_points_json TEXT NOT NULL,
    review_advice TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (concept_id) REFERENCES concepts(id)
  );
  CREATE TABLE IF NOT EXISTS mastery_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    mastery_score INTEGER NOT NULL,
    last_score INTEGER NOT NULL,
    review_due_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (concept_id) REFERENCES concepts(id),
    UNIQUE(user_id, concept_id)
  );
`);

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function mapConceptRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summaryShort: row.summary_short,
    summaryPlain: row.summary_plain,
    summaryTechnical: row.summary_technical,
    analogy: row.analogy,
    keyPoints: parseJson(row.key_points_json, []),
    weakSpots: parseJson(row.weak_spots_json, []),
    quizTemplate: parseJson(row.quiz_template_json, []),
    createdAt: row.created_at
  };
}

function mapSessionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    conceptId: row.concept_id,
    status: row.status,
    questions: parseJson(row.questions_json, []),
    answers: parseJson(row.answers_json, []),
    score: row.score,
    weakPoints: parseJson(row.weak_points_json, []),
    reviewAdvice: row.review_advice,
    createdAt: row.created_at,
    completedAt: row.completed_at
  };
}

function mapMasteryRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    conceptId: row.concept_id,
    masteryScore: row.mastery_score,
    lastScore: row.last_score,
    reviewDueAt: row.review_due_at,
    updatedAt: row.updated_at
  };
}

function seedUsersIfNeeded() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (count > 0) return;
  const insert = db.prepare(`
    INSERT INTO users (id, name, email, role, streak, focus, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const user of defaultUsers()) {
    insert.run(user.id, user.name, user.email, user.role, user.streak, user.focus, user.createdAt);
  }
}

function migrateFromStoreIfNeeded() {
  const sessionCount = db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count;
  const conceptCount = db.prepare('SELECT COUNT(*) AS count FROM concepts').get().count;
  const masteryCount = db.prepare('SELECT COUNT(*) AS count FROM mastery_records').get().count;
  if (sessionCount > 0 || conceptCount > 0 || masteryCount > 0) return;
  if (!fs.existsSync(STORE_PATH)) return;

  const raw = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  const concepts = Array.isArray(raw.concepts) ? raw.concepts : [];
  const sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
  const masteryRecords = Array.isArray(raw.masteryRecords) ? raw.masteryRecords : [];

  const insertConcept = db.prepare(`
    INSERT OR IGNORE INTO concepts (
      id, slug, title, category, summary_short, summary_plain, summary_technical, analogy,
      key_points_json, weak_spots_json, quiz_template_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const concept of concepts) {
    insertConcept.run(
      concept.id,
      concept.slug,
      concept.title,
      concept.category,
      concept.summaryShort,
      concept.summaryPlain,
      concept.summaryTechnical,
      concept.analogy,
      JSON.stringify(concept.keyPoints || []),
      JSON.stringify(concept.weakSpots || []),
      JSON.stringify(concept.quizTemplate || concept.quiz || []),
      concept.createdAt || new Date().toISOString()
    );
  }

  const insertSession = db.prepare(`
    INSERT OR IGNORE INTO sessions (
      id, user_id, concept_id, status, questions_json, answers_json, score, weak_points_json,
      review_advice, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const session of sessions) {
    insertSession.run(
      session.id,
      session.userId || 'cai-sijia',
      session.conceptId,
      session.status || 'generated',
      JSON.stringify(session.questions || []),
      JSON.stringify(session.answers || []),
      session.score ?? null,
      JSON.stringify(session.weakPoints || []),
      session.reviewAdvice || '',
      session.createdAt || new Date().toISOString(),
      session.completedAt || null
    );
  }

  const insertMastery = db.prepare(`
    INSERT OR IGNORE INTO mastery_records (
      id, user_id, concept_id, mastery_score, last_score, review_due_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const record of masteryRecords) {
    insertMastery.run(
      record.id,
      record.userId || 'cai-sijia',
      record.conceptId,
      record.masteryScore,
      record.lastScore,
      record.reviewDueAt,
      record.updatedAt || new Date().toISOString()
    );
  }
}

seedUsersIfNeeded();
migrateFromStoreIfNeeded();

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };
  const contentType = contentTypes[ext] || 'text/plain; charset=utf-8';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

function pickSeed(input) {
  const key = slugify(input).replace(/_/g, '-');
  return conceptSeeds[key] || conceptSeeds[key.replace(/-/g, '')] || null;
}

function buildGeneratedConcept(input) {
  const seed = pickSeed(input);
  if (seed) return { ...seed };
  const title = input.trim();
  return {
    title,
    category: 'AI Basics',
    summaryShort: `${title} 是一个需要从定义、作用和使用场景三层来理解的 AI 概念。`,
    summaryPlain: `可以先把 ${title} 理解成一个“解决某类问题的方法或机制”。学习时先回答它要解决什么问题、怎么工作、适合用在哪。`,
    summaryTechnical: `${title} 在技术学习里通常可以拆成：核心定义、关键组件、输入输出方式、常见误区和实际应用场景。第一版原型会基于这个结构自动组织学习内容。`,
    analogy: `把 ${title} 想成一个工具箱里的专用工具：你需要知道它擅长什么、什么时候该用、什么时候不该用。`,
    keyPoints: [`先理解 ${title} 解决的问题`, `再拆分它的机制和组件`, `最后通过例子确认自己是否真的掌握`],
    weakSpots: [`容易只记定义，不知道使用场景`, `可能分不清 ${title} 和相近概念的边界`],
    quiz: [
      {
        type: 'single',
        question: `${title} 的学习第一步更应该是什么？`,
        options: ['先背术语', '先理解它解决什么问题', '先买课程', '先记住所有公式'],
        answer: '先理解它解决什么问题',
        explanation: '先搞清问题背景，后面的机制才更容易理解。'
      },
      {
        type: 'single',
        question: `面对 ${title}，更有效的学习方式是？`,
        options: ['只看一句定义', '拆成定义、机制、场景来学', '完全不做练习', '只收藏文章'],
        answer: '拆成定义、机制、场景来学',
        explanation: '分层学习更容易形成真正理解。'
      },
      {
        type: 'boolean',
        question: `只要看过 ${title} 的解释，就等于已经掌握。`,
        options: ['对', '错'],
        answer: '错',
        explanation: '真正掌握通常还需要练习和复述。'
      }
    ]
  };
}

function getUsers() {
  return db.prepare('SELECT * FROM users ORDER BY created_at ASC').all().map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    streak: row.streak,
    focus: row.focus,
    createdAt: row.created_at
  }));
}

function getCurrentUser(req) {
  const users = getUsers();
  const requestedId = req.headers['x-demo-user'];
  return users.find((user) => user.id === requestedId) || users[0];
}

function getConceptById(id) {
  return mapConceptRow(db.prepare('SELECT * FROM concepts WHERE id = ?').get(id));
}

function getSessionById(id) {
  return mapSessionRow(db.prepare('SELECT * FROM sessions WHERE id = ?').get(id));
}

function findOrCreateConcept(rawConcept) {
  const normalized = rawConcept.trim();
  const slug = slugify(normalized);
  const existing = mapConceptRow(db.prepare('SELECT * FROM concepts WHERE slug = ?').get(slug));
  if (existing) return existing;

  const generated = buildGeneratedConcept(normalized);
  const concept = {
    id: randomUUID(),
    slug,
    title: generated.title,
    category: generated.category,
    summaryShort: generated.summaryShort,
    summaryPlain: generated.summaryPlain,
    summaryTechnical: generated.summaryTechnical,
    analogy: generated.analogy,
    keyPoints: generated.keyPoints,
    weakSpots: generated.weakSpots,
    quizTemplate: generated.quiz,
    createdAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO concepts (
      id, slug, title, category, summary_short, summary_plain, summary_technical, analogy,
      key_points_json, weak_spots_json, quiz_template_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    concept.id,
    concept.slug,
    concept.title,
    concept.category,
    concept.summaryShort,
    concept.summaryPlain,
    concept.summaryTechnical,
    concept.analogy,
    JSON.stringify(concept.keyPoints),
    JSON.stringify(concept.weakSpots),
    JSON.stringify(concept.quizTemplate),
    concept.createdAt
  );

  return concept;
}

function createSession(conceptId, userId) {
  const session = {
    id: randomUUID(),
    userId,
    conceptId,
    status: 'generated',
    questions: [],
    answers: [],
    score: null,
    weakPoints: [],
    reviewAdvice: '',
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  db.prepare(`
    INSERT INTO sessions (
      id, user_id, concept_id, status, questions_json, answers_json, score,
      weak_points_json, review_advice, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.userId,
    session.conceptId,
    session.status,
    JSON.stringify(session.questions),
    JSON.stringify(session.answers),
    session.score,
    JSON.stringify(session.weakPoints),
    session.reviewAdvice,
    session.createdAt,
    session.completedAt
  );

  return session;
}

function updateSession(session) {
  db.prepare(`
    UPDATE sessions
    SET status = ?, questions_json = ?, answers_json = ?, score = ?, weak_points_json = ?, review_advice = ?, completed_at = ?
    WHERE id = ?
  `).run(
    session.status,
    JSON.stringify(session.questions || []),
    JSON.stringify(session.answers || []),
    session.score,
    JSON.stringify(session.weakPoints || []),
    session.reviewAdvice || '',
    session.completedAt,
    session.id
  );
}

function buildDashboard(user) {
  const recentRows = db.prepare(`
    SELECT s.*, c.title AS concept_title
    FROM sessions s
    JOIN concepts c ON c.id = s.concept_id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
    LIMIT 5
  `).all(user.id);

  const recent = recentRows.map((row) => ({
    id: row.id,
    conceptTitle: row.concept_title,
    status: row.status,
    score: row.score,
    createdAt: row.created_at
  }));

  const dueRows = db.prepare(`
    SELECT m.*, c.title AS concept_title
    FROM mastery_records m
    JOIN concepts c ON c.id = m.concept_id
    WHERE m.user_id = ? AND m.review_due_at <= ?
    ORDER BY m.review_due_at ASC
  `).all(user.id, new Date().toISOString());

  const due = dueRows.map((row) => ({
    conceptId: row.concept_id,
    conceptTitle: row.concept_title,
    masteryScore: row.mastery_score,
    reviewDueAt: row.review_due_at
  }));

  const masteryRows = db.prepare(`
    SELECT m.*, c.title AS concept_title
    FROM mastery_records m
    JOIN concepts c ON c.id = m.concept_id
    WHERE m.user_id = ?
    ORDER BY m.updated_at DESC
    LIMIT 6
  `).all(user.id);

  const mastery = masteryRows.map((row) => ({
    conceptTitle: row.concept_title,
    masteryScore: row.mastery_score,
    reviewDueAt: row.review_due_at,
    updatedAt: row.updated_at
  }));

  const completionRate = recent.length
    ? Math.round((recent.filter((item) => item.status === 'completed').length / recent.length) * 100)
    : 0;

  const previewConceptRows = db.prepare(`
    SELECT title, slug, category
    FROM concepts
    ORDER BY created_at DESC
    LIMIT 3
  `).all();

  const previewSessionRows = db.prepare(`
    SELECT s.created_at, s.status, s.score, c.title AS concept_title
    FROM sessions s
    JOIN concepts c ON c.id = s.concept_id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
    LIMIT 3
  `).all(user.id);

  const previewMasteryRows = db.prepare(`
    SELECT m.mastery_score, m.review_due_at, c.title AS concept_title
    FROM mastery_records m
    JOIN concepts c ON c.id = m.concept_id
    WHERE m.user_id = ?
    ORDER BY m.updated_at DESC
    LIMIT 3
  `).all(user.id);

  return {
    currentUser: user,
    overview: {
      sessions: recent.length,
      dueCount: due.length,
      completionRate
    },
    recent,
    due,
    mastery,
    preview: {
      concepts: previewConceptRows.map((row) => ({ title: row.title, slug: row.slug, category: row.category })),
      sessions: previewSessionRows.map((row) => ({ conceptTitle: row.concept_title, status: row.status, score: row.score, createdAt: row.created_at })),
      mastery: previewMasteryRows.map((row) => ({ conceptTitle: row.concept_title, masteryScore: row.mastery_score, reviewDueAt: row.review_due_at }))
    }
  };
}

function scoreSession(session, concept, answers) {
  const questions = session.questions;
  let correctCount = 0;
  const scoredAnswers = questions.map((question) => {
    const submitted = answers.find((item) => item.questionId === question.id);
    const userAnswer = submitted ? submitted.answer : '';
    const isCorrect = userAnswer === question.answer;
    if (isCorrect) correctCount += 1;
    return {
      questionId: question.id,
      userAnswer,
      isCorrect,
      explanation: question.explanation,
      correctAnswer: question.answer,
      questionText: question.question
    };
  });

  const score = Math.round((correctCount / Math.max(questions.length, 1)) * 100);
  const weakPoints = score >= 80
    ? [`${concept.title} 的基础理解整体稳定，可以尝试用自己的话再复述一次。`]
    : score >= 60
      ? [...concept.weakSpots.slice(0, 1), `建议再回看 ${concept.title} 的核心定义和使用场景。`]
      : [...concept.weakSpots, `建议重新阅读概念解释，并针对错题做一次复述。`];

  const reviewAdvice = score >= 80
    ? '建议 7 天后复习一次，并尝试和相近概念做对比。'
    : score >= 60
      ? '建议 3 天后复习，并再做一轮小测。'
      : '建议 1 天后优先复习，把错题和关键术语重新过一遍。';

  return { score, scoredAnswers, weakPoints, reviewAdvice };
}

function updateMastery(session, score) {
  const existing = mapMasteryRow(db.prepare(
    'SELECT * FROM mastery_records WHERE user_id = ? AND concept_id = ?'
  ).get(session.userId, session.conceptId));

  const now = new Date();
  const nextReview = new Date(now);
  if (score >= 80) nextReview.setDate(nextReview.getDate() + 7);
  else if (score >= 60) nextReview.setDate(nextReview.getDate() + 3);
  else nextReview.setDate(nextReview.getDate() + 1);

  if (existing) {
    const masteryScore = Math.round((existing.masteryScore + score) / 2);
    db.prepare(`
      UPDATE mastery_records
      SET last_score = ?, mastery_score = ?, review_due_at = ?, updated_at = ?
      WHERE id = ?
    `).run(score, masteryScore, nextReview.toISOString(), now.toISOString(), existing.id);
    return {
      ...existing,
      lastScore: score,
      masteryScore,
      reviewDueAt: nextReview.toISOString(),
      updatedAt: now.toISOString()
    };
  }

  const record = {
    id: randomUUID(),
    userId: session.userId,
    conceptId: session.conceptId,
    masteryScore: score,
    lastScore: score,
    reviewDueAt: nextReview.toISOString(),
    updatedAt: now.toISOString()
  };

  db.prepare(`
    INSERT INTO mastery_records (
      id, user_id, concept_id, mastery_score, last_score, review_due_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.userId,
    record.conceptId,
    record.masteryScore,
    record.lastScore,
    record.reviewDueAt,
    record.updatedAt
  );

  return record;
}

function routeApi(req, res, pathname) {
  const currentUser = getCurrentUser(req);

  if (req.method === 'GET' && pathname === '/api/users') {
    return sendJson(res, 200, { currentUser, users: getUsers() });
  }

  if (req.method === 'GET' && pathname === '/api/dashboard') {
    return sendJson(res, 200, buildDashboard(currentUser));
  }

  if (req.method === 'GET' && pathname === '/api/history') {
    const sessions = db.prepare(`
      SELECT s.*, c.title AS concept_title
      FROM sessions s
      JOIN concepts c ON c.id = s.concept_id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `).all(currentUser.id).map((row) => ({
      id: row.id,
      conceptTitle: row.concept_title,
      status: row.status,
      score: row.score,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      reviewAdvice: row.review_advice
    }));
    return sendJson(res, 200, { sessions });
  }

  if (req.method === 'GET' && pathname === '/api/reviews/due') {
    return sendJson(res, 200, { reviews: buildDashboard(currentUser).due });
  }

  if (req.method === 'POST' && pathname === '/api/concepts/generate') {
    return collectBody(req)
      .then((body) => {
        const conceptInput = (body.concept || '').trim();
        if (!conceptInput) return sendJson(res, 400, { error: 'concept is required' });
        const concept = findOrCreateConcept(conceptInput);
        const session = createSession(concept.id, currentUser.id);
        sendJson(res, 200, { concept, sessionId: session.id, currentUser });
      })
      .catch(() => sendJson(res, 400, { error: 'invalid json body' }));
  }

  const conceptMatch = pathname.match(/^\/api\/concepts\/([^/]+)$/);
  if (req.method === 'GET' && conceptMatch) {
    const concept = getConceptById(conceptMatch[1]);
    if (!concept) return sendJson(res, 404, { error: 'concept not found' });
    return sendJson(res, 200, { concept });
  }

  const quizMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/quiz$/);
  if (req.method === 'POST' && quizMatch) {
    const session = getSessionById(quizMatch[1]);
    if (!session || session.userId !== currentUser.id) return sendJson(res, 404, { error: 'session not found' });
    const concept = getConceptById(session.conceptId);
    session.questions = concept.quizTemplate.map((item, index) => ({ id: randomUUID(), orderIndex: index, ...item }));
    session.status = 'quiz_in_progress';
    updateSession(session);
    return sendJson(res, 200, { questions: session.questions, sessionId: session.id, conceptTitle: concept.title });
  }

  const submitMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/submit$/);
  if (req.method === 'POST' && submitMatch) {
    const session = getSessionById(submitMatch[1]);
    if (!session || session.userId !== currentUser.id) return sendJson(res, 404, { error: 'session not found' });
    const concept = getConceptById(session.conceptId);
    return collectBody(req)
      .then((body) => {
        const answers = Array.isArray(body.answers) ? body.answers : [];
        const result = scoreSession(session, concept, answers);
        session.answers = result.scoredAnswers;
        session.score = result.score;
        session.status = result.score >= 70 ? 'completed' : 'needs_review';
        session.weakPoints = result.weakPoints;
        session.reviewAdvice = result.reviewAdvice;
        session.completedAt = new Date().toISOString();
        updateSession(session);
        const mastery = updateMastery(session, result.score);
        sendJson(res, 200, {
          sessionId: session.id,
          conceptTitle: concept.title,
          score: result.score,
          answers: result.scoredAnswers,
          weakPoints: result.weakPoints,
          reviewAdvice: result.reviewAdvice,
          mastery,
          completedAt: session.completedAt
        });
      })
      .catch(() => sendJson(res, 400, { error: 'invalid json body' }));
  }

  sendJson(res, 404, { error: 'api route not found' });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/healthz') {
    return sendJson(res, 200, { ok: true, dbPath: DB_PATH });
  }

  if (pathname.startsWith('/api/')) {
    return routeApi(req, res, pathname);
  }

  const filePath = pathname === '/'
    ? path.join(PUBLIC_DIR, 'index.html')
    : path.join(PUBLIC_DIR, pathname.replace(/^\//, ''));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`AI Concept Coach demo running at http://localhost:${PORT}`);
});
