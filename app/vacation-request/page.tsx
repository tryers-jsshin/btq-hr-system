"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react"
import { supabaseVacationStorage } from "@/lib/supabase-vacation-storage"
import { supabaseAuthStorage } from "@/lib/supabase-auth-storage"
import type { Database } from "@/types/database"
import { useToast } from "@/hooks/use-toast"

type VacationRequest = Database["public"]["Tables"]["vacation_requests"]["Row"]
type VacationAllowance = Database["public"]["Tables"]["vacation_allowances"]["Row"]
type Member = Database["public"]["Tables"]["members"]["Row"]

export default function VacationRequestPage() {
  const [requests, setRequests] = useState<VacationRequest[]>([])
  const [currentUser, setCurrentUser] = useState<Member | null>(null)
  const [allocatedDays, setAllocatedDays] = useState(0)
  const [usedDays, setUsedDays] = useState(0)
  const [remainingDays, setRemainingDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: "annual",
    startDate: "",
    endDate: "",
    reason: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const user = await supabaseAuthStorage.getCurrentUser()
      if (!user) {
        toast({
          title: "로그인이 필요합니다",
          description: "로그인 후 이용해주세요.",
          variant: "destructive",
        })
        return
      }

      setCurrentUser(user)

      // 현재 연도의 휴가 부여 내역 조회
      const currentYear = new Date().getFullYear()
      const allowances = await supabaseVacationStorage.getVacationAllowancesByYear(currentYear)
      const userAllowance = allowances.find((a) => a.member_id === user.id)

      if (userAllowance) {
        setAllocatedDays(userAllowance.total_days)
        setUsedDays(userAllowance.used_days)
        setRemainingDays(userAllowance.remaining_days)
      }

      // 사용자의 휴가 신청 내역 조회 (본인 것만)
      const userRequests = await supabaseVacationStorage.getVacationRequestsByMember(user.id, false)
      setRequests(userRequests)
    } catch (error) {
      console.error("사용자 데이터 로드 실패:", error)
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!currentUser) return

    try {
      if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
        toast({
          title: "입력 오류",
          description: "모든 필드를 입력해주세요.",
          variant: "destructive",
        })
        return
      }

      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        toast({
          title: "날짜 오류",
          description: "시작일은 종료일보다 이전이어야 합니다.",
          variant: "destructive",
        })
        return
      }

      // 과거 날짜 체크 제거
      // const today = new Date()
      // today.setHours(0, 0, 0, 0)
      // if (new Date(formData.startDate) < today) {
      //   toast({
      //     title: "날짜 오류",
      //     description: "과거 날짜로는 휴가를 신청할 수 없습니다.",
      //     variant: "destructive",
      //   })
      //   return
      // }

      // 휴가 일수 계산
      const days = await supabaseVacationStorage.calculateVacationDays(
        currentUser.id,
        formData.startDate,
        formData.endDate,
        formData.type as "annual" | "morning_half" | "afternoon_half",
      )

      // 잔여 연차 확인
      if (days > remainingDays) {
        toast({
          title: "연차 부족",
          description: `잔여 연차가 부족합니다. (필요: ${days}일, 잔여: ${remainingDays}일)`,
          variant: "destructive",
        })
        return
      }

      const requestData = {
        member_id: currentUser.id,
        member_name: currentUser.name,
        team_name: currentUser.team_name || "",
        type: formData.type,
        start_date: formData.startDate,
        end_date: formData.endDate,
        days,
        reason: formData.reason.trim(),
        status: "pending" as const,
      }

      await supabaseVacationStorage.addVacationRequest(requestData)

      toast({
        title: "휴가 신청이 완료되었습니다",
        description: "관리자 승인을 기다려주세요.",
      })

      setDialogOpen(false)
      setFormData({
        type: "annual",
        startDate: "",
        endDate: "",
        reason: "",
      })

      await loadUserData()
    } catch (error) {
      console.error("휴가 신청 실패:", error)
      toast({
        title: "오류",
        description: "휴가 신청에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("휴가 신청을 취소하시겠습니까?")) return

    try {
      // 직원은 isAdmin = false로 호출
      const success = await supabaseVacationStorage.cancelVacationRequest(requestId, false)

      if (success) {
        toast({
          title: "휴가 신청이 취소되었습니다",
          description: "휴가 신청이 성공적으로 취소되었습니다.",
        })

        await loadUserData()
      } else {
        toast({
          title: "취소 실패",
          description: "휴가 신청 취소에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("휴가 신청 취소 실패:", error)
      toast({
        title: "오류",
        description: "휴가 신청 취소에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const canCancelRequest = (request: VacationRequest) => {
    // 이미 취소되었거나 반려된 경우 취소 불가
    if (request.status === "cancelled" || request.status === "rejected") {
      return false
    }

    // 대기중인 경우 항상 취소 가능
    if (request.status === "pending") {
      return true
    }

    // 승인된 경우, 휴가 시작일이 현재 시점보다 이후인 경우에만 취소 가능
    if (request.status === "approved") {
      const today = new Date()
      const startDate = new Date(request.start_date)
      return startDate > today
    }

    return false
  }

  const getCancelButtonText = (request: VacationRequest) => {
    if (request.status === "pending") {
      return "신청 취소"
    }
    if (request.status === "approved") {
      return "휴가 취소"
    }
    return "취소"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            대기중
          </Badge>
        )
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            승인됨
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            반려됨
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            취소됨
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "annual":
        return <Badge variant="outline">연차</Badge>
      case "morning_half":
        return <Badge variant="outline">오전반차</Badge>
      case "afternoon_half":
        return <Badge variant="outline">오후반차</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">휴가 신청</h1>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-500 text-center">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">휴가 신청</h1>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-500 text-center">로그인이 필요합니다.</p>
        </div>
      </div>
    )
  }

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      type: value,
      // 반차인 경우 종료일을 시작일과 동일하게 설정
      endDate: value === "morning_half" || value === "afternoon_half" ? prev.startDate : prev.endDate,
    }))
  }

  const handleStartDateChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      startDate: value,
      // 반차인 경우 종료일도 시작일과 동일하게 설정
      endDate:
        prev.type === "morning_half" || prev.type === "afternoon_half"
          ? value
          : // 연차인 경우, 종료일이 시작일보다 이전이면 시작일로 설정
            prev.endDate && new Date(prev.endDate) < new Date(value)
            ? value
            : prev.endDate,
    }))
  }

  const handleEndDateChange = (value: string) => {
    // 종료일이 시작일보다 이전인 경우 경고
    if (formData.startDate && new Date(value) < new Date(formData.startDate)) {
      toast({
        title: "날짜 오류",
        description: "종료일은 시작일보다 늦어야 합니다.",
        variant: "destructive",
      })
      return
    }

    setFormData((prev) => ({
      ...prev,
      endDate: value,
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <CalendarDays className="h-6 w-6 mr-2" />
          휴가 신청
        </h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          휴가 신청
        </Button>
      </div>

      {/* 연차 현황 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">부여 받은 연차</p>
                <p className="text-2xl font-bold text-blue-600">{allocatedDays}일</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">사용한 연차</p>
                <p className="text-2xl font-bold text-orange-600">{usedDays}일</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">잔여 연차</p>
                <p className="text-2xl font-bold text-green-600">{remainingDays}일</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 나의 휴가 신청 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>나의 휴가 신청 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">신청한 휴가가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[90px]">휴가 유형</TableHead>
                    <TableHead className="min-w-[140px]">기간</TableHead>
                    <TableHead className="min-w-[60px]">일수</TableHead>
                    <TableHead className="min-w-[120px]">상태</TableHead>
                    <TableHead className="min-w-[140px]">신청일</TableHead>
                    <TableHead className="min-w-[120px]">사유</TableHead>
                    <TableHead className="min-w-[120px]">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="min-w-[90px]">{getTypeBadge(request.type)}</TableCell>
                      <TableCell className="min-w-[140px]">
                        {request.start_date === request.end_date
                          ? formatDate(request.start_date)
                          : `${formatDate(request.start_date)} ~ ${formatDate(request.end_date)}`}
                      </TableCell>
                      <TableCell className="min-w-[60px]">{request.days}일</TableCell>
                      <TableCell className="min-w-[120px]">{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="min-w-[140px]">{formatDate(request.created_at)}</TableCell>
                      <TableCell className="min-w-[120px] max-w-32 truncate" title={request.reason}>
                        {request.reason}
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex space-x-2">
                          {canCancelRequest(request) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelRequest(request.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {getCancelButtonText(request)}
                            </Button>
                          )}
                          {request.status === "rejected" && request.rejection_reason && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => alert(`반려 사유: ${request.rejection_reason}`)}
                            >
                              반려 사유
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 휴가 신청 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>휴가 신청</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">휴가 유형</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">연차</SelectItem>
                  <SelectItem value="morning_half">오전반차</SelectItem>
                  <SelectItem value="afternoon_half">오후반차</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">시작일</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">
                  {formData.type === "morning_half" || formData.type === "afternoon_half"
                    ? "날짜 (자동설정)"
                    : "종료일"}
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  disabled={formData.type === "morning_half" || formData.type === "afternoon_half"}
                  className={
                    formData.type === "morning_half" || formData.type === "afternoon_half" ? "bg-gray-100" : ""
                  }
                  min={formData.startDate} // 시작일 이후만 선택 가능
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">신청 사유</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="휴가 신청 사유를 입력하세요"
                rows={3}
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p>잔여 연차: {remainingDays}일</p>
              <p className="text-gray-600 mt-1">
                반차는 0.5일로 계산되며 단일 날짜만 선택됩니다. 연차는 근무일 기준으로 계산됩니다.
              </p>
              <p className="text-gray-600 mt-1">💡 과거 날짜로도 사후 휴가 신청이 가능합니다.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit}>신청</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
