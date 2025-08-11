"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Clock, FileText, Plus, X } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { supabaseLeaveRequestStorage } from "@/lib/supabase-leave-request-storage"
import { supabaseAnnualLeaveStorage } from "@/lib/supabase-annual-leave-storage"
import { supabase } from "@/lib/supabase"
import { LeaveRequestFormDialog } from "@/components/leave-request-form-dialog"
import type { LeaveRequest } from "@/types/leave-request"
import type { AnnualLeaveBalance } from "@/types/annual-leave"

const statusColors = {
  "대기중": "bg-yellow-100 text-yellow-800",
  "승인됨": "bg-green-100 text-green-800",
  "반려됨": "bg-red-100 text-red-800",
  "취소됨": "bg-gray-100 text-gray-800",
}

const leaveTypeColors = {
  "연차": "bg-blue-100 text-blue-800",
  "오전반차": "bg-purple-100 text-purple-800",
  "오후반차": "bg-indigo-100 text-indigo-800",
}

export default function LeaveRequestPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [balance, setBalance] = useState<AnnualLeaveBalance | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRequestDialog, setShowRequestDialog] = useState(false)

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
        setCurrentUser(user)
        
        // 연차 신청 목록 조회
        const requests = await supabaseLeaveRequestStorage.getLeaveRequestsByMemberId(user.id)
        setLeaveRequests(requests)
        
        // 연차 잔액 조회
        const userBalance = await supabaseAnnualLeaveStorage.getBalanceByMemberId(user.id)
        setBalance(userBalance)
      }
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
    
    try {
      await supabaseLeaveRequestStorage.cancelLeaveRequest({
        request_id: requestId,
        cancelled_by: currentUser.id,
      })
      await loadData()
    } catch (error) {
      console.error("연차 취소 오류:", error)
      alert("연차 취소 중 오류가 발생했습니다.")
    }
  }

  const canCancelRequest = (request: LeaveRequest): boolean => {
    if (request.status !== "대기중" && request.status !== "승인됨") {
      return false
    }
    
    const startDate = new Date(request.start_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return startDate > today
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "yyyy년 M월 d일", { locale: ko })
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "yyyy년 M월 d일 HH:mm", { locale: ko })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">연차 신청</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">연차 신청</h1>
        <Button onClick={() => setShowRequestDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          연차 신청
        </Button>
      </div>

      {/* 연차 잔액 카드 */}
      {balance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              연차 잔액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{balance.current_balance}</div>
                <div className="text-sm text-gray-600">잔여 연차</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{balance.total_granted}</div>
                <div className="text-sm text-gray-600">총 부여</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{balance.total_used}</div>
                <div className="text-sm text-gray-600">사용</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{balance.total_expired}</div>
                <div className="text-sm text-gray-600">소멸</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 연차 신청 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            연차 신청 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="대기중">대기중</TabsTrigger>
              <TabsTrigger value="승인됨">승인됨</TabsTrigger>
              <TabsTrigger value="반려됨">반려됨</TabsTrigger>
              <TabsTrigger value="취소됨">취소됨</TabsTrigger>
            </TabsList>

            {["all", "대기중", "승인됨", "반려됨", "취소됨"].map((status) => (
              <TabsContent key={status} value={status} className="space-y-4">
                {leaveRequests
                  .filter((request) => status === "all" || request.status === status)
                  .map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className={leaveTypeColors[request.leave_type]}>
                                {request.leave_type}
                              </Badge>
                              <Badge className={statusColors[request.status]}>
                                {request.status}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                {request.total_days}일
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <CalendarDays className="h-4 w-4" />
                                <span>
                                  {request.start_date === request.end_date
                                    ? formatDate(request.start_date)
                                    : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`
                                  }
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4" />
                                <span>신청일: {formatDateTime(request.requested_at)}</span>
                              </div>
                              
                              {request.reason && (
                                <div className="text-sm text-gray-600">
                                  사유: {request.reason}
                                </div>
                              )}
                              
                              {request.status === "승인됨" && request.approved_at && (
                                <div className="text-sm text-green-600">
                                  승인일: {formatDateTime(request.approved_at)}
                                </div>
                              )}
                              
                              {request.status === "반려됨" && request.rejected_reason && (
                                <div className="text-sm text-red-600">
                                  반려 사유: {request.rejected_reason}
                                </div>
                              )}
                              
                              {request.status === "취소됨" && request.cancelled_at && (
                                <div className="text-sm text-gray-600">
                                  취소일: {formatDateTime(request.cancelled_at)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {canCancelRequest(request) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelRequest(request.id)}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                              취소
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                
                {leaveRequests.filter((request) => status === "all" || request.status === status).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {status === "all" ? "연차 신청 내역이 없습니다." : `${status} 상태의 신청이 없습니다.`}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 연차 신청 다이얼로그 */}
      <LeaveRequestFormDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        onSubmit={handleRequestSubmit}
        currentBalance={balance?.current_balance || 0}
        memberId={currentUser?.id || ""}
      />
    </div>
  )
}