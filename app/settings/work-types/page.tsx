"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { WorkTypeCard } from "@/components/work-type-card"
import { WorkTypeFormDialog } from "@/components/work-type-form-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calendar, Clock } from "lucide-react"
import { supabaseWorkTypeStorage } from "@/lib/supabase-work-type-storage"
import type { WorkTypeType } from "@/types/work-type"
import { useToast } from "@/hooks/use-toast"

export default function WorkTypesPage() {
  const [workTypes, setWorkTypes] = useState<WorkTypeType[]>([])
  const [leaveTypes, setLeaveTypes] = useState<WorkTypeType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [editingWorkType, setEditingWorkType] = useState<WorkTypeType | null>(null)
  const [editingLeaveType, setEditingLeaveType] = useState<WorkTypeType | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadWorkTypes()
  }, [])

  const loadWorkTypes = async () => {
    try {
      setLoading(true)
      const data = await supabaseWorkTypeStorage.getWorkTypes()
      
      // 휴가 유형과 일반 근무 유형 분리 (is_leave 기준)
      const leaveTypesList = data.filter(wt => wt.is_leave === true)
      const regularTypes = data.filter(wt => wt.is_leave !== true)
      
      setLeaveTypes(leaveTypesList)
      setWorkTypes(regularTypes)
    } catch (error) {
      console.error("근무 유형 로드 실패:", error)
      toast({
        title: "로드 실패",
        description: "근무 유형을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: Omit<WorkTypeType, "id" | "created_at" | "updated_at">) => {
    try {
      if (editingWorkType) {
        await supabaseWorkTypeStorage.updateWorkType(editingWorkType.id, data)
        toast({
          title: "수정 완료",
          description: "근무 유형이 성공적으로 수정되었습니다.",
        })
      } else {
        await supabaseWorkTypeStorage.createWorkType(data)
        toast({
          title: "생성 완료",
          description: "근무 유형이 성공적으로 생성되었습니다.",
        })
      }
      await loadWorkTypes()
    } catch (error) {
      console.error("저장 실패:", error)
      toast({
        title: "저장 실패",
        description: "근무 유형 저장에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (workType: WorkTypeType) => {
    setEditingWorkType(workType)
    setDialogOpen(true)
  }

  const handleDelete = async (workType: WorkTypeType) => {
    if (!confirm(`"${workType.name}" 근무 유형을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await supabaseWorkTypeStorage.deleteWorkType(workType.id)
      toast({
        title: "삭제 완료",
        description: "근무 유형이 성공적으로 삭제되었습니다.",
      })
      await loadWorkTypes()
    } catch (error) {
      console.error("삭제 실패:", error)
      toast({
        title: "삭제 실패",
        description: "근무 유형 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleAddNew = () => {
    setEditingWorkType(null)
    setDialogOpen(true)
  }

  const handleAddLeaveType = () => {
    setEditingLeaveType(null)
    setLeaveDialogOpen(true)
  }

  const handleEditLeaveType = (workType: WorkTypeType) => {
    setEditingLeaveType(workType)
    setLeaveDialogOpen(true)
  }

  const handleDeleteLeaveType = async (workType: WorkTypeType) => {
    if (!confirm(`"${workType.name}" 휴가 유형을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await supabaseWorkTypeStorage.deleteWorkType(workType.id)
      toast({
        title: "삭제 완료",
        description: "휴가 유형이 성공적으로 삭제되었습니다.",
      })
      await loadWorkTypes()
    } catch (error) {
      console.error("삭제 실패:", error)
      toast({
        title: "삭제 실패",
        description: "휴가 유형 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleSaveLeaveType = async (data: Omit<WorkTypeType, "id" | "created_at" | "updated_at">) => {
    try {
      if (editingLeaveType) {
        await supabaseWorkTypeStorage.updateWorkType(editingLeaveType.id, data)
        toast({
          title: "수정 완료",
          description: "휴가 유형이 성공적으로 수정되었습니다.",
        })
      } else {
        await supabaseWorkTypeStorage.createWorkType(data)
        toast({
          title: "생성 완료",
          description: "휴가 유형이 성공적으로 생성되었습니다.",
        })
      }
      await loadWorkTypes()
    } catch (error) {
      console.error("저장 실패:", error)
      toast({
        title: "저장 실패",
        description: "휴가 유형 저장에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-64 mb-8"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-50 rounded"></div>
              ))}
            </div>
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
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#0a0b0c]">근무 유형 관리</h1>
            </div>
          </div>
        </div>

        <Tabs defaultValue="work-types" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#fafbfb] p-1 rounded-lg border border-[#f3f4f6]">
            <TabsTrigger 
              value="work-types" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0a0b0c] data-[state=active]:shadow-sm text-[#4a5568] transition-all duration-100"
            >
              <Clock className="h-4 w-4" />
              근무 유형
            </TabsTrigger>
            <TabsTrigger 
              value="leave-types" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0a0b0c] data-[state=active]:shadow-sm text-[#4a5568] transition-all duration-100"
            >
              <Calendar className="h-4 w-4" />
              휴가 유형
            </TabsTrigger>
          </TabsList>

          <TabsContent value="work-types" className="mt-6">
            <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-[#f3f4f6]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0a0b0c] flex items-center gap-2">
                      <Clock className="h-5 w-5 text-[#5e6ad2]" />
                      일반 근무 유형
                    </h2>
                    <p className="text-sm text-[#718096] mt-1">출근, 재택근무 등 일반적인 근무 유형을 관리합니다</p>
                  </div>
                  <Button 
                    onClick={handleAddNew}
                    className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white transition-all duration-100 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    근무 유형 추가
                  </Button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {workTypes.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Clock className="h-12 w-12 text-[#cbd5e1] mx-auto mb-3" />
                    <p className="text-[#4a5568] font-medium mb-4">등록된 근무 유형이 없습니다</p>
                    <Button 
                      onClick={handleAddNew}
                      variant="outline"
                      className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] transition-all duration-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      첫 번째 근무 유형 추가
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {workTypes.map((workType) => (
                      <WorkTypeCard key={workType.id} workType={workType} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="leave-types" className="mt-6">
            <div className="bg-white rounded-lg border border-[#f3f4f6] overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-[#f3f4f6]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0a0b0c] flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-[#5e6ad2]" />
                      휴가 유형
                    </h2>
                    <p className="text-sm text-[#718096] mt-1">연차, 반차, 조퇴 등 휴가 유형을 관리합니다</p>
                  </div>
                  <Button 
                    onClick={handleAddLeaveType}
                    className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white transition-all duration-100 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    휴가 유형 추가
                  </Button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {leaveTypes.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Calendar className="h-12 w-12 text-[#cbd5e1] mx-auto mb-3" />
                    <p className="text-[#4a5568] font-medium mb-4">등록된 휴가 유형이 없습니다</p>
                    <Button 
                      onClick={handleAddLeaveType}
                      variant="outline"
                      className="border-[#f3f4f6] text-[#4a5568] hover:bg-[#fafbfb] transition-all duration-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      첫 번째 휴가 유형 추가
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {leaveTypes.map((workType) => (
                      <WorkTypeCard 
                        key={workType.id} 
                        workType={workType} 
                        onEdit={handleEditLeaveType} 
                        onDelete={handleDeleteLeaveType} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 다이얼로그들 */}
        <WorkTypeFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          workType={editingWorkType}
          onSave={handleSave}
        />

        <WorkTypeFormDialog
          open={leaveDialogOpen}
          onOpenChange={setLeaveDialogOpen}
          workType={editingLeaveType}
          onSave={handleSaveLeaveType}
          isLeaveType={true}
        />
      </div>
    </div>
  )
}
