"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Clock, FileText, Plus, X, Eye } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabaseLeaveRequestStorage } from "@/lib/supabase-leave-request-storage"
import { supabaseAnnualLeaveStorageV2 } from "@/lib/supabase-annual-leave-storage-v2"
import { supabaseAnnualLeaveStorage } from "@/lib/supabase-annual-leave-storage"
import { supabase } from "@/lib/supabase"
import { LeaveRequestFormDialog } from "@/components/leave-request-form-dialog"
import { AnnualLeavePolicyViewDialog } from "@/components/annual-leave-policy-view-dialog"
import type { LeaveRequest } from "@/types/leave-request"
import type { AnnualLeaveBalance, AnnualLeavePolicy } from "@/types/annual-leave"

const leaveTypeColors = {
  "연차": "bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]",
  "오전반차": "bg-[#f5f3ff] text-[#7c3aed] border-[#e9d5ff]",
  "오후반차": "bg-[#fdf4ff] text-[#a855f7] border-[#f3e8ff]",
  "특별휴가": "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]",
  "병가": "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  "경조휴가": "bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]",
}

const getLeaveTypeColor = (leaveType: string) => {
  return leaveTypeColors[leaveType as keyof typeof leaveTypeColors] || "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]"
}

export default function LeaveRequestPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [balance, setBalance] = useState<AnnualLeaveBalance | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; is_admin?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [showPolicyDialog, setShowPolicyDialog] = useState(false)
  const [activePolicy, setActivePolicy] = useState<AnnualLeavePolicy | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // 현재 로그인한 사용자 정보 가져오기 (localStorage에서 가져온다고 가정)
      const userData = localStorage.getItem("currentUser")
      if (userData) {
        const user = JSON.parse(userData)
        
        // DB에서 관리자 권한 확인
        const { data: memberData } = await supabase
          .from("members")
          .select("is_admin")
          .eq("id", user.id)
          .single()
        
        const userWithAdmin = {
          ...user,
          is_admin: memberData?.is_admin || false
        }
        setCurrentUser(userWithAdmin)
        
        // 연차 신청 목록 조회
        const requests = await supabaseLeaveRequestStorage.getLeaveRequestsByMemberId(user.id)
        setLeaveRequests(requests)
        
        // 연차 잔액 조회 (V2 사용)
        const { totalGranted, totalUsed, totalExpired, currentBalance } = 
          await supabaseAnnualLeaveStorageV2.calculateBalance(user.id)
        
        // AnnualLeaveBalance 타입에 맞게 구성
        const userBalance: AnnualLeaveBalance = {
          id: user.id,
          member_id: user.id,
          member_name: user.name || "",
          team_name: "",
          join_date: "",
          total_granted: totalGranted,
          total_used: totalUsed,
          total_expired: totalExpired,
          current_balance: currentBalance,
          last_updated: new Date().toISOString(),
          created_at: "",
          updated_at: ""
        }
        setBalance(userBalance)
      }
      
      // 활성 연차 정책 조회
      const policy = await supabaseAnnualLeaveStorage.getActivePolicy()
      setActivePolicy(policy)
    } catch (error) {
      console.error("데이터 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestSubmit = async () => {
    await loadData()
    setShowRequestDialog(false)
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!currentUser) return
    
    if (!confirm("정말 이 연차 신청을 취소하시겠습니까?")) return
    
    try {
      const result = await supabaseLeaveRequestStorage.cancelLeaveRequest({
        request_id: requestId,
        cancelled_by: currentUser.name, // name 전달 (id가 아님)
      })
      
      // 근무표 미등록 알림이 있으면 표시
      if (result.message) {
        alert(result.message)
      }
      
      await loadData()
    } catch (error) {
      console.error("연차 취소 오류:", error)
      alert(error instanceof Error ? error.message : "연차 취소 중 오류가 발생했습니다.")
    }
  }

  const canCancelRequest = (request: LeaveRequest): boolean => {
    if (!currentUser) return false
    
    if (request.status !== "대기중" && request.status !== "승인됨") {
      return false
    }
    
    // 대기중 상태는 누구나 취소 가능
    if (request.status === "대기중") {
      return true
    }
    
    // 승인됨 상태는 관리자이거나, 본인이면서 시작일 이전인 경우만
    if (request.status === "승인됨") {
      // 관리자는 언제나 취소 가능
      if (currentUser.is_admin) {
        return true
      }
      
      // 본인은 시작일 이전까지만 취소 가능
      const startDate = new Date(request.start_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      return startDate > today
    }
    
    return false
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear().toString().slice(-2) // 마지막 2자리만
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}년 ${month}월 ${day}일`
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "yyyy년 M월 d일 HH:mm", { locale: ko })
  }

  const getFilteredRequests = (filter: string) => {
    if (filter === "all") return leaveRequests
    return leaveRequests.filter(req => req.status === filter)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">연차 신청</h1>
              </div>
            </div>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5e6ad2] mx-auto"></div>
            <p className="mt-2 text-[#718096]">로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">연차 신청</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Balance & Actions */}
          <div className="lg:col-span-1 space-y-4">

            {/* Balance Card - Responsive */}
            {balance && (
              <Card className="bg-gradient-to-br from-[#5e6ad2] to-[#8b7cf6] text-white border-0">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold mb-2">{balance.current_balance}일</div>
                  <div className="text-sm md:text-base opacity-90 mb-4 md:mb-6">사용 가능한 연차</div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-white/20">
                    <div className="text-center">
                      <div className="text-lg md:text-xl font-semibold">{balance.total_granted}</div>
                      <div className="text-xs md:text-sm opacity-80">부여</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg md:text-xl font-semibold">{balance.total_used}</div>
                      <div className="text-xs md:text-sm opacity-80">사용</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg md:text-xl font-semibold">{balance.total_expired}</div>
                      <div className="text-xs md:text-sm opacity-80">소멸</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons - Responsive */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
              <Button 
                onClick={() => setShowRequestDialog(true)} 
                className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white h-12 md:h-10 lg:h-12"
              >
                <Plus className="h-4 w-4 mr-2" />
                연차 신청
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPolicyDialog(true)}
                className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] h-12 md:h-10 lg:h-12"
              >
                <Eye className="h-4 w-4 mr-2" />
                정책 보기
              </Button>
            </div>

          </div>

          {/* Right Column: Request List */}
          <div className="lg:col-span-2 space-y-4">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-base md:text-lg font-medium text-[#0a0b0c]">신청 내역</h3>
              
              {/* Filter Controls - Mobile: Dropdown, Desktop: Buttons */}
              <div className="sm:hidden">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-sm bg-white border border-[#f3f4f6] rounded-lg px-3 py-2 text-[#718096]"
                >
                  <option value="all">전체 보기</option>
                  <option value="대기중">대기중</option>
                  <option value="승인됨">승인됨</option>
                  <option value="반려됨">반려됨</option>
                  <option value="취소됨">취소됨</option>
                </select>
              </div>
              
              <div className="hidden sm:flex gap-2">
                {["all", "대기중", "승인됨", "반려됨", "취소됨"].map((filter) => (
                  <Button
                    key={filter}
                    size="sm"
                    variant={statusFilter === filter ? "default" : "outline"}
                    onClick={() => setStatusFilter(filter)}
                    className={`text-xs h-8 ${
                      statusFilter === filter
                        ? "bg-[#5e6ad2] text-white hover:bg-[#4e5ac2]"
                        : "border-[#f3f4f6] text-[#718096] hover:bg-[#fafbfb]"
                    }`}
                  >
                    {filter === "all" ? "전체" : filter}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Request Cards - Responsive Layout */}
            <div className="space-y-3">
              {getFilteredRequests(statusFilter).map((request) => (
                <Card key={request.id} className="bg-[#fafbfb] border-[#f3f4f6] hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Main Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs border ${getLeaveTypeColor(request.leave_type)}`}>
                            {request.leave_type}
                          </Badge>
                          <span className="text-xs text-[#718096]">{request.total_days}일</span>
                        </div>
                        
                        <div>
                          <div className="text-sm md:text-base font-medium text-[#0a0b0c] mb-1">
                            {request.total_days > 1 
                              ? `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                              : formatDate(request.start_date)
                            }
                          </div>
                          <div className="text-xs md:text-sm text-[#718096]">
                            {request.reason || '-'}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status & Actions */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${
                          request.status === "대기중" ? "text-[#ea580c]" :
                          request.status === "승인됨" ? "text-[#16a34a]" :
                          request.status === "반려됨" ? "text-[#dc2626]" :
                          "text-[#64748b]"
                        }`}>
                          {request.status}
                        </span>
                        {canCancelRequest(request) && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleCancelRequest(request.id)}
                            className="text-[#718096] hover:bg-[#f8fafc] hover:text-[#4a5568] h-5 w-5 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {getFilteredRequests(statusFilter).length === 0 && (
                <div className="text-center py-8 md:py-12">
                  <div className="text-4xl md:text-5xl mb-3">📋</div>
                  <div className="text-sm md:text-base text-[#718096]">
                    {statusFilter === "all" ? "신청 내역이 없습니다." : `${statusFilter} 상태의 신청이 없습니다.`}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 연차 신청 다이얼로그 */}
        <LeaveRequestFormDialog
          open={showRequestDialog}
          onOpenChange={setShowRequestDialog}
          onSubmit={handleRequestSubmit}
          currentBalance={balance?.current_balance || 0}
          memberId={currentUser?.id || ""}
        />
        
        {/* 연차 정책 보기 다이얼로그 */}
        <AnnualLeavePolicyViewDialog
          open={showPolicyDialog}
          onOpenChange={setShowPolicyDialog}
          policy={activePolicy}
        />
      </div>
    </div>
  )
}