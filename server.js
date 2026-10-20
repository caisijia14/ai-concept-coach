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
    summaryShort: 'RAG 是“先检索资料，再组织回答”的方法。',
    summaryPlain: '你可以把 RAG 理解成开卷考试：模型不是只靠记忆回答，而是先去知识库里找相关内容，再结合这些内容回答问题。',
    summaryTechnical: 'RAG（Retrieval-Augmented Generation）通常包含切片、向量化、召回、重排和生成几个环节，核心是把外部知识放进上下文，而不是直接改模型参数。',
    analogy: '像一个助教先去图书馆翻资料，再回来帮你回答问题。',
    keyPoints: ['先检索再生成', '适合私有知识库问答', '质量关键在切片、召回和上下文组织'],
    weakSpots: ['容易把 RAG 和微调混淆', '容易忽视切片和召回质量的影响'],
    quiz: [
      { type: 'single', question: 'RAG 的核心价值最接近哪一项？', options: ['让模型永久记住新知识', '先从外部资料中找信息，再组织答案', '把图片直接转成文字', '降低推理成本'], answer: '先从外部资料中找信息，再组织答案', explanation: 'RAG 的核心是 retrieval + generation。' },
      { type: 'single', question: '下面哪一项最可能直接影响 RAG 回答质量？', options: ['文档切片策略', '显示器尺寸', '页面字体', '浏览器主题'], answer: '文档切片策略', explanation: '切片和召回会直接影响送进模型的上下文质量。' },
      { type: 'boolean', question: 'RAG 一定可以完全消除幻觉。', options: ['对', '错'], answer: '错', explanation: 'RAG 可以降低幻觉，但不能保证完全消除。' }
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
      { type: 'single', question: 'Transformer 比很多传统序列模型更容易并行，主要因为？', options: ['它不需要训练数据', '它不依赖严格的逐步递归计算', '它不使用矩阵运算', '它只处理图片'], answer: '它不依赖严格的逐步递归计算', explanation: 'Transformer 通过 attention 让序列内元素可并行处理。' },
      { type: 'single', question: 'Self-attention 主要解决什么问题？', options: ['让模型只看当前位置', '让 token 之间建立上下文关联', '压缩图片分辨率', '替代损失函数'], answer: '让 token 之间建立上下文关联', explanation: 'Attention 的核心是建模元素之间的关系。' },
      { type: 'boolean', question: 'Transformer 完全不需要任何顺序信息。', options: ['对', '错'], answer: '错', explanation: '通常还需要位置编码来补充顺序信息。' }
    ]
  },
  'rl-hf': {
    title: 'RLHF',
    category: 'Alignment',
    summaryShort: 'RLHF 是利用人类反馈来调整模型输出偏好的方法。',
    summaryPlain: '它不是单纯让模型“更会做题”，而是让模型更符合人类偏好，比如更有帮助、更安全。',
    summaryTechnical: 'RLHF 通常先做监督微调，再基于偏好数据训练 reward model，最后使用 PPO 等方法优化策略模型。',
    analogy: '像老师先示范标准答案，再根据学生作业优劣打分，最后朝更高分方向训练。',
    keyPoints: ['核心是人类偏好信号', '常见阶段包括 SFT、reward model、policy optimization', '目标是对齐而非单纯记忆知识'],
    weakSpots: ['容易和普通监督微调混为一谈', '容易忽略 reward model 的中间作用'],
    quiz: [
      { type: 'single', question: 'RLHF 更关注哪种目标？', options: ['让模型输出更符合人类偏好', '让 GPU 更便宜', '把文本转成音频', '只提升检索速度'], answer: '让模型输出更符合人类偏好', explanation: 'RLHF 的关键是 alignment。' },
      { type: 'single', question: '在经典 RLHF 流程中，reward model 的作用是什么？', options: ['替代 tokenizer', '给输出偏好打分', '压缩数据库', '存储 embedding'], answer: '给输出偏好打分', explanation: 'reward model 负责把偏好转成可优化的奖励信号。' },
      { type: 'boolean', question: 'RLHF 和监督微调完全是同一个过程。', options: ['对', '错'], answer: '错', explanation: '监督微调通常只是 RLHF 的前置阶段。' }
    ]
  },
  'function-calling': {
    title: 'Function Calling',
    category: 'Tool Use',
    summaryShort: 'Function Calling 是让模型按约定格式调用外部工具或函数的能力。',
    summaryPlain: '它的重点不是让模型“自由发挥”，而是让模型在需要时按照规则把参数整理好，再交给外部工具去执行。',
    summaryTechnical: '在 Function Calling 场景中，模型会根据 schema 决定是否调用某个函数，并输出结构化参数；真正执行动作的是外部系统，而不是模型本身。',
    analogy: '像前台先按表单把需求填好，再转交给后台部门处理。',
    keyPoints: ['模型负责判断何时调用', '参数格式通常受 schema 约束', '真正执行动作的是外部工具'],
    weakSpots: ['容易把“模型决定调用”与“模型直接执行”混淆', '容易忽视参数校验'],
    quiz: [
      { type: 'single', question: 'Function Calling 的核心价值是什么？', options: ['让模型直接操作数据库', '让模型按规则生成可执行的函数调用参数', '让模型记住更多知识', '让前端界面更好看'], answer: '让模型按规则生成可执行的函数调用参数', explanation: 'Function Calling 的重点是结构化工具调用。' },
      { type: 'single', question: '在 Function Calling 中，真正执行动作的一般是谁？', options: ['模型自己', '外部系统或工具', 'Tokenizer', 'Embedding 模型'], answer: '外部系统或工具', explanation: '模型通常只负责判断和输出参数。' },
      { type: 'boolean', question: 'Function Calling 一定意味着模型拥有真实世界操作权限。', options: ['对', '错'], answer: '错', explanation: '是否有权限取决于外部系统设计，而不是功能名本身。' }
    ]
  },
  moe: {
    title: 'MoE',
    category: 'Model Architecture',
    summaryShort: 'MoE（Mixture of Experts）是一种让不同“专家”分工处理输入的模型设计。',
    summaryPlain: '它不是让所有参数每次都一起工作，而是根据输入只激活其中一部分“专家”，这样可以在增加模型容量的同时控制计算成本。',
    summaryTechnical: 'MoE 通常包含 router 和多个 experts。router 决定哪些 experts 处理当前 token，因此常见表述是“参数很多，但每次只激活一部分参数”。',
    analogy: '像一家大医院，不同病人会先分诊，再被送到更合适的科室。',
    keyPoints: ['不是每次都激活全部参数', '核心在路由与专家分工', '常见目标是提升容量同时控制算力开销'],
    weakSpots: ['容易把“参数量大”误解成“每次推理都更贵”', '容易忽视 router 的作用'],
    quiz: [
      { type: 'single', question: 'MoE 最核心的特点是什么？', options: ['所有参数每次都同时参与计算', '不同输入只激活部分专家参数', '只能用于图像任务', '完全不需要路由机制'], answer: '不同输入只激活部分专家参数', explanation: 'MoE 的核心是稀疏激活。' },
      { type: 'single', question: '在 MoE 中，router 的主要作用是什么？', options: ['存储训练数据', '决定把输入分给哪些 expert', '替代位置编码', '压缩模型参数'], answer: '决定把输入分给哪些 expert', explanation: 'router 负责路由。' },
      { type: 'boolean', question: 'MoE 参数量大，就意味着每次推理一定会激活所有参数。', options: ['对', '错'], answer: '错', explanation: 'MoE 的重点恰恰是只激活一部分参数。' }
    ]
  },
  'machine-learning': {
    title: '机器学习',
    category: 'AI Basics',
    summaryShort: '机器学习是让系统从数据中学习规律，并用这些规律做预测或决策的方法。',
    summaryPlain: '它不是把所有规则都手写进去，而是给模型足够多的数据，让它自己总结模式。',
    summaryTechnical: '机器学习通常包括数据、特征或表示、目标函数、优化过程和评估指标。模型会在训练数据上调整参数，再在新数据上泛化。',
    analogy: '像一个新手通过大量例题慢慢学会判断，而不是每一步都靠老师手把手写规则。',
    keyPoints: ['从数据中学习规律', '训练和泛化是核心', '评估指标决定好坏'],
    weakSpots: ['容易把机器学习和规则系统混淆', '容易只记模型名而忽略数据和评估'],
    quiz: [
      { type: 'single', question: '机器学习和手写规则系统最核心的区别是什么？', options: ['机器学习不需要数据', '机器学习通过数据学习规律', '机器学习只用于图片', '机器学习不需要评估'], answer: '机器学习通过数据学习规律', explanation: '机器学习的核心是从数据中学习。' },
      { type: 'single', question: '下面哪一项最能体现“泛化”？', options: ['记住训练集里的每一条记录', '在新样本上也能做出合理判断', '把模型部署到网页', '使用更大的字体展示结果'], answer: '在新样本上也能做出合理判断', explanation: '泛化强调对未见样本的表现。' },
      { type: 'boolean', question: '只要训练集效果很好，模型就一定是好的。', options: ['对', '错'], answer: '错', explanation: '还要看验证集或测试集上的表现。' }
    ]
  },
  agents: {
    title: 'AI Agents',
    category: 'Agent Systems',
    summaryShort: 'AI Agents 是会规划步骤、调用工具并根据反馈继续执行任务的系统。',
    summaryPlain: '它不只是一次回答问题，而是像一个会分步骤做事的助手：先理解目标，再决定下一步怎么做。',
    summaryTechnical: 'Agent 系统一般包含目标理解、规划、工具调用、记忆或状态管理、以及结果反思等环节。重点不只是模型本身，而是整个执行循环。',
    analogy: '像一个实习生接到任务后，会先拆任务、查资料、用工具、再汇报结果。',
    keyPoints: ['不仅回答，还会执行步骤', '常和工具调用、记忆、规划结合', '关键在多步闭环'],
    weakSpots: ['容易把 agent 和普通 chatbot 混为一谈', '容易忽视状态管理与工具协同'],
    quiz: [
      { type: 'single', question: 'Agent 和普通单轮问答最关键的区别是什么？', options: ['Agent 一定更快', 'Agent 更强调多步执行和工具协同', 'Agent 不需要模型', 'Agent 只能在本地运行'], answer: 'Agent 更强调多步执行和工具协同', explanation: 'Agent 的关键是任务循环与执行。' },
      { type: 'single', question: '下面哪一项更像 Agent 系统的一部分？', options: ['规划下一步动作', '只显示静态文案', '改变按钮颜色', '调整页面字体'], answer: '规划下一步动作', explanation: '规划是 Agent 常见能力。' },
      { type: 'boolean', question: '有聊天界面就一定是 Agent。', options: ['对', '错'], answer: '错', explanation: '界面形式不能决定它是不是 Agent。' }
    ]
  },
  mcp: {
    title: 'MCP',
    category: 'Tool Protocol',
    summaryShort: 'MCP（Model Context Protocol）是一种让模型更稳定接入外部工具和上下文的协议思路。',
    summaryPlain: '你可以把它理解成“给模型接工具时的一套统一接口规则”，这样不同工具和不同客户端更容易协同。',
    summaryTechnical: 'MCP 关注的是模型与外部资源之间的标准化交互，例如工具暴露方式、上下文获取方式和调用边界。重点在协议层，而不是某一个具体模型能力。',
    analogy: '像给不同插头统一成同一套标准接口，这样设备更容易互相兼容。',
    keyPoints: ['重点是标准化接入', '强调工具与上下文的统一交互方式', '属于协议层思路'],
    weakSpots: ['容易把协议和具体产品功能混淆', '容易误以为它本身就是模型能力'],
    quiz: [
      { type: 'single', question: 'MCP 更偏向解决哪类问题？', options: ['让模型参数变大', '让模型和外部工具更标准地连接', '把图片变高清', '替代数据库'], answer: '让模型和外部工具更标准地连接', explanation: 'MCP 更偏协议与集成。' },
      { type: 'single', question: 'MCP 的关注点更接近下面哪一项？', options: ['协议层交互', '模型训练损失函数', '前端动效', 'GPU 散热'], answer: '协议层交互', explanation: '它关注的是标准化交互。' },
      { type: 'boolean', question: 'MCP 本身就等于一个具体的 AI 产品。', options: ['对', '错'], answer: '错', explanation: 'MCP 更像一种协议思路，而不是单一产品。' }
    ]
  },
  evals: {
    title: 'Evals',
    category: 'Evaluation',
    summaryShort: 'Evals 是系统性评估模型或 AI 应用表现的一套方法。',
    summaryPlain: '不是“感觉回答不错”就算好，而是要先定义目标，再用数据和标准去判断它到底表现如何。',
    summaryTechnical: 'Evals 常涉及测试集构建、指标设计、人工标注或自动评分，以及对不同版本模型/应用输出做对比分析。',
    analogy: '像考试前先定评分标准，再用同一套卷子比较不同学生的表现。',
    keyPoints: ['先定义标准再评估', '可以用于模型也可以用于应用', '重点在可比较、可复现'],
    weakSpots: ['容易只看单次示例，不做系统评估', '容易忽视指标设计'],
    quiz: [
      { type: 'single', question: 'Evals 最重要的意义是什么？', options: ['让页面更美观', '系统性判断模型/应用表现', '替代训练过程', '避免写文档'], answer: '系统性判断模型/应用表现', explanation: 'Evals 强调有标准地评估。' },
      { type: 'single', question: '下面哪项更像一套 eval 的必要组成？', options: ['测试集和评估标准', '更大的 Logo', '更多页面动效', '更长的按钮文案'], answer: '测试集和评估标准', explanation: '没有标准就无法稳定比较。' },
      { type: 'boolean', question: '只看几个案例感觉不错，就足够说明系统表现稳定。', options: ['对', '错'], answer: '错', explanation: '需要更系统的评估方式。' }
    ]
  },
  lora: {
    title: 'LoRA',
    category: 'Fine-tuning',
    summaryShort: 'LoRA 是一种用更少参数完成模型微调的方法。',
    summaryPlain: '它不是把整个大模型都重新训练一遍，而是在原模型上额外挂一小部分可训练参数，从而用更低成本完成定制。',
    summaryTechnical: 'LoRA（Low-Rank Adaptation）通过在权重更新中引入低秩矩阵分解，只训练少量新增参数，通常用于降低 fine-tuning 的显存和训练开销。',
    analogy: '像给一件成衣做局部改版，而不是整套重新裁一遍。',
    keyPoints: ['只训练少量新增参数', '适合低成本定制', '常和大模型微调一起出现'],
    weakSpots: ['容易把 LoRA 和完整微调混淆', '容易只记“便宜”而忽略它是参数高效方法'],
    quiz: [
      { type: 'single', question: 'LoRA 的核心价值是什么？', options: ['让模型不需要数据', '用更少参数完成微调', '替代推理服务', '让模型自动联网'], answer: '用更少参数完成微调', explanation: 'LoRA 的关键是参数高效微调。' },
      { type: 'single', question: 'LoRA 最常见的使用场景是什么？', options: ['数据库迁移', '大模型定制化训练', '前端样式调整', '图像压缩'], answer: '大模型定制化训练', explanation: 'LoRA 经常用于低成本微调大模型。' },
      { type: 'boolean', question: 'LoRA 一定要重训整个大模型。', options: ['对', '错'], answer: '错', explanation: 'LoRA 恰恰是为了避免完整重训。' }
    ]
  },
  embeddings: {
    title: 'Embeddings',
    category: 'Representation',
    summaryShort: 'Embeddings 是把文本、图片等内容转换成向量表示的方法。',
    summaryPlain: '它的目标不是直接回答问题，而是把内容变成“机器更容易比较相似度”的数字表示。',
    summaryTechnical: 'Embedding 模型会把输入映射到高维向量空间，使得语义相近的内容在向量空间里距离更近，常用于检索、聚类和推荐。',
    analogy: '像把不同书的内容压缩成坐标点，内容越相近，坐标越靠近。',
    keyPoints: ['核心是向量表示', '常用于检索和相似度比较', '不等于生成模型本身'],
    weakSpots: ['容易把 embedding 和生成混淆', '容易只记“向量”不知道用途'],
    quiz: [
      { type: 'single', question: 'Embeddings 最适合解决哪类问题？', options: ['相似内容检索', '直接生成长文', '替代数据库', '训练 GPU'], answer: '相似内容检索', explanation: 'Embedding 常用于语义检索和相似度比较。' },
      { type: 'single', question: 'Embedding 的核心输出是什么？', options: ['一个网页界面', '一个向量表示', '一段音频', '一张图片'], answer: '一个向量表示', explanation: 'Embedding 的输出通常是向量。' },
      { type: 'boolean', question: 'Embedding 模型的目标通常是直接生成回答。', options: ['对', '错'], answer: '错', explanation: '它更常用于表示和比较，而不是直接生成。' }
    ]
  },
  'context-window': {
    title: 'Context Window',
    category: 'Inference',
    summaryShort: 'Context Window 指模型一次能处理的上下文长度范围。',
    summaryPlain: '你可以把它理解成模型“一次能看多少内容”的限制。内容太多时，模型就不能同时看到所有信息。',
    summaryTechnical: 'Context Window 通常用 token 数衡量，决定模型在一次推理中能接收的 prompt、历史对话和检索片段总长度。',
    analogy: '像一个人的工作记忆容量，一次只能同时盯住有限的信息。',
    keyPoints: ['通常用 token 数衡量', '影响 prompt 设计和 RAG 拼接策略', '不等于模型永久记忆能力'],
    weakSpots: ['容易把上下文窗口和长期记忆混淆', '容易忽略 token 长度限制'],
    quiz: [
      { type: 'single', question: 'Context Window 更接近下面哪种能力？', options: ['模型长期记忆上限', '模型一次能处理的上下文长度', '模型训练速度', '模型部署价格'], answer: '模型一次能处理的上下文长度', explanation: 'Context Window 关注的是一次推理中的可见内容。' },
      { type: 'single', question: '下面哪项会直接受到 Context Window 影响？', options: ['输入内容能否一次全部放进去', '显示器分辨率', '网页主题色', '磁盘容量'], answer: '输入内容能否一次全部放进去', explanation: '上下文窗口限制一次可见内容量。' },
      { type: 'boolean', question: '上下文窗口越大，就代表模型一定更聪明。', options: ['对', '错'], answer: '错', explanation: '窗口大小和整体能力不是简单等价关系。' }
    ]
  },
  guardrails: {
    title: 'Guardrails',
    category: 'Safety',
    summaryShort: 'Guardrails 是为了约束模型输出行为而加的一层规则或机制。',
    summaryPlain: '它的目标不是让模型更会回答，而是让回答更稳、更安全、更符合边界。',
    summaryTechnical: 'Guardrails 可以体现在输入校验、输出过滤、策略规则、敏感内容检测或人工复核流程中，通常服务于安全与合规。',
    analogy: '像高速公路两边的护栏，不负责让车更快，但能减少偏离路线的风险。',
    keyPoints: ['服务于安全与边界控制', '可以加在输入或输出阶段', '常与策略规则和审核流程结合'],
    weakSpots: ['容易误以为 guardrails 只是一句提示词', '容易忽略系统层面的约束设计'],
    quiz: [
      { type: 'single', question: 'Guardrails 最主要的作用是什么？', options: ['让模型更安全、更可控', '让数据库更快', '增加训练数据', '美化页面'], answer: '让模型更安全、更可控', explanation: 'Guardrails 的重点是边界和控制。' },
      { type: 'single', question: '下面哪项更像 guardrail 机制？', options: ['输出前做敏感内容过滤', '把按钮改大', '增加页面留白', '减少图片体积'], answer: '输出前做敏感内容过滤', explanation: '过滤和审核属于常见 guardrail 机制。' },
      { type: 'boolean', question: 'Guardrails 只可能出现在 prompt 里。', options: ['对', '错'], answer: '错', explanation: 'Guardrails 也可以体现在系统规则、审核流程和过滤器里。' }
    ]
  },
  multimodal: {
    title: 'Multimodal',
    category: 'Model Capability',
    summaryShort: 'Multimodal 指模型可以处理多种模态的信息，比如文本、图片、音频。',
    summaryPlain: '它不是只看一种输入，而是能把文字、图像、声音等内容结合起来理解。',
    summaryTechnical: '多模态模型通常需要把不同模态映射到可以协同处理的表示空间，再统一完成理解、推理或生成任务。',
    analogy: '像一个人不只会读文字，还能看图和听声音，再综合判断。',
    keyPoints: ['核心是跨模态理解与协同', '输入不再局限于文本', '常见场景包括图文问答和语音理解'],
    weakSpots: ['容易把多模态理解成“只是多加一个图片上传按钮”', '容易忽略不同模态融合的难点'],
    quiz: [
      { type: 'single', question: 'Multimodal 的核心特征是什么？', options: ['只处理文字', '能处理多种模态的信息', '一定需要联网', '一定需要更多页面组件'], answer: '能处理多种模态的信息', explanation: '多模态的关键是处理不同类型的输入。' },
      { type: 'single', question: '下面哪项更像多模态应用？', options: ['看图回答问题', '只输出纯文本定义', '压缩数据库', '修改 CSS'], answer: '看图回答问题', explanation: '图文结合是典型多模态场景。' },
      { type: 'boolean', question: '多模态只意味着输入变多，不涉及统一理解。', options: ['对', '错'], answer: '错', explanation: '重点是统一理解与协同。' }
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
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}\-]/gu, '')
    || `concept-${Date.now()}`;
}

