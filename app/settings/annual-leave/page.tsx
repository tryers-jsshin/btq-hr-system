"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Settings, Play, RefreshCw, AlertTriangle, Clock, Eye } from "lucide-react"
import { AnnualLeavePolicyFormDialog } from "@/components/annual-leave-policy-form-dialog"
import { AnnualLeavePolicyViewDialog } from "@/components/annual-leave-policy-view-dialog"
import { AnnualLeaveBalanceCard } from "@/components/annual-leave-balance-card"
import { AnnualLeaveHistoryDialog } from "@/components/annual-leave-history-dialog"
import { AnnualLeaveAdjustDialog } from "@/components/annual-leave-adjust-dialog"
import { AnnualLeaveGrantCancelDialog } from "@/components/annual-leave-grant-cancel-dialog"
import { supabaseAnnualLeaveStorage } from "@/lib/supabase-annual-leave-storage"
import { supabaseAnnualLeaveStorageV2 } from "@/lib/supabase-annual-leave-storage-v2"
import { runDailyAnnualLeaveUpdate } from "@/lib/annual-leave-policy"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import { supabase } from "@/lib/supabase"
import type { AnnualLeavePolicy, AnnualLeaveBalance } from "@/types/annual-leave"
import { useToast } from "@/hooks/use-toast"

