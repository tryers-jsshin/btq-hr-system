"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Users, UserCheck, UserX, Calendar, Clock, TrendingUp, Building2, PlaneTakeoff } from "lucide-react"
import { supabaseMemberStorage } from "@/lib/supabase-member-storage"
import { supabaseTeamStorage } from "@/lib/supabase-team-storage"
import { supabaseLeaveRequestStorage } from "@/lib/supabase-leave-request-storage"
import { supabaseWorkScheduleStorage } from "@/lib/supabase-work-schedule-storage"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { ko } from "date-fns/locale"

interface DashboardStats {
  totalMembers: number
  activeMembers: number
  terminatedMembers: number
  totalTeams: number
  pendingLeaves: number
  todayWorkSchedule: {
    working: number
    leave: number
    holiday: number
  }
  monthlyLeaves: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    terminatedMembers: 0,
    totalTeams: 0,
    pendingLeaves: 0,
    todayWorkSchedule: {
      working: 0,
      leave: 0,
      holiday: 0
    },
    monthlyLeaves: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // 현재 사용자 정보 가져오기
      const user = await supabaseAuthStorage.getCurrentUser()
      setCurrentUser(user)

      // 구성원 통계
      const allMembers = await supabaseMemberStorage.getMembers()
      const activeMembers = allMembers.filter(m => m.status === 'active')
      const terminatedMembers = allMembers.filter(m => m.status === 'terminated')

      // 팀 통계
      const teams = await supabaseTeamStorage.getTeams()

      // 연차 신청 통계 (관리자만)
      let pendingLeaves = 0
      let monthlyLeaves = 0
      
      if (user?.role === '관리자') {
        const leaveRequests = await supabaseLeaveRequestStorage.getAllLeaveRequests()
        pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length
        
        // 이번 달 승인된 연차
        const monthStart = startOfMonth(new Date())
        const monthEnd = endOfMonth(new Date())
        monthlyLeaves = leaveRequests.filter(l => 
          l.status === 'approved' &&
          new Date(l.start_date) >= monthStart &&
          new Date(l.start_date) <= monthEnd
        ).length
      }

      // 오늘의 근무표
      const today = format(new Date(), 'yyyy-MM-dd')
      const todaySchedules = await supabaseWorkScheduleStorage.getWorkScheduleByDate(today)
      
      let working = 0
      let leave = 0
      let holiday = 0

      todaySchedules.forEach(schedule => {
        if (schedule.work_type?.is_leave) {
          leave++
        } else if (schedule.work_type?.is_holiday) {
          holiday++
        } else {
          working++
        }
      })

      setStats({
        totalMembers: allMembers.length,
        activeMembers: activeMembers.length,
        terminatedMembers: terminatedMembers.length,
        totalTeams: teams.length,
        pendingLeaves,
        todayWorkSchedule: {
          working,
          leave,
          holiday
        },
        monthlyLeaves
      })
    } catch (error) {
      console.error("대시보드 데이터 로드 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const today = format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })

  // 시간대별 인사말 설정
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      return "좋은 아침입니다"
    } else if (hour >= 12 && hour < 18) {
      return "좋은 오후입니다"
    } else {
      return "좋은 저녁입니다"
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0a0b0c]">대시보드</h1>
          <p className="text-sm text-[#718096] mt-1">{today}</p>
        </div>

        {/* 환영 메시지 */}
        <Card className="mb-6 p-6 bg-gradient-to-r from-[#5e6ad2] to-[#8b7cf6] text-white border-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-1">
                {getGreeting()}, 
              </h2>
              <h2 className="text-xl font-semibold mb-2">
                {currentUser?.name || '사용자'}님! 👋
              </h2>
              {currentUser?.role !== '관리자' && (
                <p className="text-white/90">
                  {currentUser?.team_name || '팀 미지정'}
                </p>
              )}
            </div>
            <div className="hidden sm:block">
              <Clock className="h-12 w-12 text-white/20" />
            </div>
          </div>
        </Card>

      </div>
    </div>
  )
}
