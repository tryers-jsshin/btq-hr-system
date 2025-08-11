export interface Member {
  id: string
  name: string
  password: string // 초기 비밀번호 (휴대폰 번호)
  employeeNumber: string // 사원번호
  teamId: string
  teamName: string
  role: "일반직원" | "관리자" // "직원"을 "일반직원"으로 변경
  joinDate: string
  phone: string
  weeklySchedule: {
    monday: string // 근무유형 ID 또는 "off"
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
    saturday: string
    sunday: string
  }
  createdAt: string
  updatedAt: string
}
