/* 180 天学习计划：6 个阶段 · 26 周 · 180 个学习日
   每天的任务由 plan 引擎根据阶段、天数与内容池自动生成 */

export const PHASES = [
  { id: 1, name: '开口启动', range: [1, 30], en: 'Break the Silence',
    goals: ['掌握发音基础：长元音、咬舌音、词尾辅音', '学会 150 个生存高频词', '能用 30 秒完成自我介绍与问候寒暄'],
    decks: ['core'], minutes: 25, pro: false },
  { id: 2, name: '日常流利', range: [31, 60], en: 'Daily Fluency',
    goals: ['覆盖点餐、购物、出行、酒店、看病等 12 个生活场景', '累计词汇 300+', '能进行 3 分钟的日常闲聊'],
    decks: ['core', 'social'], minutes: 30, pro: false },
  { id: 3, name: '职场沟通', range: [61, 90], en: 'Workplace English',
    goals: ['掌握会议、电话、汇报、跟进的标准表达', '累计词汇 400+', '能在英文会议中发言并确认信息'],
    decks: ['core', 'social', 'work'], minutes: 35, pro: false },
  { id: 4, name: '商务表达', range: [91, 120], en: 'Business Communication',
    goals: ['谈判、报价、异议处理、演示汇报', '掌握 60 个商务句型', '能独立完成 10 分钟产品介绍'],
    decks: ['work', 'core'], minutes: 40, pro: true },
  { id: 5, name: '暖通专业', range: [121, 150], en: 'HVAC Professional',
    goals: ['掌握暖通系统与设备术语 120+', '能讲解制冷循环、机房构成与能效指标', '能进行现场勘查与调试沟通'],
    decks: ['hvac', 'work'], minutes: 45, pro: true },
  { id: 6, name: '楼控与方案', range: [151, 180], en: 'BAS and Solutions',
    goals: ['掌握楼宇自控术语 120+', '能讲解系统架构、控制序列与节能策略', '能完成 15 分钟客户方案汇报并答疑'],
    decks: ['bas', 'hvac'], minutes: 45, pro: true },
];

