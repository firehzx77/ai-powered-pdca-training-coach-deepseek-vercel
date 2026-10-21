import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  IBorderOptions,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { PDCAMode, PDCAStep } from '../types';

type StepKey = keyof PDCAStep;

interface FieldDef {
  key: string;
  label: string;
  hint: string;
}

interface PhaseDef {
  key: StepKey;
  letter: string;
  en: string;
  zh: string;
  desc: string;
  color: string;
  tint: string;
}

export interface WordExportOptions {
  mode: PDCAMode;
  data: PDCAStep;
  auditResult?: string | null;
}

const FONT = { ascii: 'Segoe UI', hAnsi: 'Segoe UI', eastAsia: 'Microsoft YaHei', cs: 'Segoe UI' };

const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN_X = 1134;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const INK = '1E293B';
const MUTED = '64748B';
const LINE = 'E2E8F0';
const PAPER = 'F8FAFC';

const MODE_THEME: Record<PDCAMode, { name: string; tagline: string; primary: string; deep: string; tint: string }> = {
  A: {
    name: 'A 模式 · 目标制定 → 落地执行',
    tagline: '驱动指标拆解 · DoD 验收标准 · 风险对策',
    primary: '4F46E5',
    deep: '312E81',
    tint: 'EEF2FF',
  },
  B: {
    name: 'B 模式 · 问题分析 → 根因解决',
    tagline: '5Why 根因分析 · 止血 / 治病 / 强身 · 标准化',
    primary: '7C3AED',
    deep: '4C1D95',
    tint: 'F5F3FF',
  },
};

const PHASES: PhaseDef[] = [
  { key: 'p', letter: 'P', en: 'Plan', zh: '计划', desc: '定义目标与实施计划的基础', color: '2563EB', tint: 'EFF6FF' },
  { key: 'd', letter: 'D', en: 'Do', zh: '执行', desc: '执行过程记录与关键控制点', color: '059669', tint: 'ECFDF5' },
  { key: 'c', letter: 'C', en: 'Check', zh: '检查', desc: '检查结果与偏差原因分析', color: 'D97706', tint: 'FFFBEB' },
  { key: 'a', letter: 'A', en: 'Act', zh: '改进', desc: '持续改进、纠偏与标准化建议', color: 'DB2777', tint: 'FDF2F8' },
];

const FIELDS: Record<PDCAMode, Record<StepKey, FieldDef[]>> = {
  A: {
    p: [
      { key: 'goal', label: '具体目标 (Outcome)', hint: '明确努力的方向，必须符合 SMART 原则。' },
      { key: 'krs', label: '关键驱动指标 (Key Drivers)', hint: '拆解支撑目标达成的关键量化指标（Leading Indicators）。' },
      { key: 'risks', label: '潜在风险与预案', hint: '识别可能阻碍计划的外部或内部因素，并给出防范策略。' },
    ],
    d: [
      { key: 'schedule', label: '详细执行计划', hint: '明确具体的执行时间线与对应的责任人。' },
      { key: 'dod', label: '验收标准 (Definition of Done)', hint: '定义统一的完成质量标准，避免“交付不合格”。' },
    ],
    c: [
      { key: 'progress', label: '实际达成进度', hint: '客观呈现当前成果，与计划指标进行量化对比。' },
      { key: 'deviations', label: '偏差分类', hint: '区分是“执行不到位”还是“计划不科学”。' },
    ],
    a: [
      { key: 'correction', label: '纠偏动作', hint: '针对偏差立即采取的补位或调优动作。' },
      { key: 'standardization', label: '固化与标准化', hint: '将成功的经验或教训固化为制度，防止问题复发。' },
    ],
  },
  B: {
    p: [
      { key: 'problem', label: '问题陈述', hint: '量化描述现状与理想状况之间的真实差距。' },
      { key: 'rootCauses', label: '根因分析 (5Why)', hint: '使用 5Why 法挖掘表面现象背后的根本矛盾。' },
    ],
    d: [
      { key: 'solutions', label: '对策方案 (止血 / 治病 / 强身)', hint: '提供临时补救、根本解决、能力增强三个维度的治理方案。' },
      { key: 'validationPlan', label: '验证方法', hint: '设计可落地的实验或测试来验证对策的有效性。' },
    ],
    c: [
      { key: 'results', label: '实施结果', hint: '记录对策实施后核心指标的真实变化数据。' },
      { key: 'unexpected', label: '意外收获 / 教训', hint: '记录计划之外的副作用、次生影响或意外收获。' },
    ],
    a: [
      { key: 'standardization', label: '标准化 (制度 / 流程)', hint: '从组织制度层面防止问题再次发生。' },
      { key: 'horizontalSharing', label: '横向拉通', hint: '将此次解决经验分享给其他可能受益的团队。' },
    ],
  },
};

