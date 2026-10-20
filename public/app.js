const state = {
  concept: null,
  sessionId: null,
  questions: [],
  answers: {},
  result: null,
  currentUserId: localStorage.getItem('conceptCoachUser') || '',
  currentUser: null
};


const learningPaths = {
  foundations: ['机器学习', 'Transformer', 'Embeddings'],
  'llm-systems': ['RAG', 'Context Window', 'Multimodal'],
  'agents-tools': ['AI Agents', 'Function Calling', 'MCP'],
  'safety-eval': ['Guardrails', 'Evals', 'RL-HF'],
  customization: ['LoRA', 'MoE', 'RL-HF']
};

function renderPathPreview(pathKey) {
  const concepts = learningPaths[pathKey] || [];
  if (!concepts.length) return;
  dom.conceptSection.classList.remove('hidden');
  dom.quizSection.classList.add('hidden');
  dom.resultSection.classList.add('hidden');
  dom.conceptSection.innerHTML = `
    <div class="concept-panel">
      <div class="concept-meta">
        <div>
          <div class="small-kicker">Learning path</div>
          <h3 style="margin:10px 0 6px; font-size: 30px;">${pathKey.replace(/-/g, ' ')}</h3>
          <p class="muted">你可以按这个顺序逐步学习，先打基础，再扩展到更复杂的系统概念。</p>
        </div>
      </div>
      <div class="content-grid">
        ${concepts.map((concept, index) => `
          <div class="info-block">
            <h4>第 ${index + 1} 步</h4>
            <p class="card-copy">${concept}</p>
          </div>
        `).join('')}
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" data-path-start="${concepts[0]}">从第一步开始</button>
      </div>
    </div>
  `;
  const btn = dom.conceptSection.querySelector('[data-path-start]');
  if (btn) {
    btn.addEventListener('click', () => {
      dom.conceptInput.value = btn.dataset.pathStart;
      generateConcept();
    });
  }
}

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
  activeUserCard: document.getElementById('activeUserCard'),
  overviewStats: document.getElementById('overviewStats'),
  openLoginBtn: document.getElementById('openLoginBtn'),
  loginModal: document.getElementById('loginModal'),
  closeLoginBtn: document.getElementById('closeLoginBtn'),
  closeLoginBackdrop: document.getElementById('closeLoginBackdrop'),
  submitLoginBtn: document.getElementById('submitLoginBtn'),
  loginNameInput: document.getElementById('loginNameInput'),
  loginEmailInput: document.getElementById('loginEmailInput')
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


function resetWorkspaceView() {
  state.concept = null;
  state.sessionId = null;
  state.questions = [];
  state.answers = {};
  state.result = null;
  dom.conceptSection.innerHTML = '';
  dom.quizSection.innerHTML = '';
  dom.resultSection.innerHTML = '';
  dom.conceptSection.classList.add('hidden');
  dom.quizSection.classList.add('hidden');
  dom.resultSection.classList.add('hidden');
}


function setLoginModal(open) {
  dom.loginModal.classList.toggle('hidden', !open);
}

function renderCurrentUser(user) {
  state.currentUser = user;
  if (!user) {
    dom.activeUserCard.innerHTML = `
      <strong>未登录</strong>
      <p>登录后保存学习记录和复习进度</p>
    `;
    dom.openLoginBtn.textContent = '登录';
    return;
  }

  dom.activeUserCard.innerHTML = `
    <strong>${user.name}</strong>
    <p>${user.email}</p>
  `;
  dom.openLoginBtn.textContent = '切换账户';
}