export default function AnnualLeavePage() {
  const [policies, setPolicies] = useState<AnnualLeavePolicy[]>([])
  const [balances, setBalances] = useState<AnnualLeaveBalance[]>([])
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [policyViewDialogOpen, setPolicyViewDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [grantCancelDialogOpen, setGrantCancelDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<AnnualLeavePolicy | null>(null)
  const [viewingBalance, setViewingBalance] = useState<AnnualLeaveBalance | null>(null)
  const [adjustingBalance, setAdjustingBalance] = useState<AnnualLeaveBalance | null>(null)
  const [adjustType, setAdjustType] = useState<"grant" | "expire">("grant")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [policiesData, balancesData] = await Promise.all([
        supabaseAnnualLeaveStorage.getAllPolicies(),
        supabaseAnnualLeaveStorage.getAllActiveMemberBalances(), // 모든 활성 구성원 조회로 변경
      ])
      setPolicies(policiesData)
      
      // V2 시스템으로 각 구성원의 잔액 재계산
      const updatedBalances = await Promise.all(
        balancesData.map(async (balance) => {
          const { totalGranted, totalUsed, totalExpired, currentBalance } = 
            await supabaseAnnualLeaveStorageV2.calculateBalance(balance.member_id)
          
          return {
            ...balance,
            total_granted: totalGranted,
            total_used: totalUsed,
            total_expired: totalExpired,
            current_balance: currentBalance,
          }
        })
      )
      
      setBalances(updatedBalances)
      console.log(`총 ${updatedBalances.length}명의 구성원 연차 현황 로드됨 (V2 시스템)`)
    } catch (error) {
      console.error("데이터 로드 실패:", error)
      toast({
        title: "데이터 로드 실패",
        description: "연차 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSavePolicy = async (data: Omit<AnnualLeavePolicy, "id" | "created_at" | "updated_at">) => {
    try {
      if (editingPolicy) {
        await supabaseAnnualLeaveStorage.updatePolicy(editingPolicy.id, data)
        toast({
          title: "정책이 수정되었습니다",
          description: "연차 정책이 성공적으로 수정되었습니다.",
        })
      } else {
        await supabaseAnnualLeaveStorage.createPolicy(data)
        toast({
          title: "정책이 추가되었습니다",
          description: "새로운 연차 정책이 성공적으로 추가되었습니다.",
        })
      }
      await loadData()
    } catch (error) {
      console.error("정책 저장 실패:", error)
      toast({
        title: "정책 저장 실패",
        description: "연차 정책 저장에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleRunUpdate = async () => {
    try {
      setUpdating(true)

      // 오늘 날짜로 연차 업데이트 실행
      const today = new Date()
      const results = await runDailyAnnualLeaveUpdate(today)

      toast({
        title: "연차 업데이트 완료",
        description: `처리: ${results.processed}명, 부여: ${results.granted}일, 소멸: ${results.expired}일`,
      })

      if (results.errors.length > 0) {
        console.error("업데이트 오류:", results.errors)
        toast({
          title: "일부 오류 발생",
          description: `${results.errors.length}건의 오류가 발생했습니다. 콘솔을 확인해주세요.`,
          variant: "destructive",
        })
      }

      await loadData()
    } catch (error) {
      console.error("연차 업데이트 실패:", error)
      toast({
        title: "업데이트 실패",
        description: "연차 업데이트에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  // 구성원 잔액 수동 업데이트 함수 (V2 사용)
  const updateMemberBalance = async (memberId: string): Promise<void> => {
    console.log(`=== ${memberId} 잔액 수동 업데이트 시작 (V2) ===`)
    
    // V2 시스템으로 잔액 업데이트
    await supabaseAnnualLeaveStorageV2.updateMemberBalance(memberId)
    
    console.log(`=== 잔액 업데이트 완료 (V2) ===`)
  }

  const handleGrantCancel = async (data: {
    memberId: string
    memberName: string
    grants: {
      id: string
      amount: number
      grant_date: string
      expire_date?: string
    }[]
    reason: string
  }) => {
    try {
      console.log("부여 취소 처리 시작:", data)

      const currentUser = await supabaseAuthStorage.getCurrentUser()
      if (!currentUser) {
        toast({
          title: "오류",
          description: "사용자 정보를 확인할 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      const today = new Date().toISOString().split("T")[0]
      const totalAmount = data.grants.reduce((sum, g) => sum + g.amount, 0)
      
      // V2 스토리지 사용
      const { supabaseAnnualLeaveStorageV2 } = await import("@/lib/supabase-annual-leave-storage-v2")
      
      // 각 부여에 대한 처리
      for (const grant of data.grants) {
        // 부여에서 일부 사용이 있는지 확인
        const transactions = await supabaseAnnualLeaveStorageV2.getAllTransactionsByMemberId(data.memberId)
        const originalGrant = transactions.find(t => t.id === grant.id)
        
        if (!originalGrant) continue
        
        // 해당 부여의 사용량 계산
        const usages = transactions
          .filter(t => 
            t.reference_id === grant.id && 
            t.transaction_type === "use" &&
            (t.status === "active" || !t.status)
          )
        const usedAmount = usages.reduce((sum, t) => sum + Math.abs(t.amount), 0)
        
        // 부분 취소인지 전체 취소인지 판단
        if (grant.amount === originalGrant.amount && usedAmount === 0) {
          // 전체 취소 (사용 내역 없음)
          await supabaseAnnualLeaveStorageV2.cancelGrantTransaction(
            grant.id,
            currentUser.name
          )
        } else if (grant.amount < originalGrant.amount) {
          // 부분 취소 - 부여 분할 방식
          // 1. 원본 부여 취소
          await supabaseAnnualLeaveStorageV2.cancelTransaction(
            grant.id,
            currentUser.name
          )
          
          // 2. 새로운 부여 생성 (원본 - 취소량)
          const newGrantAmount = originalGrant.amount - grant.amount
          await supabaseAnnualLeaveStorageV2.createTransaction({
            member_id: data.memberId,
            member_name: data.memberName,
            transaction_type: originalGrant.transaction_type, // 원본과 동일한 타입
            amount: newGrantAmount,
            reason: `${originalGrant.reason} (부분 취소 후 재생성: ${newGrantAmount}일)`,
            grant_date: originalGrant.grant_date,
            expire_date: originalGrant.expire_date,
            created_by: currentUser.name,
          })
          
          // 3. 사용 내역들을 새 부여로 재연결
          const { data: newGrant, error: findError } = await supabase
            .from("annual_leave_transactions")
            .select("id")
            .eq("member_id", data.memberId)
            .eq("transaction_type", originalGrant.transaction_type)
            .eq("amount", newGrantAmount)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .single()
          
          if (findError) {
            console.error("새 부여 조회 실패:", findError)
          } else if (newGrant) {
            // 기존 사용 내역들의 reference_id를 새 부여로 업데이트
            for (const usage of usages) {
              const { error: updateError } = await supabase
                .from("annual_leave_transactions")
                .update({ reference_id: newGrant.id })
                .eq("id", usage.id)
              
              if (updateError) {
                console.error(`사용 내역 ${usage.id} 업데이트 실패:`, updateError)
              }
            }
            console.log(`${usages.length}개 사용 내역을 새 부여로 재연결 완료`)
          }
        }
      }

      console.log("부여 취소 거래 생성 완료, 잔액 업데이트 시작")

      // 잔액 수동 업데이트 (V2 사용)
      await supabaseAnnualLeaveStorageV2.updateMemberBalance(data.memberId)

      // 데이터 새로고침
      await loadData()

      toast({
        title: "연차 부여 취소 완료",
        description: `${data.memberName}님의 연차 ${totalAmount}일이 취소되었습니다.`,
      })

      // 다이얼로그 닫기
      setGrantCancelDialogOpen(false)

      console.log("부여 취소 처리 완료")
    } catch (error) {
      console.error("부여 취소 처리 실패:", error)
      toast({
        title: "처리 실패",
        description: "부여 취소 처리에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleAdjustBalance = async (data: {
    memberId: string
    memberName: string
    amount: number
    reason: string
    expireDays?: number
  }) => {
    try {
      console.log("연차 처리 시작:", data)

      const currentUser = await supabaseAuthStorage.getCurrentUser()
      if (!currentUser) {
        toast({
          title: "오류",
          description: "사용자 정보를 확인할 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      const isGrant = data.amount > 0
      const today = new Date().toISOString().split("T")[0]
      
      // V2 시스템으로 거래 내역 생성
      if (isGrant) {
        // 수동 부여의 경우 grant_date와 expire_date 설정
        const expireDate = new Date()
        expireDate.setDate(expireDate.getDate() + (data.expireDays || 365))
        
        await supabaseAnnualLeaveStorageV2.createTransaction({
          member_id: data.memberId,
          member_name: data.memberName,
          transaction_type: "manual_grant",
          amount: data.amount,
          reason: data.reason,
          grant_date: today,
          expire_date: expireDate.toISOString().split("T")[0],
          created_by: currentUser.name,
        })
      } else {
        // 차감은 부여 취소 다이얼로그로 처리하므로 여기서는 처리하지 않음
        console.log("차감은 부여 취소 다이얼로그를 사용하세요")
      }

      console.log("거래 내역 생성 완료, 잔액 업데이트 시작")

      // 잔액 수동 업데이트
      await updateMemberBalance(data.memberId)

      // 데이터 새로고침
      await loadData()

      toast({
        title: isGrant ? "연차 부여 완료" : "연차 차감 완료",
        description: `${data.memberName}님의 연차 ${Math.abs(data.amount)}일이 ${isGrant ? "부여" : "차감"}되었습니다.`,
      })

      console.log("연차 처리 완료")
    } catch (error) {
      console.error("연차 처리 실패:", error)
      toast({
        title: "처리 실패",
        description: "연차 처리에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const activePolicy = policies.find((p) => p.is_active)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">연차 관리</h1>
            <p className="text-gray-600">연차 정책 및 구성원별 연차 현황을 관리합니다</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-6 w-6 mr-2" />
            연차 관리
          </h1>
          <p className="text-gray-600">연차 정책 및 구성원별 연차 현황을 관리합니다</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPolicyViewDialogOpen(true)}
            disabled={!activePolicy}
          >
            <Eye className="h-4 w-4 mr-2" />
            연차 정책 보기
          </Button>
          <Button onClick={handleRunUpdate} disabled={updating}>
            {updating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            수동 업데이트
          </Button>
        </div>
      </div>

      {/* 활성 정책이 없을 때만 경고 표시 */}
      {!activePolicy && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>활성화된 연차 정책이 없습니다.</AlertDescription>
        </Alert>
      )}

      {/* 구성원별 연차 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>구성원별 연차 현황 ({balances.length}명)</CardTitle>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">활성 구성원이 없습니다.</p>
              <p className="text-sm text-gray-400">구성원을 추가한 후 다시 확인해주세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {balances.map((balance) => (
                <AnnualLeaveBalanceCard
                  key={balance.member_id}
                  balance={balance}
                  onViewHistory={(balance) => {
                    setViewingBalance(balance)
                    setHistoryDialogOpen(true)
                  }}
                  onAdjust={(balance, type) => {
                    setAdjustingBalance(balance)
                    setAdjustType(type)
                    if (type === "expire") {
                      // 차감의 경우 부여 취소 다이얼로그 사용
                      setGrantCancelDialogOpen(true)
                    } else {
                      // 부여의 경우 기존 다이얼로그 사용
                      setAdjustDialogOpen(true)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 다이얼로그들 */}
      <AnnualLeavePolicyFormDialog
        open={policyDialogOpen}
        onOpenChange={setPolicyDialogOpen}
        policy={editingPolicy}
        onSave={handleSavePolicy}
      />

      <AnnualLeavePolicyViewDialog
        open={policyViewDialogOpen}
        onOpenChange={setPolicyViewDialogOpen}
        policy={activePolicy || null}
      />

      <AnnualLeaveHistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} balance={viewingBalance} />

      <AnnualLeaveAdjustDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        balance={adjustingBalance}
        adjustType={adjustType}
        onSave={handleAdjustBalance}
      />

      <AnnualLeaveGrantCancelDialog
        open={grantCancelDialogOpen}
        onOpenChange={setGrantCancelDialogOpen}
        balance={adjustingBalance}
        onSave={handleGrantCancel}
      />
    </div>
  )
}
