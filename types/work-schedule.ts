export interface WorkScheduleEntry {
  id: string
  memberId: string
  date: string // YYYY-MM-DD 형식
  workTypeId: string 
  createdAt: string
  updatedAt: string
}

export interface WeeklyScheduleView {
  weekStart: string // 주의 시작일 (월요일)
  weekEnd: string // 주의 종료일 (일요일)
  teams: TeamSchedule[]
}

export interface TeamSchedule {
  teamId: string
  teamName: string
  members: MemberSchedule[]
}

export interface MemberSchedule {
  memberId: string
  memberName: string
  joinDate: string
  schedule: DailySchedule[]
}

export interface DailySchedule {
  date: string
  workTypeId: string
  workTypeName: string
  workTypeColor: string
  startTime?: string
  endTime?: string
  isEditable: boolean
  isChanged?: boolean // 편집 모드에서 변경된 항목 표시
}
