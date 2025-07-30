"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { WorkTypeCard } from "@/components/work-type-card"
import { WorkTypeFormDialog } from "@/components/work-type-form-dialog"
import { Plus } from "lucide-react"
import { supabaseWorkTypeStorage } from "@/lib/supabase-work-type-storage"
import type { WorkTypeType } from "@/types/work-type"
import { useToast } from "@/hooks/use-toast"

export default function WorkTypesPage() {
  const [workTypes, setWorkTypes] = useState<WorkTypeType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWorkType, setEditingWorkType] = useState<WorkTypeType | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadWorkTypes()
  }, [])

  const loadWorkTypes = async () => {
    try {
      setLoading(true)
      const data = await supabaseWorkTypeStorage.getWorkTypes()
      setWorkTypes(data)
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">근무 유형 관리</h1>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">근무 유형 관리</h1>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          근무 유형 추가
        </Button>
      </div>

      {workTypes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">등록된 근무 유형이 없습니다.</p>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />첫 번째 근무 유형 추가
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workTypes.map((workType) => (
            <WorkTypeCard key={workType.id} workType={workType} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <WorkTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workType={editingWorkType}
        onSave={handleSave}
      />
    </div>
  )
}
