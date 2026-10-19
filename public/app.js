const state = {
  concept: null,
  sessionId: null,
  questions: [],
  answers: {},
  result: null,
  users: [],
  currentUserId: localStorage.getItem('conceptCoachUser') || 'cai-sijia'
};

const dom = {
  conceptInput: document.getElementById('conceptInput'),
  generateBtn: document.getElementById('generateBtn'),
  jumpGenerateBtn: document.getElementById('jumpGenerateBtn'),
  loadDashboardBtn: document.getElementById('loadDashboardBtn'),
  conceptSection: document.getElementById('conceptSection'),
  quizSection: document.getElementById('quizSection'),
  resultSection: document.getElementById('resultSection'),
  historyList: document.getElementById('historyList'),
  reviewList: document.getElementById('reviewList'),
  masteryList: document.getElementById('masteryList'),
  userSelect: document.getElementById('userSelect'),
  activeUserCard: document.getElementById('activeUserCard'),
  overviewStats: document.getElementById('overviewStats'),
  schemaGrid: document.getElementById('schemaGrid'),
  dbConcepts: document.getElementById('dbConcepts'),
  dbSessions: document.getElementById('dbSessions'),
  dbMastery: document.getElementById('dbMastery')
};

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'x-demo-user': state.currentUserId
    },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'request failed');
  return data;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-CN');
}

function renderActiveUser(user) {
  if (!user) return;
  dom.activeUserCard.innerHTML = `
    <strong>${user.name}</strong>
    <p>${user.role} · Focus on ${user.focus}</p>
    <p>连续学习 ${user.streak} 天 · ${user.email}</p>
  `;
}

function renderUserSelect(users, currentUser) {
  state.users = users;
  dom.userSelect.innerHTML = users.map((user) => `
    <option value="${user.id}" ${user.id === currentUser.id ? 'selected' : ''}>${user.name} · ${user.role}</option>
  `).join('');
  renderActiveUser(currentUser);
}


function renderSchema() {
  const schemaCards = [
    {
      table: 'users',
      fields: ['id', 'name', 'email', 'role', 'focus', 'streak'],
      desc: '假登录入口与用户切换依赖这张表。'
    },
    {
      table: 'concepts',
      fields: ['id', 'slug', 'title', 'category', 'summary_*', 'quiz_template_json'],
      desc: '概念卡与 quiz 模板的来源。'
    },
    {
      table: 'sessions',
      fields: ['id', 'user_id', 'concept_id', 'status', 'questions_json', 'answers_json', 'score'],
      desc: '每次学习流程都会创建一条 session。'
    },
    {
      table: 'mastery_records',
      fields: ['user_id', 'concept_id', 'mastery_score', 'last_score', 'review_due_at'],
      desc: '记录掌握度与下次复习时间。'
    }
  ];

  dom.schemaGrid.innerHTML = schemaCards.map((card) => `
    <div class="schema-card">
      <strong>${card.table}</strong>
      <div>${card.fields.map((field) => `<code>${field}</code>`).join('')}</div>
      <p class="mini-meta" style="margin-top:8px;">${card.desc}</p>
    </div>
  `).join('');
}

function renderDbPreview(section, items, formatter, emptyText) {
  section.innerHTML = items.length
    ? items.map(formatter).join('')
    : `<div class="empty-state">${emptyText}</div>`;
}

function renderDatabasePreview(dashboard) {
  renderDbPreview(
    dom.dbConcepts,
    dashboard.preview?.concepts || [],
    (item) => `
      <div class="db-item">
        <div class="db-item-title"><span>${item.title}</span><span>${item.category}</span></div>
        <div class="db-item-meta">slug: ${item.slug}</div>
      </div>
    `,
    '暂无 concept。'
  );

  renderDbPreview(
    dom.dbSessions,
    dashboard.preview?.sessions || [],
    (item) => `
      <div class="db-item">
        <div class="db-item-title"><span>${item.conceptTitle}</span><span>${item.status}</span></div>
        <div class="db-item-meta">score: ${item.score == null ? '—' : item.score} · ${formatDate(item.createdAt)}</div>
      </div>
    `,
    '暂无 session。'
  );

  renderDbPreview(
    dom.dbMastery,
    dashboard.preview?.mastery || [],
    (item) => `
      <div class="db-item">
        <div class="db-item-title"><span>${item.conceptTitle}</span><span>${item.masteryScore}</span></div>
        <div class="db-item-meta">next review: ${formatDate(item.reviewDueAt)}</div>
      </div>
    `,
    '暂无 mastery record。'
  );
}

