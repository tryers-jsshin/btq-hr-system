"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, RefreshCw, AlertTriangle, Clock, Eye } from "lucide-react"
import { AnnualLeavePolicyFormDialog } from "@/components/annual-leave-policy-form-dialog"
import { AnnualLeavePolicyViewDialog } from "@/components/annual-leave-policy-view-dialog"
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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">연차 관리</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            <p className="text-[#718096]">로딩 중...</p>
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
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">연차 관리</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPolicyViewDialogOpen(true)}
                disabled={!activePolicy}
                className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb]"
              >
                <Eye className="h-4 w-4 mr-2" />
                연차 정책 보기
              </Button>
              <Button onClick={handleRunUpdate} disabled={updating} className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white">
                {updating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                수동 업데이트
              </Button>
            </div>
          </div>
        </div>

        {/* 활성 정책이 없을 때만 경고 표시 */}
        {!activePolicy && (
          <Alert className="mb-6 bg-[#fef3c7] border-[#fbbf24]">
            <AlertTriangle className="h-4 w-4 text-[#d97706]" />
            <AlertDescription className="text-[#92400e]">활성화된 연차 정책이 없습니다.</AlertDescription>
          </Alert>
        )}

        {/* 구성원별 연차 현황 - 테이블 뷰 */}
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
                    잔여
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    부여
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    사용
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    소멸
                  </th>
                  <th className="text-center px-3 sm:px-6 py-3 text-xs font-semibold text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f3f4f6]">
                {balances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Clock className="h-12 w-12 text-[#718096] mx-auto mb-4" />
                      <p className="text-[#4a5568] mb-2">활성 구성원이 없습니다.</p>
                      <p className="text-sm text-[#718096]">구성원을 추가한 후 다시 확인해주세요.</p>
                    </td>
                  </tr>
                ) : (
                  balances.map((balance) => (
                    <tr key={balance.member_id} className="hover:bg-[#f7f8f9] transition-colors duration-100">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-[#0a0b0c]">{balance.member_name}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-[#4a5568]">{balance.employee_number || '-'}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-[#4a5568]">{balance.team_name || '팀 미지정'}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-[#5e6ad2]">{balance.current_balance}일</span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-[#4a5568]">{balance.total_granted}일</span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-[#4a5568]">{balance.total_used}일</span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-[#4a5568]">{balance.total_expired}일</span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setViewingBalance(balance)
                              setHistoryDialogOpen(true)
                            }}
                            className="h-8 px-2 text-[#4a5568] hover:text-[#0a0b0c] hover:bg-[#fafbfb]"
                          >
                            내역
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAdjustingBalance(balance)
                              setAdjustType("grant")
                              setAdjustDialogOpen(true)
                            }}
                            className="h-8 px-2 text-[#16a34a] hover:text-[#15803d] hover:bg-[#f0fdf4]"
                          >
                            부여
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAdjustingBalance(balance)
                              setAdjustType("expire")
                              setGrantCancelDialogOpen(true)
                            }}
                            className="h-8 px-2 text-[#dc2626] hover:text-[#b91c1c] hover:bg-[#fef2f2]"
                          >
                            차감
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
    </div>
  )
}