const NONE: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const thin = (color = LINE): IBorderOptions => ({ style: BorderStyle.SINGLE, size: 4, color });

interface RunOpts {
  size?: number;
  color?: string;
  bold?: boolean;
  italics?: boolean;
  characterSpacing?: number;
}

const run = (text: string, o: RunOpts = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? 21, color: o.color ?? INK, bold: o.bold, italics: o.italics, characterSpacing: o.characterSpacing });

const para = (
  children: TextRun[],
  o: { align?: Align; before?: number; after?: number; line?: number; keepNext?: boolean } = {}
) =>
  new Paragraph({
    children,
    alignment: o.align,
    keepNext: o.keepNext,
    spacing: { before: o.before ?? 0, after: o.after ?? 0, line: o.line ?? 300, lineRule: LineRuleType.AUTO },
  });

const spacer = (after = 200, keepNext = false) => para([run('')], { after, line: 240, keepNext });

type Align = (typeof AlignmentType)[keyof typeof AlignmentType];
type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;

const cell = (
  children: (Paragraph | Table)[],
  o: {
    width: number;
    fill?: string;
    borders?: Partial<Record<'top' | 'bottom' | 'left' | 'right', IBorderOptions>>;
    pad?: [number, number, number, number];
    vAlign?: VAlign;
    columnSpan?: number;
  }
) =>
  new TableCell({
    children,
    width: { size: o.width, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, ...o.borders },
    margins: o.pad ? { top: o.pad[0], right: o.pad[1], bottom: o.pad[2], left: o.pad[3] } : undefined,
    verticalAlign: o.vAlign ?? VerticalAlign.CENTER,
    columnSpan: o.columnSpan,
  });

const table = (columnWidths: number[], rows: TableRow[]) =>
  new Table({
    width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows,
  });

const valueOf = (data: PDCAStep, step: StepKey, key: string) => {
  const v = data?.[step]?.[key];
  return v == null ? '' : String(v).trim();
};

const phaseStats = (mode: PDCAMode, data: PDCAStep, step: StepKey) => {
  const fields = FIELDS[mode][step];
  const filled = fields.filter(f => valueOf(data, step, f.key).length > 0).length;
  return { filled, total: fields.length };
};