function renderOverview(overview = {}) {
  const cards = [
    { label: '最近学习', value: overview.sessions ?? 0, note: '当前用户最近 5 次 session' },
    { label: '待复习', value: overview.dueCount ?? 0, note: '已经到期的 review 任务' },
    { label: '完成率', value: `${overview.completionRate ?? 0}%`, note: '最近 session 的完成情况' }
  ];
  dom.overviewStats.innerHTML = cards.map((card) => `
    <div class="stat">
      <strong>${card.value}</strong>
      <span class="muted">${card.label}</span>
      <p class="mini-meta">${card.note}</p>
    </div>
  `).join('');
}

function renderConcept(concept) {
  dom.conceptSection.classList.remove('hidden');
  dom.conceptSection.innerHTML = `
    <div class="concept-panel">
      <div class="concept-meta">
        <div>
          <span class="eyebrow">Concept card</span>
          <h3 style="margin:10px 0 6px; font-size: 30px;">${concept.title}</h3>
          <p class="muted">${concept.summaryShort}</p>
        </div>
        <div class="badge primary">${concept.category}</div>
      </div>
      <div class="content-grid">
        <div class="info-block">
          <h4>通俗解释</h4>
          <p class="card-copy">${concept.summaryPlain}</p>
        </div>
        <div class="info-block">
          <h4>技术解释</h4>
          <p class="card-copy">${concept.summaryTechnical}</p>
        </div>
        <div class="info-block">
          <h4>类比</h4>
          <p class="card-copy">${concept.analogy}</p>
        </div>
        <div class="info-block">
          <h4>关键点</h4>
          <ul class="list">${concept.keyPoints.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" id="generateQuizBtn">生成 3 道小测</button>
      </div>
    </div>
  `;
  document.getElementById('generateQuizBtn').addEventListener('click', generateQuiz);
}

function renderQuiz(questions, conceptTitle) {
  dom.quizSection.classList.remove('hidden');
  dom.quizSection.innerHTML = `
    <div class="quiz-shell">
      <div class="panel-title-row">
        <div>
          <span class="eyebrow">Quiz</span>
          <h4 style="font-size: 24px;">${conceptTitle} 小测</h4>
          <p class="muted">先回答这 3 道题，再查看错因分析、掌握度和复习时间线。</p>
        </div>
      </div>
      ${questions.map((question, index) => `
        <div class="quiz-card">
          <div class="meta-row">
            <span class="mini-pill progress-chip">Q${index + 1}</span>
            <span class="mini-pill">${question.type === 'boolean' ? '判断题' : '单选题'}</span>
          </div>
          <h4>${question.question}</h4>
          <div class="quiz-options">
            ${question.options.map((option) => `
              <button class="option-btn" data-question-id="${question.id}" data-answer="${option}">${option}</button>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <div class="hero-actions">
        <button class="btn btn-primary" id="submitQuizBtn">提交答案并写入学习记录</button>
      </div>
    </div>
  `;

  dom.quizSection.querySelectorAll('.option-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const questionId = button.dataset.questionId;
      const answer = button.dataset.answer;
      state.answers[questionId] = answer;
      dom.quizSection.querySelectorAll(`.option-btn[data-question-id="${questionId}"]`).forEach((item) => {
        item.classList.toggle('selected', item.dataset.answer === answer);
      });
    });
  });

  document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);
}

function buildWrongAnswerCards(answers) {
  return answers.map((item) => {
    const klass = item.isCorrect ? 'wrong-answer-card correct' : 'wrong-answer-card';
    return `
      <div class="${klass}">
        <div class="meta-row">
          <span class="mini-pill ${item.isCorrect ? 'progress-chip' : 'review-chip'}">${item.isCorrect ? '答对' : '待复习'}</span>
          <span class="mini-pill">正确答案：${item.correctAnswer}</span>
        </div>
        <strong>${item.questionText}</strong>
        <p>你的答案：${item.userAnswer || '未作答'}</p>
        <p>${item.explanation}</p>
      </div>
    `;
  }).join('');
}

