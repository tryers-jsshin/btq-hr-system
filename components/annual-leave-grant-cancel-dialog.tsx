"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Calendar, CheckCircle } from "lucide-react"
import type { AnnualLeaveBalance, AnnualLeaveTransaction } from "@/types/annual-leave"
import { supabaseAnnualLeaveStorageV2 } from "@/lib/supabase-annual-leave-storage-v2"

interface GrantWithUsage extends AnnualLeaveTransaction {
  usedAmount?: number
  cancelAmount?: number  // 취소할 일수
}

interface AnnualLeaveGrantCancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: AnnualLeaveBalance | null
  onSave: (data: {
    memberId: string
    memberName: string
    grants: {
      id: string
      amount: number
      grant_date: string
      expire_date?: string
    }[]
    reason: string
  }) => void
}

export function AnnualLeaveGrantCancelDialog({
  open,
  onOpenChange,
  balance,
  onSave,
}: AnnualLeaveGrantCancelDialogProps) {
  const [grants, setGrants] = useState<GrantWithUsage[]>([])
  const [selectedGrants, setSelectedGrants] = useState<Set<string>>(new Set())
  const [cancelAmounts, setCancelAmounts] = useState<{ [key: string]: number }>({})
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (open && balance) {
      loadGrants()
      setSelectedGrants(new Set())
      setCancelAmounts({})
      setReason("")
      setErrors({})
    }
  }, [open, balance])

  const loadGrants = async () => {
    if (!balance) return
    
    setLoading(true)
    try {
      const transactions = await supabaseAnnualLeaveStorageV2.getAllTransactionsByMemberId(balance.member_id)
      
      // 활성 부여 트랜잭션만 필터링 (status가 active이거나 null)
      const grantTransactions = transactions.filter(
        t => (t.transaction_type === "grant" || t.transaction_type === "manual_grant") 
          && t.amount > 0
          && t.expire_date
          && (t.status === "active" || !t.status)
      )
      
      // 만료되지 않은 부여만 필터링
      const today = new Date().toISOString().split("T")[0]
      const activeGrants = grantTransactions.filter(t => {
        if (!t.expire_date) return false
        return t.expire_date >= today
      })
      
      // 각 부여의 사용량 계산 (활성 사용 내역만)
      const grantsWithUsage = activeGrants.map(grant => {
        const relatedUsages = transactions.filter(t => 
          t.reference_id === grant.id && 
          t.transaction_type === "use" &&
          (t.status === "active" || !t.status)
        )
        
        // 사용량 계산 (음수만 있어야 함)
        const usedAmount = relatedUsages.reduce((sum, t) => {
          return sum + Math.abs(t.amount)
        }, 0)
        
        return {
          ...grant,
          usedAmount
        }
      })
      
      // 최신순으로 정렬
      grantsWithUsage.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      setGrants(grantsWithUsage)
    } catch (error) {
      console.error("부여 내역 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAmountChange = (grantId: string, value: string) => {
    const grant = grants.find(g => g.id === grantId)
    if (!grant) return
    
    const numValue = parseInt(value) || 0
    const maxCancelable = grant.amount - (grant.usedAmount || 0)
    
    // 취소 가능한 최대값으로 제한
    const finalValue = Math.min(Math.max(0, numValue), maxCancelable)
    
    if (finalValue > 0) {
      setCancelAmounts({ ...cancelAmounts, [grantId]: finalValue })
      setSelectedGrants(new Set([...selectedGrants, grantId]))
    } else {
      const newAmounts = { ...cancelAmounts }
      delete newAmounts[grantId]
      setCancelAmounts(newAmounts)
      
      const newSelected = new Set(selectedGrants)
      newSelected.delete(grantId)
      setSelectedGrants(newSelected)
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (selectedGrants.size === 0) {
      newErrors.grants = "취소할 부여를 선택해주세요"
    }

    if (!reason.trim()) {
      newErrors.reason = "취소 사유를 입력해주세요"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !balance) return

    const selectedGrantData = grants
      .filter(g => selectedGrants.has(g.id))
      .map(g => ({
        id: g.id,
        amount: cancelAmounts[g.id] || g.amount,  // 부분 취소 금액 사용
        grant_date: g.grant_date || "",
        expire_date: g.expire_date
      }))

    onSave({
      memberId: balance.member_id,
      memberName: balance.member_name,
      grants: selectedGrantData,
      reason: reason,
    })

    onOpenChange(false)
  }

  if (!balance) return null

  const totalToCancel = Object.entries(cancelAmounts)
    .reduce((sum, [_, amount]) => sum + amount, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            {balance.member_name}님 연차 부여 취소
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 현재 잔액 표시 */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">현재 연차 잔액</div>
            <div className="text-2xl font-bold text-gray-900">{balance.current_balance}일</div>
          </div>

          {/* 부여 내역 선택 */}
          <div className="space-y-2">
            <Label>취소할 연차 일수 입력</Label>
            {loading ? (
              <div className="text-center py-4 text-gray-500">로딩 중...</div>
            ) : grants.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                취소 가능한 부여 내역이 없습니다
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {grants.map((grant) => {
                  const usedAmount = grant.usedAmount || 0
                  const maxCancelable = grant.amount - usedAmount
                  const cancelAmount = cancelAmounts[grant.id] || 0
                  
                  return (
                    <div
                      key={grant.id}
                      className={`flex items-start space-x-3 p-3 rounded border ${
                        cancelAmount > 0
                          ? "bg-blue-50 border-blue-300" 
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-center min-w-[80px]">
                        <Input
                          type="number"
                          min="0"
                          max={maxCancelable}
                          value={cancelAmount || ""}
                          onChange={(e) => handleCancelAmountChange(grant.id, e.target.value)}
                          placeholder="0"
                          className="w-20 text-center"
                          disabled={maxCancelable === 0}
                        />
                        <span className="ml-1 text-sm text-gray-600">일</span>
                      </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          총 {grant.amount}일 부여
                        </span>
                        <span className="text-xs text-gray-500">
                          {grant.transaction_type === "manual_grant" ? "수동 부여" : "시스템 부여"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        부여일: {grant.grant_date ? new Date(grant.grant_date).toLocaleDateString("ko-KR") : "-"}
                        {grant.expire_date && (
                          <span className="ml-2">
                            → 소멸예정: {new Date(grant.expire_date).toLocaleDateString("ko-KR")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{grant.reason}</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-sm">
                          {usedAmount > 0 && (
                            <span className="text-orange-600">
                              사용: {usedAmount}일
                            </span>
                          )}
                          {usedAmount > 0 && maxCancelable > 0 && (
                            <span className="text-gray-400 mx-1">•</span>
                          )}
                          {maxCancelable > 0 ? (
                            <span className="text-green-600">
                              취소 가능: {maxCancelable}일
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              취소 불가 (전액 사용됨)
                            </span>
                          )}
                        </div>
                        {cancelAmount > 0 && (
                          <span className="text-sm font-medium text-blue-600">
                            취소 예정: {cancelAmount}일
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
            {errors.grants && <p className="text-sm text-red-500">{errors.grants}</p>}
          </div>

          {/* 취소 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason">취소 사유</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="부여 취소 사유를 입력하세요"
              className={errors.reason ? "border-red-500" : ""}
              rows={3}
            />
            {errors.reason && <p className="text-sm text-red-500">{errors.reason}</p>}
          </div>

          {/* 결과 미리보기 */}
          {totalToCancel > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-700 space-y-1">
                <div>
                  <strong>취소할 연차:</strong> {totalToCancel}일
                </div>
                <div>
                  <strong>처리 후 잔액:</strong> {balance.current_balance - totalToCancel}일
                </div>
              </div>
            </div>
          )}

          {/* 경고 메시지 */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              선택한 부여를 취소하면 되돌릴 수 없습니다. 신중하게 진행해주세요.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={grants.length === 0 || selectedGrants.size === 0}
            >
              부여 취소
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}