/** Parses `**bold**` segments so AI review text keeps its emphasis without raw markdown symbols. */
const inlineRuns = (line: string, base: RunOpts) => {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map(p =>
    p.startsWith('**') && p.endsWith('**') ? run(p.slice(2, -2), { ...base, bold: true }) : run(p.replace(/`/g, ''), base)
  );
};

const richParagraphs = (text: string, base: RunOpts = {}, keepNext = false) => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: Paragraph[] = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      out.push(para(inlineRuns(heading[1], { ...base, bold: true, size: (base.size ?? 21) + 2 }), { before: 120, after: 60, keepNext }));
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      out.push(
        new Paragraph({
          children: [run('●  ', { ...base, size: 14, color: base.color ?? MUTED }), ...inlineRuns(bullet[1], base)],
          indent: { left: 280, hanging: 280 },
          spacing: { after: 60, line: 320 },
          keepNext,
        })
      );
      continue;
    }
    out.push(para(inlineRuns(line.trim(), base), { after: 80, line: 320, keepNext }));
  }
  return out;
};

const progressBar = (ratio: number, width: number, color: string) => {
  const filledW = Math.max(0, Math.min(width, Math.round(width * ratio)));
  const widths = [filledW, width - filledW].filter(w => w > 0);
  const fills = filledW > 0 ? [color, LINE] : [LINE];
  const segs = widths.map((w, i) => cell([para([run('', { size: 2 })], { line: 240 })], { width: w, fill: fills[i] }));
  return table(widths, [new TableRow({ cantSplit: true, height: { value: 110, rule: HeightRule.EXACT }, children: segs })]);
};

function buildCover(mode: PDCAMode, data: PDCAStep, hasReview: boolean) {
  const theme = MODE_THEME[mode];
  const totals = PHASES.map(p => phaseStats(mode, data, p.key));
  const filled = totals.reduce((a, t) => a + t.filled, 0);
  const total = totals.reduce((a, t) => a + t.total, 0);
  const pct = total ? Math.round((filled / total) * 100) : 0;
  const date = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const hero = table([CONTENT_WIDTH], [
    new TableRow({ cantSplit: true,
      height: { value: 4600, rule: HeightRule.ATLEAST },
      children: [
        cell(
          [
            para([run('PDCA TRAINING REPORT', { size: 18, color: 'C7D2FE', bold: true, characterSpacing: 60 })], { after: 360 }),
            para([run('PDCA 训练作业报告', { size: 64, color: 'FFFFFF', bold: true })], { after: 200, line: 240 }),
            para([run(theme.name, { size: 28, color: 'E0E7FF' })], { after: 120 }),
            para([run(theme.tagline, { size: 20, color: 'C7D2FE' })], { after: 0 }),
          ],
          { width: CONTENT_WIDTH, fill: theme.deep, pad: [720, 720, 720, 720], vAlign: VerticalAlign.BOTTOM }
        ),
      ],
    }),
    new TableRow({ cantSplit: true,
      height: { value: 160, rule: HeightRule.EXACT },
      children: [cell([para([run('', { size: 2 })], { line: 240 })], { width: CONTENT_WIDTH, fill: theme.primary })],
    }),
  ]);

  const labelW = 1900;
  const infoRow = (label: string, value: TextRun[]) =>
    new TableRow({ cantSplit: true,
      children: [
        cell([para([run(label, { size: 20, color: MUTED })])], { width: labelW, pad: [150, 120, 150, 0], borders: { bottom: thin() } }),
        cell([para(value)], { width: CONTENT_WIDTH - labelW, pad: [150, 0, 150, 120], borders: { bottom: thin() } }),
      ],
    });

  const info = table([labelW, CONTENT_WIDTH - labelW], [
    infoRow('学员姓名', [run('______________________', { color: 'CBD5E1' })]),
    infoRow('所属部门', [run('______________________', { color: 'CBD5E1' })]),
    infoRow('训练模式', [run(theme.name, { bold: true, color: theme.primary })]),
    infoRow('导出日期', [run(date)]),
    infoRow('填写完成度', [
      run(`${pct}%`, { bold: true, size: 24, color: theme.primary }),
      run(`   已填写 ${filled} / ${total} 项`, { size: 19, color: MUTED }),
    ]),
    infoRow('教师点评', [hasReview ? run('已附 AI 讲师点评', { color: '059669', bold: true }) : run('暂未生成', { color: MUTED })]),
  ]);

  const gap = 120;
  const tileW = Math.floor((CONTENT_WIDTH - gap * 3) / 4);
  const tiles: TableCell[] = [];
  const widths: number[] = [];
  PHASES.forEach((p, i) => {
    const t = totals[i];
    tiles.push(
      cell(
        [
          para([run(p.letter, { size: 52, bold: true, color: 'FFFFFF' })], { align: AlignmentType.CENTER, line: 240 }),
          para([run(`${p.en} · ${p.zh}`, { size: 18, color: 'FFFFFF', bold: true })], { align: AlignmentType.CENTER, before: 60 }),
          para([run(`${t.filled}/${t.total} 已完成`, { size: 16, color: 'FFFFFF' })], { align: AlignmentType.CENTER, before: 40 }),
        ],
        { width: tileW, fill: p.color, pad: [220, 80, 220, 80] }
      )
    );
    widths.push(tileW);
    if (i < PHASES.length - 1) {
      tiles.push(cell([para([run('')])], { width: gap }));
      widths.push(gap);
    }
  });
  const strip = table(widths, [new TableRow({ cantSplit: true, children: tiles })]);

  return [
    hero,
    spacer(480),
    para([run('基本信息', { size: 24, bold: true, color: INK })], { after: 120 }),
    info,
    spacer(480),
    para([run('闭环概览', { size: 24, bold: true, color: INK })], { after: 160 }),
    strip,
    spacer(600),
    para([run('Plan → Do → Check → Act，让每一次行动都成为下一次进步的起点。', { size: 19, italics: true, color: MUTED })], {
      align: AlignmentType.CENTER,
    }),
  ];
}

function buildOverview(mode: PDCAMode, data: PDCAStep) {
  const theme = MODE_THEME[mode];
  const cols = [1300, 3600, 2938, 1800];
  const head = (t: string, w: number, align: Align = AlignmentType.LEFT) =>
    cell([para([run(t, { size: 19, bold: true, color: 'FFFFFF' })], { align })], { width: w, fill: theme.deep, pad: [140, 160, 140, 160] });

  const rows = [
    new TableRow({ cantSplit: true,
      tableHeader: true,
      children: [head('阶段', cols[0], AlignmentType.CENTER), head('核心任务', cols[1]), head('完成进度', cols[2]), head('状态', cols[3], AlignmentType.CENTER)],
    }),
    ...PHASES.map((p, i) => {
      const s = phaseStats(mode, data, p.key);
      const ratio = s.total ? s.filled / s.total : 0;
      const status = ratio === 1 ? ['已完成', '059669'] : ratio > 0 ? ['进行中', 'D97706'] : ['未开始', '94A3B8'];
      const fill = i % 2 === 0 ? 'FFFFFF' : PAPER;
      const b = { bottom: thin() };
      const barW = cols[2] - 320;
      return new TableRow({ cantSplit: true,
        children: [
          cell([para([run(p.letter, { size: 32, bold: true, color: p.color })], { align: AlignmentType.CENTER, line: 240 })], {
            width: cols[0], fill, borders: b, pad: [160, 80, 160, 80],
          }),
          cell(
            [para([run(`${p.en} · ${p.zh}`, { bold: true, size: 21 })], { after: 40 }), para([run(p.desc, { size: 18, color: MUTED })])],
            { width: cols[1], fill, borders: b, pad: [160, 160, 160, 160] }
          ),
          cell([para([run(`${s.filled} / ${s.total} 项`, { size: 18, color: MUTED })], { after: 80 }), progressBar(ratio, barW, p.color)], {
            width: cols[2], fill, borders: b, pad: [160, 160, 160, 160],
          }),
          cell([para([run(status[0], { size: 19, bold: true, color: status[1] })], { align: AlignmentType.CENTER })], {
            width: cols[3], fill, borders: b,
          }),
        ],
      });
    }),
  ];

  return [sectionTitle('01', '作业总览', 'OVERVIEW', theme.primary), table(cols, rows), spacer(360)];
}

function sectionTitle(no: string, title: string, en: string, color: string) {
  return table([1100, CONTENT_WIDTH - 1100], [
    new TableRow({ cantSplit: true,
      children: [
        cell([para([run(no, { size: 44, bold: true, color })], { line: 240, keepNext: true })], { width: 1100, pad: [0, 0, 120, 0], borders: { bottom: { style: BorderStyle.SINGLE, size: 18, color } } }),
        cell(
          [para([run(title, { size: 32, bold: true })], { line: 240, keepNext: true }), para([run(en, { size: 16, color: MUTED, characterSpacing: 60 })], { before: 40, keepNext: true })],
          { width: CONTENT_WIDTH - 1100, pad: [0, 0, 120, 0], borders: { bottom: thin() } }
        ),
      ],
    }),
  ]);
}

function buildPhase(mode: PDCAMode, data: PDCAStep, phase: PhaseDef) {
  const s = phaseStats(mode, data, phase.key);
  const badgeW = 1250;

  const banner = table([badgeW, CONTENT_WIDTH - badgeW], [
    new TableRow({ cantSplit: true,
      children: [
        cell([para([run(phase.letter, { size: 60, bold: true, color: 'FFFFFF' })], { align: AlignmentType.CENTER, line: 240, keepNext: true })], {
          width: badgeW, fill: phase.color, pad: [200, 0, 200, 0],
        }),
        cell(
          [
            para([run(`${phase.en} 阶段 · ${phase.zh}`, { size: 30, bold: true, color: phase.color })], { line: 240, keepNext: true }),
            para([run(`${phase.desc}　|　已填写 ${s.filled} / ${s.total} 项`, { size: 18, color: MUTED })], { before: 80, keepNext: true }),
          ],
          { width: CONTENT_WIDTH - badgeW, fill: phase.tint, pad: [200, 300, 200, 300] }
        ),
      ],
    }),
  ]);

  const cards = FIELDS[mode][phase.key].flatMap((f, idx) => {
    const value = valueOf(data, phase.key, f.key);
    const body = value
      ? richParagraphs(value, { size: 21, color: INK }, true)
      : [para([run('（尚未填写）', { italics: true, color: '94A3B8' })], { keepNext: true })];

    const card = table([CONTENT_WIDTH], [
      new TableRow({ cantSplit: true,
        children: [
          cell(
            [
              para([
                run(`${String(idx + 1).padStart(2, '0')}  `, { size: 20, bold: true, color: phase.color }),
                run(f.label, { size: 22, bold: true }),
              ], { after: 120, keepNext: true }),
              ...body,
            ],
            {
              width: CONTENT_WIDTH,
              fill: 'FFFFFF',
              pad: [220, 300, 160, 300],
              vAlign: VerticalAlign.TOP,
              borders: { left: { style: BorderStyle.SINGLE, size: 36, color: phase.color }, top: thin(), right: thin() },
            }
          ),
        ],
      }),
      new TableRow({ cantSplit: true,
        children: [
          cell([para([run('填写要点  ', { size: 17, bold: true, color: phase.color }), run(f.hint, { size: 17, color: MUTED })])], {
            width: CONTENT_WIDTH,
            fill: PAPER,
            pad: [120, 300, 120, 300],
            borders: { left: { style: BorderStyle.SINGLE, size: 36, color: phase.color }, bottom: thin(), right: thin() },
          }),
        ],
      }),
    ]);
    return [card, spacer(220)];
  });

  return [banner, spacer(260, true), ...cards, spacer(200)];
}

function buildReview(mode: PDCAMode, review: string) {
  const amber = 'B45309';
  const box = table([CONTENT_WIDTH], [
    new TableRow({ cantSplit: true,
      children: [
        cell(
          [
            para([run('AI 讲师点评  ', { size: 24, bold: true, color: amber }), run('Teacher Review', { size: 17, color: 'D97706' })], { after: 160 }),
            ...richParagraphs(review, { size: 21, color: '44403C' }),
          ],
          {
            width: CONTENT_WIDTH,
            fill: 'FFFBEB',
            pad: [300, 360, 300, 360],
            vAlign: VerticalAlign.TOP,
            borders: { top: { style: BorderStyle.SINGLE, size: 24, color: 'F59E0B' }, bottom: thin('FDE68A'), left: thin('FDE68A'), right: thin('FDE68A') },
          }
        ),
      ],
    }),
  ]);
  return [sectionTitle('03', '教师点评', 'TEACHER REVIEW', MODE_THEME[mode].primary), spacer(160, true), box, spacer(360)];
}

function buildSignOff(mode: PDCAMode, no: string) {
  const half = Math.floor((CONTENT_WIDTH - 400) / 2);
  const block = (role: string) =>
    cell(
      [
        para([run(role, { size: 19, color: MUTED })], { after: 600 }),
        para([run('签名：', { size: 19, color: MUTED })], { after: 160 }),
        para([run('日期：', { size: 19, color: MUTED })]),
      ],
      { width: half, pad: [240, 300, 240, 300], fill: PAPER, vAlign: VerticalAlign.TOP, borders: { top: thin(), bottom: thin(), left: thin(), right: thin() } }
    );
  return [
    sectionTitle(no, '复盘确认', 'SIGN-OFF', MODE_THEME[mode].primary),
    spacer(200, true),
    table([half, 400, half], [new TableRow({ cantSplit: true, children: [block('学员确认'), cell([para([run('')])], { width: 400 }), block('讲师确认')] })]),
  ];
}

export async function buildPdcaDocument({ mode, data, auditResult }: WordExportOptions): Promise<Document> {
  const theme = MODE_THEME[mode];
  const review = auditResult?.trim();

  const header = new Header({
    children: [
      new Paragraph({
        children: [run('PDCA 训练作业教练', { size: 16, bold: true, color: theme.primary }), run(`　/　${theme.name}`, { size: 16, color: MUTED })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 6 } },
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ font: FONT, size: 16, color: MUTED, children: ['— 第 ', PageNumber.CURRENT, ' 页 / 共 ', PageNumber.TOTAL_PAGES, ' 页 —'] }),
        ],
      }),
    ],
  });

  const page = {
    size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
    margin: { top: 1134, bottom: 1134, left: MARGIN_X, right: MARGIN_X, header: 567, footer: 567 },
  };

  const details: (Paragraph | Table)[] = [sectionTitle('02', '作业详情', 'PDCA DETAILS', theme.primary), spacer(240, true)];
  PHASES.forEach(p => details.push(...buildPhase(mode, data, p)));

  return new Document({
    creator: 'PDCA 训练作业教练',
    title: `PDCA 训练作业报告 - ${theme.name}`,
    description: 'Generated by AI-Powered PDCA Training Coach',
    styles: {
      default: {
        document: { run: { font: FONT, size: 21, color: INK }, paragraph: { spacing: { line: 300 } } },
      },
    },
    sections: [
      { properties: { page }, children: buildCover(mode, data, !!review) },
      {
        properties: { page },
        headers: { default: header },
        footers: { default: footer },
        children: [
          ...buildOverview(mode, data),
          ...details,
          ...(review ? buildReview(mode, review) : []),
          ...buildSignOff(mode, review ? '04' : '03'),
        ],
      },
    ],
  });
}

export async function exportPdcaWord(options: WordExportOptions) {
  const doc = await buildPdcaDocument(options);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PDCA训练作业_${options.mode}模式_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
