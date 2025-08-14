"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { supabaseAnnualLeaveStorageV2 } from "@/lib/supabase-annual-leave-storage-v2"
import type { AnnualLeaveBalance, AnnualLeaveTransaction } from "@/types/annual-leave"

interface AnnualLeaveHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: AnnualLeaveBalance | null
}

export function AnnualLeaveHistoryDialog({ open, onOpenChange, balance }: AnnualLeaveHistoryDialogProps) {
  const [transactions, setTransactions] = useState<AnnualLeaveTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [expandedView, setExpandedView] = useState(false)

  useEffect(() => {
    if (open && balance) {
      loadTransactions()
    }
  }, [open, balance])

  const loadTransactions = async () => {
    if (!balance) return

    try {
      setLoading(true)
      const data = await supabaseAnnualLeaveStorageV2.getAllTransactionsByMemberId(balance.member_id)
      setTransactions(data)
    } catch (error) {
      console.error("거래 내역 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!balance) return null

  // 필터링된 거래 내역
  const filteredTransactions = transactions.filter(t => {
    if (typeFilter !== "all") {
      if (typeFilter === "grant" && t.transaction_type !== "grant" && t.transaction_type !== "manual_grant") return false
      if (typeFilter === "use" && t.transaction_type !== "use") return false
      if (typeFilter === "expire" && t.transaction_type !== "expire") return false
      if (typeFilter === "adjust" && t.transaction_type !== "adjust") return false
    }
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100%-2rem)] sm:!w-full sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl bg-white border-[#f3f4f6]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="sr-only">
            {balance.member_name}님 연차 사용 내역
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 핵심 정보 영역 */}
          <div className="bg-[#fafbfb] px-4 py-3 border-b border-[#f3f4f6] shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0a0b0c]">{balance.member_name}님</h2>
                <p className="text-sm text-[#718096]">연차 사용 내역</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#5e6ad2]">{balance.current_balance}일</div>
                <p className="text-xs text-[#718096]">사용 가능</p>
              </div>
            </div>
          </div>

          {/* 요약 정보 바 */}
          <div className="bg-white px-4 py-3 border-b border-[#f3f4f6] shrink-0">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <span className="text-xs text-[#718096] block">부여</span>
                <span className="text-base font-semibold text-[#16a34a]">
                  {balance.total_granted > 0 ? '+' : ''}{balance.total_granted}
                </span>
              </div>
              <div className="w-px h-8 bg-[#f3f4f6]"></div>
              <div className="text-center">
                <span className="text-xs text-[#718096] block">사용</span>
                <span className="text-base font-semibold text-[#dc2626]">
                  {balance.total_used > 0 ? '-' : ''}{balance.total_used}
                </span>
              </div>
              <div className="w-px h-8 bg-[#f3f4f6]"></div>
              <div className="text-center">
                <span className="text-xs text-[#718096] block">소멸</span>
                <span className="text-base font-semibold text-[#ea580c]">
                  {balance.total_expired > 0 ? '-' : ''}{balance.total_expired}
                </span>
              </div>
            </div>
          </div>

          {/* 필터 영역 */}
          <div className="px-4 py-3 border-b border-[#f3f4f6] bg-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={typeFilter === "all" ? "default" : "outline"}
                  onClick={() => setTypeFilter("all")}
                  className={`h-7 px-3 text-xs ${
                    typeFilter === "all" 
                      ? "bg-[#5e6ad2] text-white hover:bg-[#4e5ac2]" 
                      : "border-[#f3f4f6] text-[#718096] hover:bg-[#fafbfb]"
                  }`}
                >
                  전체
                </Button>
                <Button
                  size="sm"
                  variant={typeFilter === "use" ? "default" : "outline"}
                  onClick={() => setTypeFilter("use")}
                  className={`h-7 px-3 text-xs ${
                    typeFilter === "use" 
                      ? "bg-[#dc2626] text-white hover:bg-[#b91c1c]" 
                      : "border-[#f3f4f6] text-[#718096] hover:bg-[#fafbfb]"
                  }`}
                >
                  사용내역
                </Button>
                <Button
                  size="sm"
                  variant={typeFilter === "grant" ? "default" : "outline"}
                  onClick={() => setTypeFilter("grant")}
                  className={`h-7 px-3 text-xs ${
                    typeFilter === "grant" 
                      ? "bg-[#16a34a] text-white hover:bg-[#15803d]" 
                      : "border-[#f3f4f6] text-[#718096] hover:bg-[#fafbfb]"
                  }`}
                >
                  부여내역
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpandedView(!expandedView)}
                className="h-7 px-2 text-xs text-[#718096] hover:text-[#0a0b0c]"
              >
                {expandedView ? "간단히" : "자세히"}
              </Button>
            </div>
          </div>

          {/* 거래 내역 */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#f3f4f6] border-t-[#5e6ad2] mx-auto mb-2"></div>
                  <p className="text-sm text-[#718096]">불러오는 중...</p>
                </div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f3f4f6] mb-3">
                    <Calendar className="h-6 w-6 text-[#718096]" />
                  </div>
                  <p className="text-sm text-[#718096]">
                    {typeFilter !== "all" ? "해당 조건의 거래가 없습니다" : "거래 내역이 없습니다"}
                  </p>
                  {typeFilter !== "all" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTypeFilter("all")}
                      className="mt-2 text-xs text-[#5e6ad2] hover:text-[#4e5ac2]"
                    >
                      전체 보기
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((transaction) => {
                  const isCancelled = transaction.status === "cancelled"
                  const isExpired = transaction.is_expired
                  const isPending = transaction.grant_date && new Date(transaction.grant_date) > new Date()
                  
                  const formatDate = (dateStr: string) => {
                    const date = new Date(dateStr)
                    const year = date.getFullYear()
                    const month = date.getMonth() + 1
                    const day = date.getDate()
                    return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
                  }
                  
                  const getTypeLabel = (type: string) => {
                    switch(type) {
                      case "grant": return "자동부여"
                      case "manual_grant": return "수동부여"
                      case "use": return "사용"
                      case "expire": return "소멸"
                      case "adjust": return "조정"
                      default: return "기타"
                    }
                  }
                  
                  const getTypeBadgeColor = (type: string) => {
                    if (isCancelled) return "bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]"
                    switch(type) {
                      case "grant":
                      case "manual_grant": 
                        return isExpired ? "bg-[#fef3c7] text-[#92400e] border-[#fbbf24]" : "bg-[#dcfce7] text-[#16a34a] border-[#bbf7d0]"
                      case "use": return "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]"
                      case "expire": return "bg-[#fed7aa]/30 text-[#ea580c] border-[#fed7aa]"
                      case "adjust": return "bg-[#f5f3ff] text-[#7c3aed] border-[#e9d5ff]"
                      default: return "bg-[#f3f4f6] text-[#4a5568] border-[#e2e8f0]"
                    }
                  }
                  
                  const getStatusText = () => {
                    if (isCancelled) return "취소됨"
                    if (isExpired) return "소멸됨"
                    if (isPending) return "예정"
                    return "완료"
                  }
                  
                  const getStatusColor = () => {
                    if (isCancelled) return "text-[#64748b]"
                    if (isExpired) return "text-[#ea580c]"
                    if (isPending) return "text-[#3b82f6]"
                    return "text-[#16a34a]"
                  }
                  
                  const isPositive = transaction.transaction_type === "grant" || transaction.transaction_type === "manual_grant" || 
                                    (transaction.transaction_type === "adjust" && transaction.amount > 0)
                  const amount = Math.abs(transaction.amount)
                  
                  // 간단/상세 보기 모드에 따른 렌더링
                  if (!expandedView) {
                    // 간단 보기
                    return (
                      <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-[#f3f4f6] last:border-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                            isCancelled ? "bg-[#f1f5f9]" :
                            isPositive ? "bg-[#dcfce7]" : "bg-[#fef2f2]"
                          }`}>
                            <span className={`text-sm font-semibold ${
                              isCancelled ? "text-[#94a3b8]" :
                              isPositive ? "text-[#16a34a]" : "text-[#dc2626]"
                            }`}>
                              {isPositive ? '+' : '-'}{amount}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isCancelled ? "text-[#94a3b8] line-through" : "text-[#0a0b0c]"
                            }`}>
                              {transaction.reason || getTypeLabel(transaction.transaction_type)}
                            </p>
                            <p className="text-xs text-[#718096]">
                              {formatDate(transaction.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <span className={`text-xs font-medium ${getStatusColor()}`}>
                            {getStatusText()}
                          </span>
                        </div>
                      </div>
                    )
                  }
                  
                  // 상세 보기
                  return (
                    <Card key={transaction.id} className="bg-white border-[#f3f4f6] hover:border-[#e2e8f0] transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`text-xs border ${getTypeBadgeColor(transaction.transaction_type)}`}>
                                {getTypeLabel(transaction.transaction_type)}
                              </Badge>
                              <span className={`text-sm font-semibold ${
                                isCancelled ? "text-[#94a3b8] line-through" :
                                isPositive ? "text-[#16a34a]" : "text-[#dc2626]"
                              }`}>
                                {isPositive ? '+' : '-'}{amount}일
                              </span>
                            </div>
                            
                            <div>
                              <div className={`text-sm font-medium mb-1 ${
                                isCancelled ? "text-[#94a3b8] line-through" : "text-[#0a0b0c]"
                              }`}>
                                {transaction.reason || '연차 처리'}
                              </div>
                              <div className="text-xs text-[#718096]">
                                {formatDate(transaction.created_at)} • {transaction.created_by}
                              </div>
                              
                              {transaction.expire_date && (transaction.transaction_type === "grant" || transaction.transaction_type === "manual_grant") && !isCancelled && !isExpired && (
                                <div className="text-xs text-[#ea580c] mt-1">
                                  {formatDate(transaction.expire_date)} 소멸 예정
                                </div>
                              )}
                              
                              {isCancelled && transaction.cancelled_at && (
                                <div className="text-xs text-[#64748b] mt-1">
                                  {formatDate(transaction.cancelled_at)} 취소 • {transaction.cancelled_by}
                                </div>
                              )}
                              
                              {isExpired && transaction.expired_at && (
                                <div className="text-xs text-[#ea580c] mt-1">
                                  {formatDate(transaction.expired_at)} 소멸됨
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className={`text-xs font-medium ${getStatusColor()}`}>
                              {getStatusText()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}