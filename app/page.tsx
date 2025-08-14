"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setIsLoading(true)
      // 현재 사용자 정보만 가져오기
      const user = await supabaseAuthStorage.getCurrentUser()
      setCurrentUser(user)
    } catch (error) {
      console.error("사용자 정보 로드 실패:", error)
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
