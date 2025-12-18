/**
 * 공결 사유 템플릿
 */

export interface ExcuseTemplate {
  id: string
  label: string
  template: string
  category: "APPROVE" | "REJECT" | "BOTH"
}

// 승인 사유 템플릿
export const APPROVE_TEMPLATES: ExcuseTemplate[] = [
  {
    id: "approve-illness",
    label: "병가",
    template: "병가로 인한 공결을 승인합니다.",
    category: "APPROVE",
  },
  {
    id: "approve-family",
    label: "경조사",
    template: "경조사로 인한 공결을 승인합니다.",
    category: "APPROVE",
  },
  {
    id: "approve-official",
    label: "공식 행사",
    template: "공식 행사 참여로 인한 공결을 승인합니다.",
    category: "APPROVE",
  },
  {
    id: "approve-other",
    label: "기타 (승인)",
    template: "제출하신 사유를 검토한 결과 공결을 승인합니다.",
    category: "APPROVE",
  },
]

// 반려 사유 템플릿
export const REJECT_TEMPLATES: ExcuseTemplate[] = [
  {
    id: "reject-insufficient",
    label: "증빙 자료 부족",
    template: "제출하신 증빙 자료가 불충분하여 공결을 반려합니다. 추가 자료를 제출해 주시기 바랍니다.",
    category: "REJECT",
  },
  {
    id: "reject-invalid",
    label: "사유 부적절",
    template: "제출하신 사유가 공결 기준에 부적합하여 반려합니다.",
    category: "REJECT",
  },
  {
    id: "reject-late",
    label: "신청 기한 초과",
    template: "공결 신청 기한이 지나 반려합니다. 사전 신청이 필요합니다.",
    category: "REJECT",
  },
  {
    id: "reject-other",
    label: "기타 (반려)",
    template: "검토 결과 공결을 반려합니다.",
    category: "REJECT",
  },
]

// 모든 템플릿
export const ALL_TEMPLATES: ExcuseTemplate[] = [
  ...APPROVE_TEMPLATES,
  ...REJECT_TEMPLATES,
]

/**
 * 템플릿 ID로 템플릿 찾기
 */
export function getTemplateById(id: string): ExcuseTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id)
}

/**
 * 카테고리별 템플릿 가져오기
 */
export function getTemplatesByCategory(
  category: "APPROVE" | "REJECT"
): ExcuseTemplate[] {
  return ALL_TEMPLATES.filter(
    (t) => t.category === category || t.category === "BOTH"
  )
}

