import { supabase } from "./supabase"
import type { WorkTypeType } from "@/types/work-type"

export const supabaseWorkTypeStorage = {
  async getWorkTypes(): Promise<WorkTypeType[]> {
    const { data, error } = await supabase.from("work_types").select("*").order("created_at", { ascending: true })

    if (error) {
      console.error("근무 유형 조회 실패:", error)
      throw error
    }

    return data || []
  },

  async createWorkType(workType: Omit<WorkTypeType, "id" | "created_at" | "updated_at">): Promise<WorkTypeType> {
    const { data, error } = await supabase
      .from("work_types")
      .insert([
        {
          name: workType.name,
          start_time: workType.start_time,
          end_time: workType.end_time,
          bgcolor: workType.bgcolor,
          fontcolor: workType.fontcolor,
          is_leave: workType.is_leave || false,
          deduction_days: workType.deduction_days !== undefined ? workType.deduction_days : null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("근무 유형 생성 실패:", error)
      throw error
    }

    return data
  },

  async updateWorkType(
    id: string,
    workType: Partial<Omit<WorkTypeType, "id" | "created_at" | "updated_at">>,
  ): Promise<WorkTypeType> {
    const { data, error } = await supabase
      .from("work_types")
      .update({
        name: workType.name,
        start_time: workType.start_time,
        end_time: workType.end_time,
        bgcolor: workType.bgcolor,
        fontcolor: workType.fontcolor,
        is_leave: workType.is_leave,
        deduction_days: workType.deduction_days !== undefined ? workType.deduction_days : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("근무 유형 수정 실패:", error)
      throw error
    }

    return data
  },

  async deleteWorkType(id: string): Promise<void> {
    const { error } = await supabase.from("work_types").delete().eq("id", id)

    if (error) {
      console.error("근무 유형 삭제 실패:", error)
      throw error
    }
  },
}
