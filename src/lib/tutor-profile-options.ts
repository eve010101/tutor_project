export const TUTOR_SUBJECT_OPTIONS = [
  "小学全科",
  "语文",
  "数学",
  "英语",
  "物理",
  "化学",
  "生物",
  "历史",
  "地理",
  "政治",
  "奥数",
  "信息学/编程",
] as const;

export const TUTOR_SERVICE_TYPE_OPTIONS = [
  "课后辅导",
  "陪读答疑",
  "竞赛辅导",
] as const;

export const TUTOR_GRADE_RANGE_OPTIONS = [
  "小学各年级",
  "初一初二初三",
  "高一高二高三",
] as const;

export const BEIJING_DISTRICT_OPTIONS = [
  "东城区",
  "西城区",
  "朝阳区",
  "海淀区",
  "丰台区",
  "石景山区",
  "门头沟区",
  "房山区",
  "通州区",
  "顺义区",
  "昌平区",
  "大兴区",
  "怀柔区",
  "平谷区",
  "密云区",
  "延庆区",
] as const;

export const TUTOR_AVAILABLE_TIME_GROUPS = [
  {
    label: "周一至周五",
    options: ["工作日上午", "工作日下午", "工作日晚上"] as const,
  },
  {
    label: "周末",
    options: ["周末上午", "周末下午", "周末晚上"] as const,
  },
] as const;

export const TUTOR_AVAILABLE_TIME_OPTIONS = TUTOR_AVAILABLE_TIME_GROUPS.flatMap(
  (group) => [...group.options]
);

export const TUTOR_GENDER_OPTIONS = ["男", "女"] as const;

export const TUTOR_ORDER_STATUS_OPTIONS = ["接单中", "暂不接单"] as const;
