"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Plus, Minus, Clock, RotateCcw } from "lucide-react"
import { supabaseAnnualLeaveStorage } from "@/lib/supabase-annual-leave-storage"
import type { AnnualLeaveBalance, AnnualLeaveTransaction } from "@/types/annual-leave"

interface AnnualLeaveHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: AnnualLeaveBalance | null
}

export function AnnualLeaveHistoryDialog({ open, onOpenChange, balance }: AnnualLeaveHistoryDialogProps) {
  const [transactions, setTransactions] = useState<AnnualLeaveTransaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && balance) {
      loadTransactions()
    }
  }, [open, balance])

  const loadTransactions = async () => {
    if (!balance) return

    try {
      setLoading(true)
      const data = await supabaseAnnualLeaveStorage.getTransactionsByMemberId(balance.member_id)
      setTransactions(data)
    } catch (error) {
      console.error("거래 내역 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!balance) return null

  const getTransactionIcon = (type: string, amount: number) => {
    switch (type) {
      case "grant":
        return <Plus className="h-4 w-4 text-green-600" />
      case "use":
        if (amount > 0) {
          // 양수인 경우: 취소로 인한 복구
          return <RotateCcw className="h-4 w-4 text-blue-600" />
        } else {
          // 음수인 경우: 실제 사용
          return <Minus className="h-4 w-4 text-orange-600" />
        }
      case "expire":
        return <Clock className="h-4 w-4 text-red-600" />
      case "adjust":
        return <RotateCcw className="h-4 w-4 text-blue-600" />
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionBadge = (type: string, amount: number) => {
    switch (type) {
      case "grant":
        return <Badge className="bg-green-100 text-green-800">+{amount}일 부여</Badge>
      case "use":
        if (amount > 0) {
          // 양수인 경우: 취소로 인한 복구
          return <Badge className="bg-blue-100 text-blue-800">+{amount}일 복구</Badge>
        } else {
          // 음수인 경우: 실제 사용
          return <Badge className="bg-orange-100 text-orange-800">-{Math.abs(amount)}일 사용</Badge>
        }
      case "expire":
        return <Badge className="bg-red-100 text-red-800">-{Math.abs(amount)}일 소멸</Badge>
      case "adjust":
        return (
          <Badge className="bg-blue-100 text-blue-800">{amount > 0 ? `+${amount}일 조정` : `${amount}일 조정`}</Badge>
        )
      default:
        return <Badge variant="secondary">{amount}일</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            {balance.member_name}님 연차 사용 내역
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 요약 정보 */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{balance.total_granted}</div>
                  <div className="text-sm text-gray-600">총 부여</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{balance.total_used}</div>
                  <div className="text-sm text-gray-600">총 사용</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{balance.total_expired}</div>
                  <div className="text-sm text-gray-600">총 소멸</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{balance.current_balance}</div>
                  <div className="text-sm text-gray-600">현재 잔액</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 거래 내역 */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">거래 내역</h3>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">거래 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((transaction) => (
                  <Card key={transaction.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.transaction_type, transaction.amount)}
                        <div>
                          <div className="font-medium text-sm">{transaction.reason}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleDateString("ko-KR")} • {transaction.created_by}
                          </div>
                          {transaction.grant_date && (
                            <div className="text-xs text-gray-500">
                              부여일: {new Date(transaction.grant_date).toLocaleDateString("ko-KR")}
                              {transaction.expire_date && (
                                <span>
                                  {" "}
                                  • 소멸 예정: {new Date(transaction.expire_date).toLocaleDateString("ko-KR")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>{getTransactionBadge(transaction.transaction_type, transaction.amount)}</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
