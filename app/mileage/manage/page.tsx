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
        .order("employee_number", { ascending: true })

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

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-64 mb-8"></div>
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="h-12 bg-gray-50 border-b border-gray-200"></div>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-16 bg-white border-b border-gray-100"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">근무 마일리지 관리</h1>
            </div>
          </div>
        </div>

        {/* 멤버별 마일리지 현황 */}
        <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#fafbfb] border-b border-[#f3f4f6]">
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    이름
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    사번
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    팀
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    <span className="hidden sm:inline">마일리지 잔액</span>
                    <span className="sm:hidden">잔액</span>
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f3f4f6]">
                {members.map((member) => (
                  <tr 
                    key={member.id} 
                    className="hover:bg-[#f7f8f9] transition-colors duration-100"
                  >
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-[#0a0b0c]">{member.name}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-[#4a5568]">{member.employee_number}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-[#4a5568]">{member.team_name || '팀 미지정'}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-semibold ${
                        member.balance >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'
                      }`}>
                        {member.balance < 0 ? '-' : '+'}
                        {formatMinutes(Math.abs(member.balance))}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#f3f4f6] text-[#5e6ad2] hover:bg-[#fafbfb] hover:text-[#4e5ac2] font-medium transition-colors duration-100"
                        onClick={() => handleMileageAdjust(member.id, member.name, member.balance)}
                      >
                        조정
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
    </div>
  )
}