function renderOverview(overview = {}) {
  const cards = [
    { label: '学习次数', value: overview.sessions ?? 0, note: '最近学习记录' },
    { label: '待复习', value: overview.dueCount ?? 0, note: '到期的复习内容' },
    { label: '完成率', value: `${overview.completionRate ?? 0}%`, note: '最近几次学习完成情况' }
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
          <div class="small-kicker">Concept</div>
          <h3 style="margin:10px 0 6px; font-size: 30px;">${concept.title}</h3>
          <p class="muted">${concept.summaryShort}</p>
        </div>
        <div class="badge primary">${concept.category}</div>
      </div>
      <div class="content-grid">
        <div class="info-block">
          <h4>先用人话理解</h4>
          <p class="card-copy">${concept.summaryPlain}</p>
        </div>
        <div class="info-block">
          <h4>再看技术解释</h4>
          <p class="card-copy">${concept.summaryTechnical}</p>
        </div>
        <div class="info-block">
          <h4>可以这样类比</h4>
          <p class="card-copy">${concept.analogy}</p>
        </div>
        <div class="info-block">
          <h4>这次先记住</h4>
          <ul class="list">${concept.keyPoints.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" id="generateQuizBtn">开始做 3 道题</button>
      </div>
    </div>
  `;
  document.getElementById('generateQuizBtn').addEventListener('click', generateQuiz);
}

function renderQuiz(questions, conceptTitle) {
  dom.quizSection.classList.remove('hidden');
  dom.quizSection.innerHTML = `
    <div class="quiz-shell">
      <div class="panel-head">
        <div>
          <div class="small-kicker">Practice</div>
          <h4 style="font-size: 24px;">${conceptTitle} 小测</h4>
          <p class="muted">先做完这一轮题，再看你哪里掌握了，哪里还需要复习。</p>
        </div>
      </div>
      ${questions.map((question, index) => `
        <div class="quiz-card">
          <div class="meta-row">
            <span class="mini-pill progress-chip">第 ${index + 1} 题</span>
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
        <button class="btn btn-primary" id="submitQuizBtn">提交答案</button>
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

function buildAnswerCards(answers) {
  return answers.map((item) => {
    const klass = item.isCorrect ? 'answer-card correct' : 'answer-card';
    return `
      <div class="${klass}">
        <div class="meta-row">
          <span class="mini-pill ${item.isCorrect ? 'progress-chip' : 'review-chip'}">${item.isCorrect ? '已掌握' : '建议复习'}</span>
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
  const reviewSteps = [
    `你已经完成这一轮 ${result.conceptTitle} 练习。`,
    `本轮得分 ${result.score}，当前掌握度更新为 ${result.mastery.masteryScore}。`,
    `建议下次复习时间：${formatDate(result.mastery.reviewDueAt)}。`
  ];

  dom.resultSection.innerHTML = `
    <div class="result-stack">
      <div class="summary-card mastery-card">
        <div class="ring-wrap">
          <div class="ring" style="--progress: ${result.mastery.masteryScore};"></div>
          <div class="ring-label">
            <div>
              <div class="ring-score">${result.mastery.masteryScore}</div>
              <div class="ring-note">掌握度</div>
            </div>
          </div>
        </div>
        <div>
          <div class="small-kicker">Summary</div>
          <h4 style="font-size: 28px; margin: 12px 0 6px;">${result.conceptTitle} 学习结果</h4>
          <p class="muted">这次练习已经记录下来，后面你可以回来看这次结果，也可以按提醒继续复习。</p>
          <div class="meta-row" style="margin-top: 12px;">
            <span class="badge ${scoreBadgeClass}">本轮得分 ${result.score}</span>
            <span class="mini-pill">完成时间 ${formatDate(result.completedAt)}</span>
          </div>
          <div class="bar-group">
            <div class="bar-row">
              <div class="bar-top"><span>本轮得分</span><span>${result.score}</span></div>
              <div class="bar-track"><div class="bar-fill" style="width:${result.score}%"></div></div>
            </div>
            <div class="bar-row">
              <div class="bar-top"><span>当前掌握度</span><span>${result.mastery.masteryScore}</span></div>
              <div class="bar-track"><div class="bar-fill" style="width:${result.mastery.masteryScore}%"></div></div>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-grid">
        <div class="result-card">
          <div class="small-kicker">What to review</div>
          <h4>还需要补强的地方</h4>
          <div class="answer-list">
            ${result.weakPoints.map((item) => `<div class="answer-card"><strong>建议复习</strong><p>${item}</p></div>`).join('')}
          </div>
        </div>
        <div class="result-card">
          <div class="small-kicker">Next step</div>
          <h4>下一步建议</h4>
          <p class="card-copy">${result.reviewAdvice}</p>
          <ul class="result-list">
            ${reviewSteps.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="result-card">
        <div class="small-kicker">Answer review</div>
        <h4>题目回顾</h4>
        <div class="answer-list">
          ${buildAnswerCards(result.answers)}
        </div>
      </div>
    </div>
  `;
}

function renderHistory(sessions) {
  dom.historyList.innerHTML = sessions.length
    ? sessions.map((item) => `
      <div class="stack-item">
        <strong>${item.conceptTitle}</strong>
        <p>${item.score == null ? '还没完成' : `上次得分 ${item.score}`}</p>
        <p class="mini-meta">${formatDate(item.createdAt)}</p>
      </div>
    `).join('')
    : '<div class="empty-state">还没有学习记录。</div>';
}

function renderReviews(reviews) {
  dom.reviewList.innerHTML = reviews.length
    ? reviews.map((item) => `
      <div class="stack-item">
        <strong>${item.conceptTitle}</strong>
        <p>当前掌握度 ${item.masteryScore}</p>
        <p class="mini-meta">建议复习时间：${formatDate(item.reviewDueAt)}</p>
      </div>
    `).join('')
    : '<div class="empty-state">当前还没有到期复习内容。</div>';
}

function renderMastery(mastery) {
  dom.masteryList.innerHTML = mastery.length
    ? mastery.map((item) => `
      <div class="stack-item">
        <strong>${item.conceptTitle}</strong>
        <p>掌握度 ${item.masteryScore}</p>
        <p class="mini-meta">下次复习：${formatDate(item.reviewDueAt)}</p>
      </div>
    `).join('')
    : '<div class="empty-state">完成一轮练习后，这里会显示你的掌握情况。</div>';
}

async function loadCurrentUser() {
  if (!state.currentUserId) {
    renderCurrentUser(null);
    resetWorkspaceView();
    return;
  }
  const data = await apiFetch('/api/users');
  renderCurrentUser(data.currentUser);
}

async function loadDashboard() {
  if (!state.currentUserId) {
    renderOverview({ sessions: 0, dueCount: 0, completionRate: 0 });
    renderHistory([]);
    renderReviews([]);
    renderMastery([]);
    return;
  }
  const dashboard = await apiFetch('/api/dashboard');
  renderOverview(dashboard.overview || {});
  renderHistory(dashboard.recent || []);
  renderReviews(dashboard.due || []);
  renderMastery(dashboard.mastery || []);
  if (dashboard.currentUser) renderCurrentUser(dashboard.currentUser);
}

async function submitLogin() {
  const name = dom.loginNameInput.value.trim();
  const email = dom.loginEmailInput.value.trim();
  if (!name || !email) return;
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name, email })
  });
  state.currentUserId = data.user.id;
  localStorage.setItem('conceptCoachUser', state.currentUserId);
  renderCurrentUser(data.user);
  setLoginModal(false);
  resetWorkspaceView();
  await loadDashboard();
}

