
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronRight, 
  Home, 
  Target, 
  Search, 
  Layout, 
  Download, 
  MessageSquare, 
  Bot, 
  User, 
  ChevronLeft,
  FileText,
  RefreshCw,
  Trophy,
  AlertCircle,
  Settings2,
  CheckCircle2,
  Info
} from 'lucide-react';
import { 
  PDCAMode, 
  PDCAData, 
  ViewState, 
  INITIAL_STEP_A, 
  INITIAL_STEP_B, 
  ChatMessage 
} from './types';
import { AICoachService } from './services/geminiService';

const STORAGE_KEY = 'pdca_training_data';

const FIELD_METADATA: Record<string, { purpose: string; example: string }> = {
  // Mode A: Goal Setting
  goal: { purpose: "明确努力的方向，必须符合 SMART 原则。", example: "在 2024 年 Q3 前通过优化搜索排名将月活跃用户提升 20%。" },
  krs: { purpose: "拆解支撑目标达成的关键量化指标（Leading Indicators）。", example: "周均发布 5 篇深度内容，外链点击率提升至 3%。" },
  risks: { purpose: "识别可能阻碍计划的外部或内部因素。", example: "核心人员流动、竞品大幅降价、社交平台算法调整。" },
  schedule: { purpose: "明确具体的执行时间线与对应的责任人。", example: "7月1-10日：需求调研（负责人：张三）；7月15日：方案过审。" },
  dod: { purpose: "定义统一的完成质量标准，避免“交付不合格”。", example: "代码通过 100% 单元测试、操作手册同步更新、业务方签字确认。" },
  progress: { purpose: "客观呈现当前成果，与计划指标进行量化对比。", example: "目前用户增长 12%，对比 20% 目标仍有 8% 差距。" },
  deviations: { purpose: "分析差距原因，区分是“执行不到位”还是“计划不科学”。", example: "执行偏差：内容少发了 2 篇；计划偏差：流量单价预估过低。" },
  correction: { purpose: "针对偏差立即采取的补位或调优动作。", example: "下周加大内容投放密度以追平进度，并调高获客预算。" },
  standardization: { purpose: "将成功的经验或教训固化为制度，防止问题复发。", example: "将“双周进度审计”加入项目管理标准手册。" },
  
  // Mode B: Problem Solving
  problem: { purpose: "量化描述现状与理想状况之间的真实差距。", example: "接口平均响应从 50ms 升至 300ms，导致下单转化率下降 5%。" },
  rootCauses: { purpose: "使用 5Why 法挖掘表面现象背后的根本矛盾。", example: "缓存失效 -> 访问量激增 -> 内存配置不足 -> 未预设自动扩容逻辑。" },
  solutions: { purpose: "提供三个维度的治理方案（止血、治病、强身）。", example: "止血：手动扩容；治病：优化缓存策略；强身：建立自动扩容机制。" },
  validationPlan: { purpose: "设计可落地的实验或测试来验证对策的有效性。", example: "在测试环境模拟 10x 峰值流量，观察缓存命中率与延迟。" },
  results: { purpose: "记录对策实施后核心指标的真实变化数据。", example: "响应时间降至 45ms，下单转化率恢复至正常水平。" },
  unexpected: { purpose: "记录计划之外的副作用、次生影响或意外收获。", example: "优化后由于数据库负载降低，每月节省云服务器成本 400 元。" },
  horizontalSharing: { purpose: "将此次解决经验分享给其他可能受益的团队。", example: "将缓存优化脚本分享给支付和财务架构组进行同步检查。" }
};

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [activeMode, setActiveMode] = useState<PDCAMode>('A');
  const [currentStep, setCurrentStep] = useState<number>(0); // 0:P, 1:D, 2:C, 3:A
  const [data, setData] = useState<PDCAData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { modeA: INITIAL_STEP_A, modeB: INITIAL_STEP_B };
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const coach = useMemo(() => new AICoachService(), []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiThinking]);

  const steps = ['Plan', 'Do', 'Check', 'Act'];
  const stepKeys = ['p', 'd', 'c', 'a'] as const;

  const currentStepKey = stepKeys[currentStep];
  const currentPDCAStep = activeMode === 'A' ? data.modeA : data.modeB;

  const calculateProgress = (mode: PDCAMode) => {
    const stepData = mode === 'A' ? data.modeA : data.modeB;
    let total = 0;
    let filled = 0;
    Object.values(stepData).forEach(s => {
      Object.values(s).forEach(val => {
        total++;
        if (val && val.toString().trim().length > 0) filled++;
      });
    });
    return Math.round((filled / total) * 100);
  };

  const handleInputChange = (field: string, value: string) => {
    setData(prev => ({
      ...prev,
      [activeMode === 'A' ? 'modeA' : 'modeB']: {
        ...prev[activeMode === 'A' ? 'modeA' : 'modeB'],
        [currentStepKey]: {
          ...prev[activeMode === 'A' ? 'modeA' : 'modeB'][currentStepKey],
          [field]: value
        }
      }
    }));
  };

  const handleAiAction = async (prompt: string) => {
    setChatMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setIsAiThinking(true);
    setChatMessages(prev => [...prev, { role: 'model', content: '' }]);
    
    let fullResponse = "";
    try {
      const stream = coach.getSuggestionStream(activeMode, currentStepKey, currentPDCAStep, prompt);
      let isFirstChunk = true;
      for await (const chunk of stream) {
        if (isFirstChunk) {
          setIsAiThinking(false);
          isFirstChunk = false;
        }
        fullResponse += chunk;
        setChatMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', content: fullResponse };
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Streaming error in App:", error);
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'model', content: "抱歉，生成响应时遇到错误。" };
        return newMessages;
      });
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleAudit = async () => {
    setIsAiThinking(true);
    const result = await coach.auditPDCA(activeMode, currentPDCAStep);
    setAuditResult(result);
    setIsAiThinking(false);
  };

  const exportData = (format: 'json' | 'csv') => {
    const content = format === 'json' 
      ? JSON.stringify(currentPDCAStep, null, 2)
      : Object.entries(currentPDCAStep).map(([k, v]) => `${k.toUpperCase()},${JSON.stringify(v)}`).join('\n');
    
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdca_${activeMode}_${new Date().toISOString().slice(0,10)}.${format}`;
    a.click();
  };

  const renderField = (key: string, label: string, placeholder: string) => {
    const meta = FIELD_METADATA[key];
    return (
      <div className="mb-6 group relative" key={key}>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-semibold text-gray-700">{label}</label>
          <div className="relative flex items-center group/tooltip">
            <Info size={14} className="text-gray-400 cursor-help hover:text-indigo-600 transition-colors" />
            {meta && (
              <div className="absolute left-6 bottom-0 w-64 p-3 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none">
                <p className="font-bold mb-1 text-indigo-300">💡 填写建议</p>
                <p className="mb-2 text-gray-300">{meta.purpose}</p>
                <div className="border-t border-gray-700 pt-1">
                  <p className="font-bold text-green-400">✅ 优秀示例</p>
                  <p className="italic text-gray-400">{meta.example}</p>
                </div>
                <div className="absolute -left-1 bottom-1 w-2 h-2 bg-gray-900 rotate-45" />
              </div>
            )}
          </div>
        </div>
        <textarea
          value={currentPDCAStep[currentStepKey][key] || ''}
          onChange={(e) => handleInputChange(key, e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px] bg-gray-50/50 text-sm transition-all"
        />
      </div>
    );
  };

  if (view === 'home') {
    return (
      <div className="min-h-screen">
        <header className="gradient-header h-64 flex flex-col items-center justify-center text-white px-4">
          <h1 className="text-4xl font-bold mb-4">PDCA 训练作业教练</h1>
          <p className="text-lg opacity-90 max-w-xl text-center">
            利用 AI 深度辅导，将 PDCA 闭环思维内化为职业习惯。
          </p>
        </header>

        <main className="max-w-6xl mx-auto -mt-16 px-4 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden group hover:shadow-2xl transition-all border border-gray-100 flex flex-col">
              <div className="p-8 flex-1">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                  <Target size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">A) 目标制定 → 落地执行</h2>
                <p className="text-gray-600 mb-6">适合新项目启动、季度OKR/KPI制定。重点在于驱动指标拆解、DoD标准定义与风险对策。</p>
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">当前完成度</span>
                    <span className="font-semibold text-blue-600">{calculateProgress('A')}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${calculateProgress('A')}%` }} />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setActiveMode('A'); setView('editor'); }}
                className="w-full py-4 bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                进入练习 <ChevronRight size={20} />
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden group hover:shadow-2xl transition-all border border-gray-100 flex flex-col">
              <div className="p-8 flex-1">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                  <Search size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">B) 问题分析 → 根因解决</h2>
                <p className="text-gray-600 mb-6">适合故障复盘、质量问题攻关。重点在于5Why分析、止血/治病/强身三层对策及标准化。</p>
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">当前完成度</span>
                    <span className="font-semibold text-purple-600">{calculateProgress('B')}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${calculateProgress('B')}%` }} />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setActiveMode('B'); setView('editor'); }}
                className="w-full py-4 bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                进入练习 <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('home')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <Home size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              PDCA {activeMode === 'A' ? '目标落地' : '根因解决'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                {activeMode}模式
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin-slow" /> 自动保存中
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleAudit}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${auditResult ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Settings2 size={18} /> 教师点评
          </button>
          <button 
            onClick={() => exportData('json')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-100 transition-all"
          >
            <Download size={18} /> 导出
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto mb-10">
            <div className="relative flex justify-between items-center px-4">
              <div className="absolute left-8 right-8 h-0.5 bg-gray-200 top-1/2 -translate-y-1/2 -z-10" />
              {steps.map((step, idx) => (
                <button
                  key={step}
                  onClick={() => setCurrentStep(idx)}
                  className={`relative flex flex-col items-center gap-2 group transition-all ${idx === currentStep ? 'scale-110' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-4 shadow-sm transition-all
                    ${idx < currentStep ? 'bg-green-500 border-green-100 text-white' : 
                      idx === currentStep ? 'bg-indigo-600 border-indigo-100 text-white' : 
                      'bg-white border-gray-100 text-gray-400'}`}
                  >
                    {idx < currentStep ? <CheckCircle2 size={24} /> : step[0]}
                  </div>
                  <span className={`text-sm font-bold ${idx === currentStep ? 'text-indigo-600' : 'text-gray-500'}`}>
                    {step}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[500px]">
            <div className="mb-8 border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {currentStepKey.toUpperCase()}阶段 - {steps[currentStep]}
              </h2>
              <p className="text-gray-500 text-sm">
                {currentStep === 0 && "定义目标与实施计划的基础"}
                {currentStep === 1 && "执行过程记录与关键控制点"}
                {currentStep === 2 && "检查结果与偏差原因分析"}
                {currentStep === 3 && "持续改进、纠偏与标准化建议"}
              </p>
            </div>

            {activeMode === 'A' && (
              <>
                {currentStep === 0 && (
                  <>
                    {renderField('goal', '具体目标 (Outcome)', '写出符合SMART原则的目标...')}
                    {renderField('krs', '关键驱动指标 (Key Drivers)', '为了达成目标，需要完成哪些核心衡量指标？')}
                    {renderField('risks', '潜在风险与预案', '哪些外部因素可能干扰进度？对应的防范策略是什么？')}
                  </>
                )}
                {currentStep === 1 && (
                  <>
                    {renderField('schedule', '详细执行计划', '谁在什么时候做什么？关键节点是什么？')}
                    {renderField('dod', '验收标准 (Definition of Done)', '怎样才算真正“做完”了？')}
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    {renderField('progress', '实际达成进度', '对照P阶段，实际数据是多少？')}
                    {renderField('deviations', '偏差分类', '哪些是执行偏差？哪些是计划偏差？')}
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    {renderField('correction', '纠偏动作', '针对偏差，下一步做什么？')}
                    {renderField('standardization', '固化与标准化', '哪些经验可以形成SOP，避免下次出错？')}
                  </>
                )}
              </>
            )}

            {activeMode === 'B' && (
              <>
                {currentStep === 0 && (
                  <>
                    {renderField('problem', '问题陈述', '现状是什么？理想状况是什么？差距在哪里？')}
                    {renderField('rootCauses', '根因分析 (5Why)', '挖掘表面现象背后的真实原因...')}
                  </>
                )}
                {currentStep === 1 && (
                  <>
                    {renderField('solutions', '对策方案 (止血/治病/强身)', '临时补救、根本解决、能力增强。')}
                    {renderField('validationPlan', '验证方法', '如何证明你的对策是有效的？')}
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    {renderField('results', '实施结果', '数据验证后的真实反馈。')}
                    {renderField('unexpected', '意外收获/教训', '除了预期结果，还有什么发现？')}
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    {renderField('standardization', '标准化 (制度/流程)', '如何从组织制度层面防止问题再次发生？')}
                    {renderField('horizontalSharing', '横向拉通', '这个经验能否分享给其他部门或项目？')}
                  </>
                )}
              </>
            )}

            {auditResult && (
              <div className="mt-8 p-6 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 mb-3 text-orange-800 font-bold">
                  <Trophy size={20} /> 教师点评
                </div>
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {auditResult}
                </div>
                <button 
                  onClick={() => setAuditResult(null)}
                  className="mt-4 text-xs font-semibold text-orange-600 hover:text-orange-800"
                >
                  关闭点评
                </button>
              </div>
            )}

            <div className="flex justify-between mt-12 pt-8 border-t border-gray-100">
              <button
                disabled={currentStep === 0}
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-30 flex items-center gap-2"
              >
                <ChevronLeft size={18} /> 上一阶段
              </button>
              <button
                disabled={currentStep === 3}
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-6 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-black disabled:opacity-30 flex items-center gap-2"
              >
                下一阶段 <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </main>

        <aside className="w-[400px] border-l border-gray-200 bg-white flex flex-col shadow-2xl">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
            <div className="flex items-center gap-2 font-bold text-indigo-900">
              <Bot className="text-indigo-600" /> AI 教练
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isAiThinking ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{isAiThinking ? 'Thinking' : 'Ready'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {chatMessages.length === 0 && (
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={32} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  我是你的专属 PDCA 教练。你可以点击下方的“提示词”或者直接跟我交流，我会基于你填写的内容提供建议。
                </p>
              </div>
            )}
            
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-100' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200 whitespace-pre-wrap'
                }`}>
                  <div className="flex items-center gap-2 mb-1 opacity-70">
                    {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                    <span className="text-[10px] font-bold uppercase tracking-tight">
                      {msg.role === 'user' ? 'You' : 'AI Coach'}
                    </span>
                  </div>
                  {msg.content || (msg.role === 'model' && isAiThinking && idx === chatMessages.length - 1 ? "..." : msg.content)}
                </div>
              </div>
            ))}
            {isAiThinking && chatMessages[chatMessages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-gray-50/80 border-t border-gray-100">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">AI 增强指令</h4>
            <div className="grid grid-cols-2 gap-2">
              <button 
                disabled={isAiThinking}
                onClick={() => handleAiAction(activeMode === 'A' ? "请帮我把目前的目标改写为更专业的、可验收的SMART版本。" : "请帮我写出更有说服力的问题陈述。")}
                className="text-[11px] p-2 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-all text-left font-medium disabled:opacity-50"
              >
                {activeMode === 'A' ? "🎯 改写为可验收版本" : "📢 优化问题陈述"}
              </button>
              <button 
                disabled={isAiThinking}
                onClick={() => handleAiAction(activeMode === 'A' ? "基于我的目标，请推荐 3-5 个核心驱动指标及其权重。" : "根据问题描述，帮我列举 5 个可能的根因假设。")}
                className="text-[11px] p-2 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-all text-left font-medium disabled:opacity-50"
              >
                {activeMode === 'A' ? "📊 生成驱动指标建议" : "🔍 根因假设辅助"}
              </button>
              <button 
                disabled={isAiThinking}
                onClick={() => handleAiAction(activeMode === 'A' ? "针对此计划，分析可能的风险点并提供预案建议。" : "请生成一个分三层的解决方案（止血、治病、强身）。")}
                className="text-[11px] p-2 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-all text-left font-medium disabled:opacity-50"
              >
                {activeMode === 'A' ? "⚠️ 深度风险评估" : "💊 生成三层对策方案"}
              </button>
              <button 
                disabled={isAiThinking}
                onClick={() => handleAiAction(activeMode === 'A' ? "基于当前偏差，提供具体的纠偏动作建议。" : "根据现在的对策，如何制定可量化的标准化 SOP 指标？")}
                className="text-[11px] p-2 bg-white border border-gray-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-all text-left font-medium disabled:opacity-50"
              >
                {activeMode === 'A' ? "🔄 偏差纠正对策" : "📜 标准化关键指标"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
