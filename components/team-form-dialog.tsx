"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabaseTeamStorage } from "@/lib/supabase-team-storage"
import type { Database } from "@/types/database"

type Team = Database["public"]["Tables"]["teams"]["Row"]

interface TeamFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: Team | null
  onSave: (data: { name: string }) => void
}

export function TeamFormDialog({ open, onOpenChange, team, onSave }: TeamFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
      })
    } else {
      setFormData({
        name: "",
      })
    }
    setErrors({})
  }, [team, open])

  const validateForm = async () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = "팀 이름을 입력해주세요"
    } else {
      const exists = await supabaseTeamStorage.isTeamNameExists(formData.name.trim(), team?.id)
      if (exists) {
        newErrors.name = "이미 존재하는 팀 이름입니다"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const isValid = await validateForm()
      if (!isValid) return

      onSave({ name: formData.name.trim() })
      onOpenChange(false)
    } catch (error) {
      console.error("Error validating form:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#0a0b0c]">
            {team ? "팀 수정" : "새 팀 추가"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-[#4a5568]">
              팀 이름 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="예: 개발팀, 마케팅팀"
              className={`h-10 bg-white ${
                errors.name 
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                  : "border-[#e5e7eb] focus:border-[#5e6ad2] focus:ring-[#5e6ad2]"
              } placeholder:text-[#9ca3af]`}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span>⚠</span> {errors.name}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
              className="border-[#e5e7eb] text-[#4a5568] hover:bg-[#fafbfb] hover:text-[#0a0b0c]"
            >
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#5e6ad2] hover:bg-[#4e5ac2] text-white"
            >
              {loading ? "저장 중..." : team ? "수정" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
