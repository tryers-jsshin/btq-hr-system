"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Coins } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { supabaseWorkMileageStorage } from "@/lib/supabase-work-mileage-storage"
import { MileageAdjustDialog } from "@/components/mileage-adjust-dialog"

interface MemberMileage {
  id: string
  name: string
  team_name: string | null
  employee_number: string
  balance: number
}

export default function MileageManagePage() {
  const [members, setMembers] = useState<MemberMileage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null)
  const [selectedMemberBalance, setSelectedMemberBalance] = useState(0)
  const [showAdjustDialog, setShowAdjustDialog] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    initializeUser()
    loadMembersWithMileage()
  }, [])

  const initializeUser = async () => {
    const userData = localStorage.getItem("currentUser")
    if (userData) {
      const user = JSON.parse(userData)
      setCurrentUser(user)
    }
  }

  const loadMembersWithMileage = async () => {
    try {
      setLoading(true)

      // 모든 활성 멤버 조회
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("id, name, team_name, employee_number")
        .eq("status", "active")
        .order("name")

      if (membersError) throw membersError

      // 각 멤버의 마일리지 잔액 조회
      const membersWithBalance = await Promise.all(
        (membersData || []).map(async (member) => {
          const balance = await supabaseWorkMileageStorage.getMileageBalance(member.id)
          return {
            ...member,
            balance
          }
        })
      )

      setMembers(membersWithBalance)
    } catch (error) {
      console.error("Error loading members with mileage:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMileageAdjust = (memberId: string, memberName: string, currentBalance: number) => {
    setSelectedMember({ id: memberId, name: memberName })
    setSelectedMemberBalance(currentBalance)
    setShowAdjustDialog(true)
  }

  const handleAdjustComplete = () => {
    loadMembersWithMileage() // 데이터 새로고침
  }

  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0분"
    const hours = Math.floor(Math.abs(minutes) / 60)
    const mins = Math.abs(minutes) % 60
    
    if (hours === 0) return `${mins}분`
    if (mins === 0) return `${hours}시간`
    return `${hours}시간 ${mins}분`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">근무 마일리지</h1>

      {/* 멤버별 마일리지 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>멤버별 근무 마일리지 현황 ({members.length}명)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">데이터를 불러오는 중...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div key={member.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-lg">{member.name}</div>
                      <div className="text-sm text-gray-600">
                        {member.team_name || '팀 미지정'} · {member.employee_number}
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${
                      member.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {member.balance < 0 ? '-' : '+'}
                      {formatMinutes(Math.abs(member.balance))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleMileageAdjust(member.id, member.name, member.balance)}
                  >
                    <Coins className="h-4 w-4 mr-2" />
                    근무 마일리지 조정
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 근무 마일리지 조정 다이얼로그 */}
      {selectedMember && currentUser && (
        <MileageAdjustDialog
          open={showAdjustDialog}
          onOpenChange={setShowAdjustDialog}
          memberId={selectedMember.id}
          memberName={selectedMember.name}
          currentBalance={selectedMemberBalance}
          onComplete={handleAdjustComplete}
          adjustedBy={currentUser.id}
        />
      )}
    </div>
  )
}