function renderResult(result) {
  dom.resultSection.classList.remove('hidden');
  const scoreBadgeClass = result.score >= 80 ? 'green' : result.score >= 60 ? 'primary' : 'amber';
  const timeline = [
    `Concept session 创建完成。`,
    `概念卡已生成，并拉起 quiz。`,
    `用户提交了 ${result.answers.length} 道题的答案。`,
    `服务端返回得分 ${result.score}，并更新 mastery 为 ${result.mastery.masteryScore}。`,
    `下次复习时间：${formatDate(result.mastery.reviewDueAt)}。`
  ];

  dom.resultSection.innerHTML = `
    <div class="result-stack">
      <div class="mastery-hero">
        <div style="position: relative; width: 110px; height: 110px;">
          <div class="ring" style="--progress: ${result.mastery.masteryScore};"></div>
          <div class="ring-label">
            <div>
              <div class="ring-score">${result.mastery.masteryScore}</div>
              <div class="ring-note">Mastery</div>
            </div>
          </div>
        </div>
        <div>
          <span class="eyebrow">Result</span>
          <h4 style="font-size: 28px; margin: 12px 0 6px;">${result.conceptTitle} 学习结果</h4>
          <p class="muted">这一步已经把答题结果写入 SQLite，并更新了掌握度、review_due_at 和最近学习历史。</p>
          <div class="meta-row" style="margin-top: 12px;">
            <span class="badge ${scoreBadgeClass}">当前得分 ${result.score}</span>
            <span class="mini-pill">完成时间 ${formatDate(result.completedAt)}</span>
          </div>
          <div class="mastery-bars">
            <div class="mastery-bar-row">
              <div class="mastery-bar-top"><span>Quiz score</span><span>${result.score}</span></div>
              <div class="mastery-bar-track"><div class="mastery-bar-fill" style="width:${result.score}%"></div></div>
            </div>
            <div class="mastery-bar-row">
              <div class="mastery-bar-top"><span>Mastery score</span><span>${result.mastery.masteryScore}</span></div>
              <div class="mastery-bar-track"><div class="mastery-bar-fill" style="width:${result.mastery.masteryScore}%"></div></div>
            </div>
          </div>
        </div>
      </div>

      <div class="result-hero">
        <div class="result-card">
          <span class="eyebrow">Weak points</span>
          <h4>薄弱点分析</h4>
          <div class="wrong-answer-list">
            ${result.weakPoints.map((item) => `<div class="wrong-answer-card"><strong>需要补强</strong><p>${item}</p></div>`).join('')}
          </div>
        </div>
        <div class="result-card">
          <span class="eyebrow">Review advice</span>
          <h4>复习建议</h4>
          <p class="card-copy">${result.reviewAdvice}</p>
          <div class="meta-row" style="margin-top: 12px;">
            <span class="mini-pill review-chip">下次复习：${formatDate(result.mastery.reviewDueAt)}</span>
          </div>
          <ul class="review-timeline">
            ${timeline.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="result-grid">
        <div class="result-card">
          <span class="eyebrow">Answer review</span>
          <h4>错题卡片</h4>
          <div class="wrong-answer-list">
            ${buildWrongAnswerCards(result.answers)}
          </div>
        </div>
        <div class="result-card">
          <span class="eyebrow">System notes</span>
          <h4>状态流转时间线</h4>
          <div class="wrong-answer-list">
            <div class="timeline-pill"><strong>generated</strong><span class="legend">概念卡创建成功</span></div>
            <div class="timeline-pill"><strong>quiz_in_progress</strong><span class="legend">小测已生成，等待提交</span></div>
            <div class="timeline-pill"><strong>${result.score >= 70 ? 'completed' : 'needs_review'}</strong><span class="legend">服务端已评分并生成建议</span></div>
            <div class="timeline-pill"><strong>mastery updated</strong><span class="legend">掌握度与复习时间已写回</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHistory(sessions) {
  dom.historyList.innerHTML = sessions.length
    ? sessions.map((item) => `
      <div class="history-item">
        <strong>${item.conceptTitle}</strong>
        <p>${item.status} · ${item.score == null ? '未完成' : `得分 ${item.score}`}</p>
        <p class="mini-meta">创建时间：${formatDate(item.createdAt)}</p>
      </div>
    `).join('')
    : '<div class="empty-state">还没有学习记录。</div>';
}

function renderReviews(reviews) {
  dom.reviewList.innerHTML = reviews.length
    ? reviews.map((item) => `
      <div class="review-item">
        <strong>${item.conceptTitle}</strong>
        <p>掌握度 ${item.masteryScore}</p>
        <p class="mini-meta">到期时间：${formatDate(item.reviewDueAt)}</p>
      </div>
    `).join('')
    : '<div class="empty-state">当前没有到期复习任务。</div>';
}

function renderMastery(mastery) {
  dom.masteryList.innerHTML = mastery.length
    ? mastery.map((item) => `
      <div class="mastery-item">
        <strong>${item.conceptTitle}</strong>
        <p>掌握度 ${item.masteryScore}</p>
        <p class="mini-meta">下次复习：${formatDate(item.reviewDueAt)}</p>
      </div>
    `).join('')
    : '<div class="empty-state">答题后这里会显示掌握度。</div>';
}

async function loadUsers() {
  const data = await apiFetch('/api/users');
  renderUserSelect(data.users || [], data.currentUser);
}

async function loadDashboard() {
  const dashboard = await apiFetch('/api/dashboard');
  renderOverview(dashboard.overview || {});
  renderHistory(dashboard.recent || []);
  renderReviews(dashboard.due || []);
  renderMastery(dashboard.mastery || []);
  if (dashboard.currentUser) renderActiveUser(dashboard.currentUser);
  renderDatabasePreview(dashboard);
}


async function generateConcept() {
  const concept = dom.conceptInput.value.trim();
  if (!concept) return;
  const data = await apiFetch('/api/concepts/generate', {
    method: 'POST',
    body: JSON.stringify({ concept })
  });
  state.concept = data.concept;
  state.sessionId = data.sessionId;
  state.questions = [];
  state.answers = {};
  state.result = null;
  dom.quizSection.classList.add('hidden');
  dom.resultSection.classList.add('hidden');
  renderConcept(data.concept);
  await loadDashboard();
}

async function generateQuiz() {
  if (!state.sessionId) return;
  const data = await apiFetch(`/api/sessions/${state.sessionId}/quiz`, { method: 'POST' });
  state.questions = data.questions;
  state.answers = {};
  renderQuiz(data.questions, data.conceptTitle);
}

async function submitQuiz() {
  if (!state.sessionId || !state.questions.length) return;
  const answers = state.questions.map((question) => ({
    questionId: question.id,
    answer: state.answers[question.id] || ''
  }));
  const data = await apiFetch(`/api/sessions/${state.sessionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers })
  });
  state.result = data;
  renderResult(data);
  await loadDashboard();
}

function bindStaticEvents() {
  dom.generateBtn.addEventListener('click', generateConcept);
  dom.jumpGenerateBtn.addEventListener('click', () => {
    dom.conceptInput.focus();
    dom.conceptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  dom.loadDashboardBtn.addEventListener('click', async () => {
    await loadUsers();
    await loadDashboard();
  });
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      dom.conceptInput.value = chip.dataset.concept;
      generateConcept();
    });
  });
  dom.userSelect.addEventListener('change', async (event) => {
    state.currentUserId = event.target.value;
    localStorage.setItem('conceptCoachUser', state.currentUserId);
    dom.conceptSection.classList.add('hidden');
    dom.quizSection.classList.add('hidden');
    dom.resultSection.classList.add('hidden');
    state.sessionId = null;
    state.questions = [];
    state.answers = {};
    state.result = null;
    await loadUsers();
    await loadDashboard();
  });
}

(async function init() {
  bindStaticEvents();
  renderSchema();
  await loadUsers();
  await loadDashboard();
})();
