import { supabase } from "./supabase"
import type { Database } from "@/types/database"
import type {
  WorkScheduleEntry,
  WeeklyScheduleView,
  TeamSchedule,
  MemberSchedule,
  DailySchedule,
} from "@/types/work-schedule"

type WorkScheduleEntryDB = Database["public"]["Tables"]["work_schedule_entries"]["Row"]
type WorkScheduleEntryInsert = Database["public"]["Tables"]["work_schedule_entries"]["Insert"]

export const supabaseWorkScheduleStorage = {
  async getScheduleEntries(): Promise<WorkScheduleEntry[]> {
    const { data, error } = await supabase.from("work_schedule_entries").select("*").order("date", { ascending: true })

    if (error) {
      console.error("Error fetching schedule entries:", error)
      return []
    }

    return (
      data?.map((entry) => ({
        id: entry.id,
        memberId: entry.member_id,
        date: entry.date,
        workTypeId: entry.work_type_id,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
      })) || []
    )
  },

  async getWeeklySchedule(weekStart: string): Promise<WeeklyScheduleView> {
    const startDate = new Date(weekStart)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)

    // 팀, 구성원, 근무 유형, 스케줄 엔트리, 휴가 신청 데이터 가져오기
    const [teamsResult, membersResult, workTypesResult, entriesResult, vacationResult] = await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("members").select("*").order("name"),
      supabase.from("work_types").select("*"),
      supabase
        .from("work_schedule_entries")
        .select("*")
        .gte("date", weekStart)
        .lte("date", endDate.toISOString().split("T")[0]),
      supabase
        .from("vacation_requests")
        .select("*")
        .eq("status", "approved")
        .lte("start_date", endDate.toISOString().split("T")[0])
        .gte("end_date", weekStart),
    ])

    const teams = teamsResult.data || []
    const members = membersResult.data || []
    const workTypes = workTypesResult.data || []
    const entries = entriesResult.data || []
    const vacationRequests = vacationResult.data || []

    // 팀별로 그룹화
    const teamSchedules: TeamSchedule[] = teams.map((team) => {
      const teamMembers = members.filter((member) => member.team_id === team.id)

      const memberSchedules: MemberSchedule[] = teamMembers.map((member) => {
        const dailySchedules: DailySchedule[] = []

        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(startDate)
          currentDate.setDate(startDate.getDate() + i)
          const dateStr = currentDate.toISOString().split("T")[0]

          // 입사일 확인
          const joinDate = new Date(member.join_date)
          const isBeforeJoinDate = currentDate < joinDate

          if (isBeforeJoinDate) {
            dailySchedules.push({
              date: dateStr,
              workTypeId: "none",
              workTypeName: "",
              workTypeColor: "bg-gray-100",
              isEditable: false,
            })
            continue
          }

          // 해당 날짜의 스케줄 찾기
          const scheduleEntry = entries.find((entry) => entry.member_id === member.id && entry.date === dateStr)

          // 휴가 신청 확인
          const dayVacations = vacationRequests.filter(
            (req) => req.member_id === member.id && dateStr >= req.start_date && dateStr <= req.end_date,
          )

          let workTypeId = "pending"
          let workTypeName = "미정"
          let workTypeColor = "bg-gray-200 text-gray-600"
          let startTime: string | undefined
          let endTime: string | undefined

          // 승인된 휴가가 있는 경우 우선 처리
          if (dayVacations.length > 0) {
            // 오전반차와 오후반차가 모두 있는지 확인
            const hasMorningHalf = dayVacations.some((v) => v.type === "morning_half")
            const hasAfternoonHalf = dayVacations.some((v) => v.type === "afternoon_half")
            const hasAnnual = dayVacations.some((v) => v.type === "annual")

            if (hasAnnual || (hasMorningHalf && hasAfternoonHalf)) {
              workTypeId = "vacation"
              workTypeName = "연차"
              workTypeColor = "#000000 #ffffff" // 검은색 배경, 흰색 텍스트
            } else if (hasMorningHalf) {
              workTypeId = "vacation_morning"
              workTypeName = "오전반차"
              workTypeColor = "#000000 #ffffff" // 검은색 배경, 흰색 텍스트
            } else if (hasAfternoonHalf) {
              workTypeId = "vacation_afternoon"
              workTypeName = "오후반차"
              workTypeColor = "#000000 #ffffff" // 검은색 배경, 흰색 텍스트
            }
          } else if (scheduleEntry) {
            workTypeId = scheduleEntry.work_type_id

            if (workTypeId === "off") {
              workTypeName = "오프"
              workTypeColor = "bg-gray-200 text-gray-600"
            } else if (workTypeId === "leave") {
              workTypeName = "연차"
              workTypeColor = "#000000 #ffffff" // 검은색 배경, 흰색 텍스트
            } else {
              const workType = workTypes.find((wt) => wt.id === workTypeId)
              if (workType) {
                workTypeName = workType.name
                startTime = workType.start_time
                endTime = workType.end_time
                // 동적 색상 적용
                workTypeColor = `${workType.bgcolor} ${workType.fontcolor}`
              }
            }
          }

          dailySchedules.push({
            date: dateStr,
            workTypeId,
            workTypeName,
            workTypeColor,
            startTime,
            endTime,
            isEditable: workTypeId !== "leave" && dayVacations.length === 0,
          })
        }

        return {
          memberId: member.id,
          memberName: member.name,
          joinDate: member.join_date,
          schedule: dailySchedules,
        }
      })

      return {
        teamId: team.id,
        teamName: team.name,
        members: memberSchedules,
      }
    })

    return {
      weekStart,
      weekEnd: endDate.toISOString().split("T")[0],
      teams: teamSchedules,
    }
  },

  async updateScheduleEntry(memberId: string, date: string, workTypeId: string): Promise<void> {
    const { error } = await supabase.from("work_schedule_entries").upsert({
      member_id: memberId,
      date,
      work_type_id: workTypeId,
    })

    if (error) {
      console.error("Error updating schedule entry:", error)
    }
  },

  async batchUpdateSchedule(updates: Array<{ memberId: string; date: string; workTypeId: string }>): Promise<void> {
    try {
      console.log("Starting batch update with", updates.length, "entries")
      console.log("Sample updates:", updates.slice(0, 3))

      if (updates.length === 0) {
        console.log("No updates to process")
        return
      }

      const entries = updates.map((update) => ({
        member_id: update.memberId,
        date: update.date,
        work_type_id: update.workTypeId,
      }))

      console.log("Mapped entries:", entries.slice(0, 3))

      // 배치 크기를 줄여서 처리
      const batchSize = 50
      let totalUpdated = 0

      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize)
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}, entries: ${batch.length}`)

        const { data, error } = await supabase
          .from("work_schedule_entries")
          .upsert(batch, {
            onConflict: "member_id,date",
            ignoreDuplicates: false,
          })
          .select()

        if (error) {
          console.error("Error in batch upsert:", error)
          console.error("Error code:", error.code)
          console.error("Error message:", error.message)
          console.error("Error details:", error.details)
          console.error("Error hint:", error.hint)
          console.error("Failed batch:", batch)
          throw new Error(`Database error: ${error.message || "Unknown error"}`)
        }

        totalUpdated += data?.length || batch.length
        console.log(`Batch ${Math.floor(i / batchSize) + 1} completed, updated: ${data?.length || batch.length}`)
      }

      console.log(`Successfully updated ${totalUpdated} schedule entries`)
    } catch (error) {
      console.error("Error batch updating schedule:", error)
      console.error("Error type:", typeof error)
      console.error("Error name:", error?.name)
      console.error("Error message:", error?.message)
      console.error("Error stack:", error?.stack)
      throw error // 에러를 다시 던져서 상위에서 처리할 수 있도록 함
    }
  },

  getCurrentWeekStart(): string {
    const today = new Date()
    const currentWeekStart = new Date(today)
    currentWeekStart.setDate(today.getDate() - today.getDay() + 1)
    return currentWeekStart.toISOString().split("T")[0]
  },

  getWeekStart(date: string): string {
    const targetDate = new Date(date)
    const weekStart = new Date(targetDate)
    weekStart.setDate(targetDate.getDate() - targetDate.getDay() + 1)
    return weekStart.toISOString().split("T")[0]
  },

  addWeeks(weekStart: string, weeks: number): string {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + weeks * 7)
    return date.toISOString().split("T")[0]
  },

  async bulkCreateSchedule(memberIds: string[], startDate: string, endDate: string): Promise<number> {
    try {
      const { data: members } = await supabase.from("members").select("*").in("id", memberIds)

      if (!members || members.length === 0) {
        console.error("No members found for the given IDs")
        return 0
      }

      const entries: WorkScheduleEntryInsert[] = []
      const start = new Date(startDate)
      const end = new Date(endDate)

      console.log("Creating schedule for date range:", startDate, "to", endDate)
      console.log("Members found:", members.length)

      for (const member of members) {
        const joinDate = new Date(member.join_date)
        console.log(`Processing member: ${member.name}, join date: ${member.join_date}`)

        for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
          const dateStr = currentDate.toISOString().split("T")[0]

          // 입사일 이전은 건너뛰기
          if (currentDate < joinDate) {
            console.log(`Skipping ${dateStr} for ${member.name} (before join date)`)
            continue
          }

          // 요일 계산 (0: 일요일, 1: 월요일, ..., 6: 토요일)
          const dayOfWeek = currentDate.getDay()
          const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
          const dayKey = dayKeys[dayOfWeek]

          // 해당 요일의 근무 유형 가져오기
          const workTypeId = member.weekly_schedule[dayKey]

          if (!workTypeId) {
            console.warn(`No work type found for ${member.name} on ${dayKey}`)
            continue
          }

          entries.push({
            member_id: member.id,
            date: dateStr,
            work_type_id: workTypeId,
          })
        }
      }

      console.log(`Total entries to create: ${entries.length}`)

      if (entries.length === 0) {
        console.log("No entries to create")
        return 0
      }

      // 배치 크기를 줄여서 처리 (한 번에 너무 많은 데이터를 처리하지 않도록)
      const batchSize = 100
      let totalCreated = 0

      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize)
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}, entries: ${batch.length}`)

        const { data, error } = await supabase
          .from("work_schedule_entries")
          .upsert(batch, {
            onConflict: "member_id,date",
            ignoreDuplicates: false,
          })
          .select()

        if (error) {
          console.error("Error in batch upsert:", error)
          console.error("Error details:", JSON.stringify(error, null, 2))
          console.error("Failed batch sample:", batch.slice(0, 3))
          throw error
        }

        totalCreated += data?.length || batch.length
        console.log(`Batch completed, created: ${data?.length || batch.length}`)
      }

      console.log(`Successfully created ${totalCreated} schedule entries`)
      return totalCreated
    } catch (error) {
      console.error("Error bulk creating schedule:", error)
      console.error("Error type:", typeof error)
      console.error("Error message:", error?.message)
      console.error("Error details:", JSON.stringify(error, null, 2))
      return 0
    }
  },

  async bulkDeleteSchedule(memberIds: string[], startDate: string, endDate: string): Promise<number> {
    try {
      console.log("Starting bulk delete for date range:", startDate, "to", endDate)
      console.log("Member IDs:", memberIds)

      if (memberIds.length === 0) {
        console.log("No members selected for deletion")
        return 0
      }

      // 삭제할 엔트리 조회 (삭제 전 개수 확인용)
      const { data: existingEntries, error: selectError } = await supabase
        .from("work_schedule_entries")
        .select("id")
        .in("member_id", memberIds)
        .gte("date", startDate)
        .lte("date", endDate)

      if (selectError) {
        console.error("Error selecting entries for deletion:", selectError)
        throw selectError
      }

      const totalToDelete = existingEntries?.length || 0
      console.log(`Found ${totalToDelete} entries to delete`)

      if (totalToDelete === 0) {
        console.log("No entries found to delete")
        return 0
      }

      // 실제 삭제 수행
      const { error: deleteError } = await supabase
        .from("work_schedule_entries")
        .delete()
        .in("member_id", memberIds)
        .gte("date", startDate)
        .lte("date", endDate)

      if (deleteError) {
        console.error("Error deleting schedule entries:", deleteError)
        console.error("Error details:", JSON.stringify(deleteError, null, 2))
        throw deleteError
      }

      console.log(`Successfully deleted ${totalToDelete} schedule entries`)
      return totalToDelete
    } catch (error) {
      console.error("Error bulk deleting schedule:", error)
      console.error("Error type:", typeof error)
      console.error("Error message:", error?.message)
      console.error("Error details:", JSON.stringify(error, null, 2))
      throw error
    }
  },
}
