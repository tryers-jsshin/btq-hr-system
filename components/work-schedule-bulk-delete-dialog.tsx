"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Trash2, AlertTriangle } from "lucide-react"
import { supabaseMemberStorage } from "@/lib/supabase-member-storage"
import { supabaseWorkTypeStorage } from "@/lib/supabase-work-type-storage"
import type { Database } from "@/types/database"
import { useToast } from "@/hooks/use-toast"

interface WorkScheduleBulkDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (data: {
    memberIds: string[]
    startDate: string
    endDate: string
  }) => void
}

const DAYS = [
  { key: "monday", label: "월" },
  { key: "tuesday", label: "화" },
  { key: "wednesday", label: "수" },
  { key: "thursday", label: "목" },
  { key: "friday", label: "금" },
  { key: "saturday", label: "토" },
  { key: "sunday", label: "일" },
] as const

export function WorkScheduleBulkDeleteDialog({ open, onOpenChange, onDelete }: WorkScheduleBulkDeleteDialogProps) {
  const [members, setMembers] = useState<Database["public"]["Tables"]["members"]["Row"][]>([])
  const [workTypes, setWorkTypes] = useState<Database["public"]["Tables"]["work_types"]["Row"][]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoading(true)
      const [memberList, workTypeList] = await Promise.all([
        supabaseMemberStorage.getMembers(),
        supabaseWorkTypeStorage.getWorkTypes(),
      ])

      setMembers(memberList)
      setWorkTypes(workTypeList)

      // 초기화
      setSelectedMemberIds([])
      setStartDate("")
      setEndDate("")
      setErrors({})
    } catch (error) {
      console.error("데이터 로드 실패:", error)
      toast({
        title: "데이터 로드 실패",
        description: "구성원 및 근무 유형 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMemberToggle = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    )
  }

  const handleSelectAll = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([])
    } else {
      setSelectedMemberIds(members.map((m) => m.id))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (selectedMemberIds.length === 0) {
      newErrors.members = "최소 1명의 구성원을 선택해주세요"
    }

    if (!startDate) {
      newErrors.startDate = "시작일을 선택해주세요"
    }

    if (!endDate) {
      newErrors.endDate = "종료일을 선택해주세요"
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = "종료일은 시작일보다 늦어야 합니다"
    }

    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays > 365) {
        newErrors.endDate = "삭제 기간은 최대 1년까지 가능합니다"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getWorkTypeInfo = (workTypeId: string) => {
    const workType = workTypes.find((wt) => wt.id === workTypeId)
    if (!workType) {
      return { name: "알 수 없음", bgcolor: "#6b7280", fontcolor: "#ffffff" }
    }

    return {
      name: workType.name,
      bgcolor: workType.bgcolor,
      fontcolor: workType.fontcolor,
    }
  }

  const calculateTotalDays = () => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    // 삭제 확인
    const confirmMessage = `정말로 삭제하시겠습니까?\n\n선택된 구성원: ${selectedMemberIds.length}명\n삭제 기간: ${calculateTotalDays()}일\n\n이 작업은 되돌릴 수 없습니다.`

    if (!confirm(confirmMessage)) return

    onDelete({
      memberIds: selectedMemberIds,
      startDate,
      endDate,
    })

    onOpenChange(false)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Trash2 className="h-5 w-5 mr-2 text-red-600" />
              근무표 일괄 삭제
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Trash2 className="h-5 w-5 mr-2 text-red-600" />
            근무표 일괄 삭제
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 삭제 경고 */}
          <div className="flex items-start space-x-2 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium mb-1">⚠️ 주의사항</p>
              <ul className="space-y-1 text-xs">
                <li>• 선택한 기간의 모든 근무 데이터가 영구적으로 삭제됩니다</li>
                <li>• 삭제된 데이터는 복구할 수 없습니다</li>
                <li>• 승인된 휴가 데이터는 삭제되지 않습니다</li>
                <li>• 삭제 후 필요시 근무표를 다시 생성해야 합니다</li>
              </ul>
            </div>
          </div>

          {/* 기간 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                삭제 기간
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={errors.startDate ? "border-red-500" : ""}
                  />
                  {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">종료일</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={errors.endDate ? "border-red-500" : ""}
                  />
                  {errors.endDate && <p className="text-sm text-red-500">{errors.endDate}</p>}
                </div>
              </div>

              {startDate && endDate && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700">
                    🗑️ 총 <strong>{calculateTotalDays()}일</strong> 동안의 근무표가 삭제됩니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 구성원 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  구성원 선택 ({selectedMemberIds.length}/{members.length})
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedMemberIds.length === members.length ? "전체 해제" : "전체 선택"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {errors.members && <p className="text-sm text-red-500 mb-4">{errors.members}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={selectedMemberIds.includes(member.id)}
                      onCheckedChange={() => handleMemberToggle(member.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Label htmlFor={`member-${member.id}`} className="font-medium cursor-pointer">
                          {member.name}
                        </Label>
                        <Badge variant="secondary" className="text-xs">
                          {member.team_name}
                        </Badge>
                      </div>

                      {/* 주간 스케줄 미리보기 */}
                      <div className="grid grid-cols-7 gap-1 text-xs">
                        {DAYS.map((day) => {
                          const workTypeInfo = getWorkTypeInfo(
                            member.weekly_schedule[day.key as keyof typeof member.weekly_schedule],
                          )
                          return (
                            <div key={day.key} className="text-center">
                              <div className="text-gray-500 mb-1">{day.label}</div>
                              <Badge
                                className="text-xs px-1 py-0"
                                style={{ backgroundColor: workTypeInfo.bgcolor, color: workTypeInfo.fontcolor }}
                              >
                                {workTypeInfo.name}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={selectedMemberIds.length === 0 || !startDate || !endDate}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              근무표 삭제
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