export const WEEKS = [
  { w: 1, theme: '音标与问候', themeEn: 'Sounds and Greetings',
    days: ['字母与音标入门：认识 IPA', '问候与道别：Hello / Goodbye', '自我介绍：My name is ...', '礼貌三句：please / thanks / sorry', '数字 1-20 与年龄', '发音 1：θ 与 ð 咬舌音', '本周复盘：录一段 30 秒自我介绍'] },
  { w: 2, theme: '问路与时间', themeEn: 'Directions and Time',
    days: ['时间表达：几点、上午下午', '问路与指路：turn left / go straight', '数字 20-100 与价格', '电话号码与邮箱朗读', '交通方式：bus / metro / taxi', '发音 2：iː 与 ɪ 长短音', '本周复盘：模拟问路对话'] },
  { w: 3, theme: '饮食与购物', themeEn: 'Food and Shopping',
    days: ['咖啡店点单完整流程', '餐厅点餐与口味表达', '超市购物与结账', '衣服尺码与试穿', '付钱：现金 / 刷卡 / 找零', '发音 3：v 与 w', '本周复盘：点一份完整的午餐'] },
  { w: 4, theme: '出行与住宿', themeEn: 'Travel and Hotel',
    days: ['机场值机与登机', '行李与安检常用句', '酒店入住与退房', '房间问题：空调 / 热水 / Wi-Fi', '打车与目的地沟通', '发音 4：词尾辅音', '第一阶段测评：生活场景听读'] },

  { w: 5, theme: '天气与闲聊', themeEn: 'Weather and Small Talk',
    days: ['天气词汇与描述', '季节与穿衣建议', '闲聊三话题：天气 / 旅途 / 食物', '表达喜好与不喜欢', '发出邀请与接受 / 拒绝', '发音 5：句子重音', '本周复盘：3 分钟闲聊录音'] },
  { w: 6, theme: '健康与求助', themeEn: 'Health and Help',
    days: ['身体部位与症状', '看医生：描述症状', '药店买药与用法', '过敏与急救表达', '报警与求助句型', '发音 6：连读与失爆', '本周复盘：模拟一次看病'] },
  { w: 7, theme: '计划与邀请', themeEn: 'Plans and Invitations',
    days: ['周末计划与约时间', '接受与改期的说法', '电话预约与确认', '表达不确定与需要时间', '谈兴趣爱好', '发音 7：语调（升调与降调）', '本周复盘：约一次会议'] },
  { w: 8, theme: '银行与生活服务', themeEn: 'Services and Errands',
    days: ['银行开户与换汇', '快递与邮寄', '理发与描述发型', '租房与看房', '投诉与合理要求', '发音 8：s 与 z 的清浊', '第二阶段测评：日常生活综合'] },

  { w: 9, theme: '办公室日常', themeEn: 'Everyday Office',
    days: ['职场问候与自我介绍（正式版）', '部门与职位表达', '办公室设备与流程', '请求帮助与提供帮助', '请假与调休', '发音 9：单词重音位置', '本周复盘：办公室寒暄 2 分钟'] },
  { w: 10, theme: '电话与邮件', themeEn: 'Phone and Email',
    days: ['电话开场与转接', '留言与回电', '邮件口语化表达', '确认与澄清信息', '拼读邮箱和号码', '发音 10：数字与单位', '本周复盘：模拟一次客户来电'] },
  { w: 11, theme: '会议表达', themeEn: 'Meetings',
    days: ['会议开场与议程', '表达观点与赞同', '礼貌反对与建议', '提问与确认理解', '总结与行动项', '发音 11：弱读与 ə 音', '本周复盘：在会议中发言 3 次'] },
  { w: 12, theme: '进度与汇报', themeEn: 'Status and Reporting',
    days: ['进度汇报三段式', '说明问题与风险', '给出方案与时间表', '请求资源与支持', '会后邮件跟进', '发音 12：连读进阶', '第三阶段测评：会议与汇报'] },

  { w: 13, theme: '需求挖掘', themeEn: 'Discovery',
    days: ['开放式问题：what / how / why', '现状与痛点提问', '影响量化：时间与成本', '确认需求与复述', '识别决策角色', '发音 13：礼貌语气与降调', '本周复盘：一次完整需求访谈'] },
  { w: 14, theme: '产品介绍', themeEn: 'Product Introduction',
    days: ['电梯陈述 30 秒', '产品三段式：是什么 / 指标 / 价值', '对比表达：better than / compared with', '演示引导语', '回答问题不慌张', '发音 14：专业术语连读', '本周复盘：录 3 分钟产品讲解'] },
  { w: 15, theme: '报价与谈判', themeEn: 'Quotation and Negotiation',
    days: ['报价结构与术语', '价格异议的处理', '换条件而不是降价', '付款与交期条款', '让步与收口', '发音 15：强调语气', '本周复盘：模拟一轮价格谈判'] },
  { w: 16, theme: '方案汇报', themeEn: 'Proposal Presentation',
    days: ['汇报结构与开场', '描述数据与图表', '讲回收期与 ROI', '讲实施计划与风险', 'Q&A 应答策略', '发音 16：句子节奏', '第四阶段测评：10 分钟方案汇报'] },

  { w: 17, theme: '暖通基础概念', themeEn: 'HVAC Fundamentals',
    days: ['制冷循环四个部件', '冷源系统组成', '空气侧系统：AHU 与 VAV', '水系统：冷冻水与冷却水', '热舒适与空气品质', '发音 17：术语重音（chiller / condenser）', '本周复盘：用英文讲清制冷循环'] },
  { w: 18, theme: '设备与产品', themeEn: 'Equipment and Products',
    days: ['离心机 / 螺杆机 / 涡旋机', '空气处理机组与末端', '冷却塔与水泵', '变频与部分负荷', '产品参数表怎么读', '发音 18：数字与性能指标朗读', '本周复盘：介绍一款主机'] },
  { w: 19, theme: '能效与改造', themeEn: 'Efficiency and Retrofit',
    days: ['COP / EER / IPLV 解读', '能耗与电费换算', '改造方案的三个阶段', '施工期不停机安排', '测量与验证（M&V）', '发音 19：%/kW/ton 读法', '本周复盘：讲一次能效收益'] },
  { w: 20, theme: '现场与调试', themeEn: 'Site and Commissioning',
    days: ['现场安全与流程', '现场勘查记录要点', '调试项目与验收标准', '风水平衡 TAB', '故障排查问答', '发音 20：现场指令简短表达', '第五阶段测评：现场沟通演练'] },

  { w: 21, theme: '楼控架构', themeEn: 'BAS Architecture',
    days: ['三层架构讲解', '控制器与现场设备', '点位类型 AI/AO/DI/DO', '点位表阅读', '图纸与网络图', '发音 21：缩写字母读法', '本周复盘：讲清系统架构'] },
  { w: 22, theme: '协议与集成', themeEn: 'Protocols and Integration',
    days: ['BACnet 与 BACnet/IP', 'MS/TP 与串行总线', 'Modbus 与电表接入', '网关与点位映射', '第三方设备集成问答', '发音 22：协议名称朗读', '本周复盘：回答集成三问'] },
  { w: 23, theme: '控制序列与运行', themeEn: 'Sequence and Operation',
    days: ['控制序列（SOO）结构', '联锁与切换条件', 'PID 与死区', '报警分级与治理', '趋势数据分析', '发音 23：控制术语连读', '本周复盘：评审一段控制序列'] },
  { w: 24, theme: '节能与数据', themeEn: 'Energy and Data',
    days: ['节能策略清单', '群控与冷源优化', '能耗基线与报表', '故障检测与诊断（FDD）', '数字孪生与云平台', '发音 24：数据描述语气', '本周复盘：讲一份节能报表'] },
  { w: 25, theme: '安全与交付', themeEn: 'Security and Handover',
    days: ['控制网络安全', '远程访问与权限', '培训与交付资料', '服务协议与响应时间', '备件与升级计划', '发音 25：综合语音语调', '本周复盘：模拟交付会议'] },
  { w: 26, theme: '综合实战', themeEn: 'Final Simulation',
    days: ['模拟客户拜访（需求挖掘）', '模拟产品与方案讲解', '模拟报价与异议处理', '模拟高层 ROI 汇报', '半年总结与自评'] },
];