function pickSeed(input) {
  const key = slugify(input).replace(/_/g, '-');
  const aliases = {
    '机器学习': 'machine-learning',
    'machinelearning': 'machine-learning',
    'functioncalling': 'function-calling',
    'contextwindow': 'context-window',
    'ai-agents': 'agents',
    'agent': 'agents',
    'ai-agent': 'agents',
    'agentsystems': 'agents'
  };
  const mapped = aliases[key] || aliases[key.replace(/-/g, '')];
  return conceptSeeds[key] || conceptSeeds[key.replace(/-/g, '')] || (mapped ? conceptSeeds[mapped] : null) || null;
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


function findUserByEmail(email) {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  return row ? {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    streak: row.streak,
    focus: row.focus,
    createdAt: row.created_at
  } : null;
}

function createUser(name, email) {
  const user = {
    id: slugify(email) || randomUUID(),
    name,
    email,
    role: 'Learner',
    streak: 1,
    focus: 'New concepts',
    createdAt: new Date().toISOString()
  };
  db.prepare(`
    INSERT INTO users (id, name, email, role, streak, focus, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, user.name, user.email, user.role, user.streak, user.focus, user.createdAt);
  return user;
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

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    return collectBody(req)
      .then((body) => {
        const name = (body.name || '').trim();
        const email = (body.email || '').trim().toLowerCase();
        if (!name || !email) return sendJson(res, 400, { error: 'name and email are required' });
        let user = findUserByEmail(email);
        if (!user) user = createUser(name, email);
        sendJson(res, 200, { user });
      })
      .catch(() => sendJson(res, 400, { error: 'invalid json body' }));
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