async function generateConcept() {
  if (!state.currentUserId) {
    setLoginModal(true);
    return;
  }
  const concept = dom.conceptInput.value.trim();
  if (!concept) return;
  resetWorkspaceView();
  const data = await apiFetch('/api/concepts/generate', {
    method: 'POST',
    body: JSON.stringify({ concept })
  });
  state.concept = data.concept;
  state.sessionId = data.sessionId;
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
    await loadCurrentUser();
    await loadDashboard();
  });
  document.querySelectorAll('.chip, .starter-trigger').forEach((chip) => {
    chip.addEventListener('click', () => {
      dom.conceptInput.value = chip.dataset.concept;
      generateConcept();
    });
  });
  document.querySelectorAll('.path-trigger').forEach((card) => {
    card.addEventListener('click', () => renderPathPreview(card.dataset.path));
  });
  dom.openLoginBtn.addEventListener('click', () => setLoginModal(true));
  dom.closeLoginBtn.addEventListener('click', () => setLoginModal(false));
  dom.closeLoginBackdrop.addEventListener('click', () => setLoginModal(false));
  dom.submitLoginBtn.addEventListener('click', submitLogin);
}

(async function init() {
  bindStaticEvents();
  resetWorkspaceView();
  await loadCurrentUser();
  await loadDashboard();
  if (!state.currentUserId) setLoginModal(true);
})();
