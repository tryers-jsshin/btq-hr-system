export interface WorkTypeType {
  id: string
  name: string
  start_time: string
  end_time: string
  bgcolor: string
  fontcolor: string
  deduction_days?: number // 연차 차감량 (휴가 유형에만 적용)
  created_at: string
  updated_at: string
}
