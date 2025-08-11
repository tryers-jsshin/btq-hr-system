"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Settings, Play, RefreshCw, Plus, AlertTriangle, Clock } from "lucide-react"
import { AnnualLeavePolicyFormDialog } from "@/components/annual-leave-policy-form-dialog"
import { AnnualLeaveBalanceCard } from "@/components/annual-leave-balance-card"
import { AnnualLeaveHistoryDialog } from "@/components/annual-leave-history-dialog"
import { AnnualLeaveAdjustDialog } from "@/components/annual-leave-adjust-dialog"
import { supabaseAnnualLeaveStorage } from "@/lib/supabase-annual-leave-storage"
import { runDailyAnnualLeaveUpdate } from "@/lib/annual-leave-policy"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import { supabase } from "@/lib/supabase"
import type { AnnualLeavePolicy, AnnualLeaveBalance } from "@/types/annual-leave"
import { useToast } from "@/hooks/use-toast"

export default function AnnualLeavePage() {
  const [policies, setPolicies] = useState<AnnualLeavePolicy[]>([])
  const [balances, setBalances] = useState<AnnualLeaveBalance[]>([])
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<AnnualLeavePolicy | null>(null)
  const [viewingBalance, setViewingBalance] = useState<AnnualLeaveBalance | null>(null)
  const [adjustingBalance, setAdjustingBalance] = useState<AnnualLeaveBalance | null>(null)
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("add")
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
      setBalances(balancesData)
      console.log(`총 ${balancesData.length}명의 구성원 연차 현황 로드됨`)
    } catch (error) {
      console.error("데이터 로드 실��:", error)
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

  // 구성원 잔액 수동 업데이트 함수
  const updateMemberBalance = async (memberId: string): Promise<void> => {
    console.log(`=== ${memberId} 잔액 수동 업데이트 시작 ===`)

    const transactions = await supabaseAnnualLeaveStorage.getTransactionsByMemberId(memberId)
    console.log(`거래 내역 ${transactions.length}건 조회됨`)

    const totalGranted = transactions
      .filter((t) => t.transaction_type === "grant")
      .reduce((sum, t) => sum + t.amount, 0)

    const totalUsed = transactions
      .filter((t) => t.transaction_type === "use")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalExpired = transactions
      .filter((t) => t.transaction_type === "expire")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalAdjusted = transactions
      .filter((t) => t.transaction_type === "adjust")
      .reduce((sum, t) => sum + t.amount, 0)

    const currentBalance = totalGranted - totalUsed - totalExpired + totalAdjusted

    console.log(`잔액 계산 결과:`)
    console.log(`- 총 부여: ${totalGranted}일`)
    console.log(`- 총 사용: ${totalUsed}일`)
    console.log(`- 총 소멸: ${totalExpired}일`)
    console.log(`- 총 조정: ${totalAdjusted}일`)
    console.log(`- 현재 잔액: ${currentBalance}일`)

    // 구성원 정보 조회
    const { data: member } = await supabase
      .from("members")
      .select("name, team_name, join_date")
      .eq("id", memberId)
      .single()

    if (member) {
      console.log(`구성원 정보: ${member.name} (${member.team_name})`)

      await supabaseAnnualLeaveStorage.upsertBalance({
        member_id: memberId,
        member_name: member.name,
        team_name: member.team_name || "",
        join_date: member.join_date,
        total_granted: totalGranted,
        total_used: totalUsed,
        total_expired: totalExpired,
        current_balance: currentBalance,
        last_updated: new Date().toISOString(),
      })

      console.log(`=== ${member.name} 잔액 업데이트 완료 ===`)
    } else {
      console.error(`구성원 정보를 찾을 수 없음: ${memberId}`)
    }
  }

  const handleAdjustBalance = async (data: {
    memberId: string
    memberName: string
    amount: number
    reason: string
  }) => {
    try {
      console.log("연차 조정 시작:", data)

      const currentUser = await supabaseAuthStorage.getCurrentUser()
      if (!currentUser) {
        toast({
          title: "오류",
          description: "사용자 정보를 확인할 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      // 거래 내역 생성
      await supabaseAnnualLeaveStorage.createTransaction({
        member_id: data.memberId,
        member_name: data.memberName,
        transaction_type: "adjust",
        amount: data.amount,
        reason: data.reason,
        created_by: currentUser.name,
      })

      console.log("거래 내역 생성 완료, 잔액 업데이트 시작")

      // 잔액 수동 업데이트
      await updateMemberBalance(data.memberId)

      // 데이터 새로고침
      await loadData()

      toast({
        title: "연차 조정 완료",
        description: `${data.memberName}님의 연차가 ${data.amount > 0 ? "추가" : "차감"}되었습니다.`,
      })

      console.log("연차 조정 완료")
    } catch (error) {
      console.error("연차 조정 실패:", error)
      toast({
        title: "조정 실패",
        description: "연차 조정에 실패했습니다.",
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
          <Button onClick={handleRunUpdate} disabled={updating}>
            {updating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            수동 업데이트
          </Button>
          <Button
            onClick={() => {
              setEditingPolicy(null)
              setPolicyDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            정책 추가
          </Button>
        </div>
      </div>

      {/* 활성 정책 표시 */}
      {activePolicy ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                현재 활성 정책: {activePolicy.policy_name}
              </div>
              <Badge className="bg-green-100 text-green-800">활성</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">첫 해 월별 부여</div>
                <div className="text-lg font-bold">{activePolicy.first_year_monthly_grant}일</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">기본 연차</div>
                <div className="text-lg font-bold">{activePolicy.base_annual_days}일</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">최대 연차</div>
                <div className="text-lg font-bold">{activePolicy.max_annual_days}일</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">소멸 기간</div>
                <div className="text-lg font-bold">{activePolicy.expire_after_months}개월</div>
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingPolicy(activePolicy)
                  setPolicyDialogOpen(true)
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                정책 수정
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>활성화된 연차 정책이 없습니다. 정책을 추가하고 활성화해주세요.</AlertDescription>
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
                    setAdjustDialogOpen(true)
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

      <AnnualLeaveHistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} balance={viewingBalance} />

      <AnnualLeaveAdjustDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        balance={adjustingBalance}
        adjustType={adjustType}
        onSave={handleAdjustBalance}
      />
    </div>
  )
}