export const flatDays = () => {
  const out = [];
  let n = 0;
  for (const w of WEEKS) {
    for (const focus of w.days) {
      n += 1;
      if (n > 180) break;
      out.push({ day: n, week: w.w, focus, theme: w.theme, themeEn: w.themeEn });
    }
  }
  return out;
};

export const PLAN_DAYS = flatDays();

export const phaseForDay = (day) =>
  PHASES.find((p) => day >= p.range[0] && day <= p.range[1]) || PHASES[PHASES.length - 1];

export const planForDay = (day) => {
  const d = PLAN_DAYS[Math.min(PLAN_DAYS.length, Math.max(1, day)) - 1] || PLAN_DAYS[0];
  const phase = phaseForDay(d.day);
  const week = WEEKS.find((w) => w.w === d.week);
  const isReview = d.focus.includes('复盘') || d.focus.includes('测评');
  return { ...d, phase, weekObj: week, isReview };
};

/* 学习方法说明：刻意练习 + 高效学习 */
export const METHODS = [
  { id: 'm-01', title: '刻意练习：四个条件', ico: 'target',
    zh: '有效练习要有明确目标、全神贯注、即时反馈、走出舒适区。本 App 的每一句跟读都会立刻给出得分与漏读词，先听 → 再读 → 看反馈 → 重录，直到 85 分以上。',
    do: '每天挑 3 句最难的，反复到 85 分以上，而不是把 20 句都读 1 遍。' },
  { id: 'm-02', title: '间隔重复：SRS 记忆卡', ico: 'repeat',
    zh: '单词按遗忘曲线安排复习：记住的间隔拉长（1 天 → 3 天 → 7 天 → 16 天 → 38 天），忘记的回到 15 分钟后再来。系统自动排好今天该复习的词。',
    do: '只做 App 排出的复习队列，不要自己乱翻词表。' },
  { id: 'm-03', title: '主动回忆：先想再看', ico: 'brain',
    zh: '看中文说英文、听英文说意思，比反复阅读有效得多。App 的闪卡默认先让你回忆，再翻面看答案。',
    do: '翻面之前，一定先在脑子里说出答案，哪怕只说出一半。' },
  { id: 'm-04', title: '组块化：背短语不背单词', ico: 'blocks',
    zh: '母语者按"块"说话。记住 Could you ...?、I am not sure about ... 这样的框架，比单独记 could、sure 有用得多。',
    do: '把句型库里的框架抄进自己的句子，替换主语和名词。' },
  { id: 'm-05', title: '交错练习：混合复习', ico: 'shuffle',
    zh: '不同类型交替练（单词 → 听力 → 句子 → 对话），比一次只练一种更能形成长期记忆。App 的每日闯关会自动混合题型。',
    do: '每天至少玩一局混合闯关，让大脑"切换频道"。' },
  { id: 'm-06', title: '费曼技巧：讲给别人听', ico: 'users-round',
    zh: '只要能用自己的话讲清楚，就说明真的学会了。专业模块的"讲解演练"要求你用英文讲一段产品、一段控制逻辑，录音后自评。',
    do: '每周至少录 2 次讲解，讲完回听，找出卡住的地方。' },
  { id: 'm-07', title: '场景沉浸：在情境里学', ico: 'route',
    zh: '把语言放回场景：谁在说、在哪说、要达成什么。场景对话里每句话都可以点读、跟读、角色扮演。',
    do: '先完整听一遍，再选一个角色演一遍，最后交换角色。' },
  { id: 'm-08', title: '输出优先：先说对再说完', ico: 'mic',
    zh: '流利度来自大量的输出。允许自己出错，先用简单句说清楚，再逐步加细节。',
    do: '每天至少开口 10 分钟，哪怕对着手机说。' },
];
